import { createWriteStream } from 'fs'
import progressStream from 'progress-stream'

import Speedo from './speedo'
import { getStream, getData } from './spotweb'
import { exec, pipeline } from './util'

const ONE_SECOND = 2 * 2 * 44100

export async function captureTrackPCM (uri, dest, { onProgress } = {}) {
  onProgress && onProgress({})

  const md = await getData(`/track/${uri}`)
  const speedo = new Speedo(60)
  speedo.total = md.duration / 1e3

  const dataStream = await getStream(`/play/${uri}`)

  const progress = progressStream({
    progressInterval: 1000,
    onProgress ({ bytes, done }) {
      const curr = bytes / ONE_SECOND
      speedo.update(curr)
      onProgress &&
        onProgress({
          done,
          curr,
          total: done ? curr : speedo.total,
          eta: done ? undefined : speedo.eta(),
          speed: done ? curr / speedo.taken() : undefined
        })
    }
  })

  // output file & string it all together
  const fileStream = createWriteStream(dest)
  await pipeline(dataStream, progress, fileStream)

  const { streamed, error } = await getData('/status')
  if (!streamed || error) {
    throw new Error(`Recording of ${uri} failed: ${error}`)
  }
}

export async function convertPCMtoFLAC (src, dest) {
  await exec('flac', [
    '--silent',
    '--force',
    '--force-raw-format',
    '--endian=little',
    '--channels=2',
    '--bps=16',
    '--sample-rate=44100',
    '--sign=signed',
    `--output-name=${dest}`,
    src
  ])

  await exec('rm', [src])
}

export async function tagTrack (file, albumData, trackData, cover) {
  if (cover) {
    await exec('metaflac', ['--remove', '--block-type=PICTURE', file])
    await exec('metaflac', [`--import-picture-from=${cover}`, file])
  }

  const tags = [...getTags(albumData), ...getTags(trackData)]

  await exec('metaflac', [
    '--remove-all-tags',
    ...tags.map(tag => `--set-tag=${tag}`),
    file
  ])
}

export async function addReplayGain (files) {
  await exec('metaflac', ['--add-replay-gain', ...files])
}

function getTags (obj) {
  const EXCEPT_TAGS = new Set(['PATH', 'TRACKS', 'FILE'])

  return Object.entries(obj)
    .map(([k, v]) => [k.toUpperCase(), v])
    .filter(([k, v]) => !EXCEPT_TAGS.has(k))
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(', ') : v}`)
}
