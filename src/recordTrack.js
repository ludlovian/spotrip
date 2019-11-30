import { basename } from 'path'
import { createWriteStream } from 'fs'

import progressStream from 'progress-stream'

import { normalizeUri, exec, pipeline } from './util'
import { getStream, getData } from './spotweb'
import Speedo from './speedo'
import retry from './retry'
import report from './report'

const ONE_SECOND = 2 * 2 * 44100

export default async function recordTrack (uri, flacFile) {
  uri = normalizeUri(uri, 'track')
  const pcmFile = flacFile.replace(/\.flac$/, '') + '.pcm'

  const msg = { name: basename(flacFile) }

  await retry(() => capturePCM(uri, pcmFile))
  await convertPCMtoFLAC(pcmFile, flacFile)
  report.trackRecorded(msg)

  async function capturePCM (uri, pcmFile) {
    report.trackRecording(msg)

    const md = await getData(`/track/${uri}`)
    const speedo = new Speedo(60)
    speedo.total = md.duration / 1e3

    const dataStream = await getStream(`/play/${uri}`)
    const progress = progressStream({
      progressInterval: 1000,
      onProgress ({ bytes, done }) {
        const curr = bytes / ONE_SECOND
        speedo.update(curr)
        if (done) {
          msg.total = curr
          msg.speed = (curr / speedo.taken()).toFixed(1)
          report.trackRecordingDone(msg)
        } else {
          speedo.update(curr)
          Object.assign(msg, { curr, total: speedo.total, eta: speedo.eta() })
          report.trackRecordingUpdate(msg)
        }
      }
    })

    // output file & string it all together
    const fileStream = createWriteStream(pcmFile)
    await pipeline(dataStream, progress, fileStream)

    const { streamed, error } = await getData('/status')
    if (!streamed || error) {
      throw new Error(`Recording of ${uri} failed: ${error}`)
    }
  }

  async function convertPCMtoFLAC (pcmFile, flacFile) {
    report.trackConverting(msg)
    await exec('flac', [
      '--silent',
      '--force',
      '--force-raw-format',
      '--endian=little',
      '--channels=2',
      '--bps=16',
      '--sample-rate=44100',
      '--sign=signed',
      `--output-name=${flacFile}`,
      pcmFile
    ])

    await exec('rm', [pcmFile])
  }
}
