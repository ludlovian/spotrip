'use strict'

import { join, basename } from 'path'
import slugify from 'slugify'
import kleur from 'kleur'

import options from './options'
import { readdir, exec, writeFile } from './util'
import log from './log'

const { green } = kleur

export default async function extractMp3 (path, opts = {}) {
  options.set(opts)

  const tracks = await getTracks(path)

  const md = {}
  let trackNumber = 1
  for (const track of tracks) {
    const mp3File = join(path, track)
    const flacFile = mp3File.replace(/\.mp3$/, '.flac')
    await convertToFlac(mp3File, flacFile)

    const tags = await readTrackTags(mp3File)
    if (trackNumber === 1) {
      md.albumArtist = tags.artist
      md.album = tags.album
      md.genre = tags.genre
      md.year = tags.year
      md.path = slugify(md.albumArtist) + '/' + slugify(md.album)
      md.tracks = []
    }
    md.tracks.push({
      title: tags.title,
      artist: tags.artist,
      trackNumber: trackNumber++,
      trackTotal: tracks.length,
      file: basename(flacFile)
    })

    log(green(track))
  }
  await writeFile(join(path, 'metadata.json'), JSON.stringify(md, null, 2))

  log('')
  log('Extracted')
}

async function getTracks (path) {
  const files = await readdir(path)
  return files.filter(name => name.endsWith('.mp3')).sort()
}

async function readTrackTags (file) {
  const { stdout } = await exec('id3v2', ['--list', file])
  const data = stdout.split('\n')
  return {
    artist: getTag('TPE1', data),
    album: getTag('TALB', data),
    genre: getTag('TCON', data),
    year: getTag('TYER', data),
    title: getTag('TIT2', data)
  }
}

function getTag (prefix, rows) {
  const row = rows.filter(text => text.startsWith(prefix))[0]
  if (!row) return undefined
  return row.replace(/^.*?: /, '')
}

async function convertToFlac (mp3File, flacFile) {
  const pcmFile = mp3File.replace(/\.mp3$/, '') + '.pcm'

  log.status(`${basename(mp3File)} extracting`)
  await exec('lame', ['--silent', '--decode', '-t', mp3File, pcmFile])

  log.status(`${basename(mp3File)} converting`)
  await exec('flac', [
    '--silent',
    '--force',
    '--force-raw-format',
    '--endian=little',
    '--channels=2',
    '--bps=16',
    '--sample-rate=44100',
    '--sign=signed',
    '--output-name=' + flacFile,
    pcmFile
  ])

  await exec('rm', [pcmFile])
}
