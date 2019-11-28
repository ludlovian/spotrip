'use strict'

import { basename } from 'path'
import kleur from 'kleur'

import progressStream from 'progress-stream'
import { createWriteStream } from 'fs'

import options from './options'
import { normalizeUri, exec, pipeline, time } from './util'
import { getStream, getData } from './spotweb'
import log from './log'
import Speedo from './speedo'

const { green } = kleur

const ONE_SECOND = 2 * 2 * 44100

export default async function recordTrack (uri, flacFile, opts = {}) {
  options.set(opts)
  uri = normalizeUri(uri, 'track')
  const pcmFile = flacFile.replace(/\.flac$/, '') + '.pcm'

  let msg = basename(flacFile)

  await capturePCM(uri, pcmFile)
  await convertPCMtoFLAC(pcmFile, flacFile)
  log(green(msg))

  async function capturePCM (uri, pcmFile) {
    log.status(`${green(msg)} ... `)

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
          const dur = speedo.taken()
          const speed = (curr / dur).toFixed(1)
          msg = `${msg} - ${time(curr)}  at ${speed}x`
          log.status(green(msg))
        } else {
          speedo.update(curr)
          log.status(
            [
              `${green(msg)} - `,
              `${time(curr)}  `,
              `of ${time(speedo.total)}  `,
              `eta ${time(speedo.eta())} `
            ].join('')
          )
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
    log.status(`${green(msg)} ... converting`)
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
