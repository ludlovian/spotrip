import { createWriteStream } from 'fs'
import { unlink } from 'fs/promises'
import { pipeline } from 'stream/promises'

import createSpeedo from 'speedo/gen'
import progressStream from 'progress-stream/gen'
import retry from 'retry'
import exec from 'pixutil/exec'

import defaultReport from './report.mjs'
import { normalizeUri } from './util.mjs'
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
  await exec('flac', [...FLAC_OPTIONS, `--output-name=${file}`, pcmFile])
  await unlink(pcmFile)
  report('spotrip.track.convert.done')

  function onProgress (update) {
    const { done, bytes, speedo } = update
    if (!bytes) return report('spotrip.track.record.start', file)

    const { taken, eta, percent, total, rate } = speedo
    if (done) {
      report('spotrip.track.record.done', {
        total: total / ONE_SECOND,
        speed: rate / ONE_SECOND
      })
    } else {
      report('spotrip.track.record.update', { percent, taken, eta })
    }
  }
}

async function captureTrackPCM ({ uri, file, onProgress }) {
  // send an initial progress marker
  onProgress({})

  // get data size
  const md = await getTrackMetadata(uri)
  const speedo = createSpeedo({ total: (ONE_SECOND * (1 + md.duration)) / 1e3 })

  await pipeline(
    await getPlayStream(uri),
    speedo,
    progressStream({ onProgress, speedo }),
    createWriteStream(file)
  )

  const { streamed, error } = await getStatus()
  if (!streamed || error) {
    throw new Error(`Recording of ${uri} failed: ${error}`)
  }
}
