import { createWriteStream } from 'fs'
import progressStream from 'progress-stream'

import Speedo from 'speedo'
import { getStream, getData } from './spotweb'
import { exec, pipeline } from './util'

const ONE_SECOND = 2 * 2 * 44100

export async function captureTrackPCM (uri, dest, { onProgress } = {}) {
  onProgress && onProgress({})

  const md = await getData(`/track/${uri}`)
  const speedo = new Speedo(60)
  // overestimate the total
  speedo.total = 1 + md.duration / 1e3

  const dataStream = await getStream(`/play/${uri}`)

  const progress = progressStream({
    progressInterval: 1000,
    onProgress ({ bytes, done }) {
      const curr = bytes / ONE_SECOND
      speedo.update(curr)
      if (done) speedo.total = curr
      onProgress &&
        onProgress({
          done,
          curr,
          taken: speedo.taken(),
          percent: speedo.percent(),
          total: speedo.total,
          eta: speedo.eta(),
          speed: speedo.rate()
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

  const args = ['--no-utf8-convert']
  for (const tag of tags) {
    args.push(`--remove-tag=${tag.split('=')[0]}`)
    args.push(`--set-tag=${tag}`)
  }
  args.push(file)

  await exec('metaflac', args)
}

export async function addReplayGain (files) {
  await exec('metaflac', ['--add-replay-gain', ...files])
  for (const file of files) {
    await convertReplayGain(file)
  }
}

const RG_PFX = 'REPLAYGAIN_'
const RG_TAGS = 'TRACK_GAIN,TRACK_PEAK,ALBUM_GAIN,ALBUM_PEAK'.split(',')

async function convertReplayGain (file) {
  const rg = await extractReplayGainTags(file)
  rg.TRACK_GAIN = rg.ALBUM_GAIN
  rg.TRACK_PEAK = rg.ALBUM_PEAK
  await writeReplayGainTags(file, rg)
}

async function extractReplayGainTags (file) {
  const args = ['--no-utf8-convert']
  for (const tag of RG_TAGS) {
    args.push(`--show-tag=${RG_PFX}${tag}`)
  }
  args.push(file)

  const { stdout } = await exec('metaflac', args)

  const rg = {}
  for (const line of stdout.split('\n').filter(Boolean)) {
    const [key, val] = line.split('=')
    rg[key.substring(RG_PFX.length)] = val
  }

  return rg
}

async function writeReplayGainTags (file, rgData) {
  const args = ['--no-utf8-convert']

  for (const [key, val] of Object.entries(rgData)) {
    args.push(`--remove-tag=${RG_PFX}${key}`)
    args.push(`--set-tag=${RG_PFX}${key}=${val}`)
  }
  args.push(file)
  await exec('metaflac', args)
}

function getTags (obj) {
  const EXCEPT_TAGS = new Set(['PATH', 'TRACKS', 'FILE'])

  return Object.entries(obj)
    .map(([k, v]) => [k.toUpperCase(), v])
    .filter(([k, v]) => !EXCEPT_TAGS.has(k))
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(', ') : v}`)
}
