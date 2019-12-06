import { join, basename } from 'path'
import slugify from 'slugify'

import { readdir, exec, writeFile } from './util'
import report from './report'

export default async function extractMp3 (path) {
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

    report.emit('extract.mp3.track.done', track)
  }
  await writeFile(join(path, 'metadata.json'), JSON.stringify(md, null, 2))

  report.emit('extract.mp3.album.done')
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

  report.emit('extract.mp3.track.start', basename(mp3File))
  await exec('lame', ['--silent', '--decode', '-t', mp3File, pcmFile])

  report.emit('extract.mp3.track.convert', basename(mp3File))
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
