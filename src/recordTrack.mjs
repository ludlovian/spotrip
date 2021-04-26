import { createWriteStream } from 'fs'
import { unlink } from 'fs/promises'
import { spawn } from 'child_process'
import { pipeline } from 'stream/promises'

import Speedo from 'speedo'
import progressStream from 'progress-stream'
import retry from 'retry'

import defaultReport from './report.mjs'
import { normalizeUri, processEnded } from './util.mjs'
import { getTrackMetadata, getPlayStream, getStatus } from './spotweb.mjs'

const ONE_SECOND = 2 * 2 * 44100
const FLAC_OPTIONS = [
  '--silent',
  '--force',
  '--force-raw-format',
  '--endian=little',
  '--channels=2',
  '--bps=16',
  '--sample-rate=44100',
  '--sign=signed',
  '--stdout'
]

export async function recordTrack ({ report = defaultReport, uri, file }) {
  uri = normalizeUri(uri, 'track')
  const pcmFile = file.replace(/(\.flac)?$/, '.pcm')

  await retry(() => captureTrackPCM({ uri, file: pcmFile, onProgress }), {
    onRetry: data => report('spotrip.retry', data),
    retries: 5,
    delay: 60 * 1000
  })

  report('spotrip.track.convert.start')
  await processEnded(
    spawn('flac', [...FLAC_OPTIONS, `--output-name=${file}`, pcmFile])
  )
  await unlink(pcmFile)
  report('spotrip.track.convert.done')

  function onProgress (data) {
    if (!data.current) {
      report('spotrip.track.record.start', file)
    } else if (data.done) {
      report('spotrip.track.record.done', data)
    } else {
      report('spotrip.track.record.update', data)
    }
  }
}

async function captureTrackPCM ({ uri, file, onProgress }) {
  // send an initial progress marker
  onProgress({})

  // get track length
  const md = await getTrackMetadata(uri)
  const speedo = new Speedo({ window: 60 })
  speedo.total = 1 + md.duration / 1e3

  // get stream
  const dataStream = await getPlayStream(uri)

  // progress
  const progress = progressStream({
    progressInterval: 1000,
    onProgress ({ bytes, done }) {
      const current = bytes / ONE_SECOND
      speedo.update({ current })
      if (done) speedo.total = current
      onProgress({
        done,
        current,
        taken: speedo.taken(),
        percent: speedo.percent(),
        total: speedo.total,
        eta: speedo.eta(),
        speed: speedo.rate()
      })
    }
  })

  const fileStream = createWriteStream(file)

  await pipeline(dataStream, progress, fileStream)

  const { streamed, error } = await getStatus()
  if (!streamed || error) {
    throw new Error(`Recording of ${uri} failed: ${error}`)
  }
}
