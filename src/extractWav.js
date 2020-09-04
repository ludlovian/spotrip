import { join, basename } from 'path'
import slugify from 'slugify'

import { readdir, exec, exists, readFile, writeFile } from './util'
import report from './report'

export default async function extractWav (path) {
  const tracks = await getTracks(path)

  const md = {}
  const tags = await readCddbFile(join(path, 'cddb'))

  let trackNumber = 1
  for (const track of tracks) {
    if (trackNumber === 1) {
      md.albumArtist = 'Unknown'
      md.album = tags.DTITLE || 'Unknown'
      md.genre = tags.DGENRE || 'Classical'
      md.year = tags.DYEAR
      md.path = slugify(md.albumArtist) + '/' + slugify(md.album)
      md.tracks = []
    }

    const wavFile = join(path, track)
    const flacFile = wavFile.replace(/\.wav$/, '.flac')
    await convertToFlac(wavFile, flacFile)

    md.tracks.push({
      title: tags[`TTITLE${trackNumber - 1}`] || 'Unknown',
      trackNumber: trackNumber++,
      trackTotal: tracks.length,
      file: basename(flacFile)
    })
    report('extract.wav.track', track)
  }

  await writeFile(join(path, 'metadata.json'), JSON.stringify(md, null, 2))

  report('extract.wav.album')
}

async function getTracks (path) {
  const files = await readdir(path)
  return files.filter(name => name.endsWith('.wav')).sort()
}

async function convertToFlac (wavFile, flacFile) {
  report('extract.wav.track.convert', basename(wavFile))
  await exec('flac', ['--silent', '--output-name=' + flacFile, wavFile])
}

async function readCddbFile (cddbFile) {
  if (!(await exists(cddbFile))) {
    return {}
  }
  const file = await readFile(cddbFile, 'utf8')
  const rgx = /(.+?)=(.*)/
  const lines = file
    .split(/\n+/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
  const tags = {}
  for (const line of lines) {
    const match = rgx.exec(line)
    if (match) tags[match[1]] = match[2]
  }
  return tags
}
