import { join, basename } from 'path'
import slugify from 'slugify'

import { readdir, exec, writeFile } from './util'
import report from './report'

export default async function extractFlac (path) {
  const tracks = await getTracks(path)

  const md = {}
  let trackNumber = 1
  for (const track of tracks) {
    const flacFile = join(path, track)

    const tags = await readTrackTags(flacFile)

    if (trackNumber === 1) {
      md.albumArtist = tags.ALBUMARTIST
      md.album = tags.ALBUM
      md.genre = tags.GENRE || 'Classical'
      md.year = tags.YEAR
      md.path = slugify(md.albumArtist) + '/' + slugify(md.album)
      md.discTotal = tags.DISCTOTAL
      md.tracks = []
    }

    md.tracks.push({
      title: tags.TITLE,
      artist: tags.ARTIST,
      trackNumber: trackNumber++,
      trackTotal: tracks.length,
      file: basename(flacFile)
    })

    report('extract.flac.track', track)
  }

  await writeFile(join(path, 'metadata.json'), JSON.stringify(md, null, 2))

  report('extract.flac.album')
}

async function getTracks (path) {
  const files = await readdir(path)
  return files.filter(name => name.endsWith('.flac')).sort()
}

const TAGS = [
  'TITLE',
  'TRACKNUMBER',
  'DISCNUMMBER',
  'TRACKTOTAL',
  'TOTALDISCS',
  'ALBUM',
  'ALBUMARTIST',
  'YEAR',
  'ARTIST',
  'GENRE'
]

async function readTrackTags (file) {
  const { stdout } = await exec('metaflac', [
    ...TAGS.map(tag => `--show-tag=${tag}`),
    file
  ])
  const lines = stdout.split('\n').filter(Boolean)
  const tags = {}
  for (const line of lines) {
    const match = /^(\w+)=(.*)$/.exec(line)
    if (!match) continue
    const key = match[1]
    const value = match[2].trim()
    if (!tags[key]) {
      tags[key] = value
    } else if (Array.isArray(tags[key])) {
      tags[key].push(value)
    } else {
      tags[key] = [tags[key], value]
    }
  }

  return tags
}
