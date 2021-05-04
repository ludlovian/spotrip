import { readFile, writeFile, rename } from 'fs/promises'

import slugify from 'slugify'
import spawn from 'pixutil/spawn'
import exec from 'pixutil/exec'

import { getAlbumMetadata } from './spotweb.mjs'
import { getAlbumArt } from './albumart.mjs'
import defaultReport from './report.mjs'
import { normalizeUri } from './util.mjs'
import { WORK_DIRECTORY } from './defaults.mjs'

export async function queueAlbum (
  uri,
  { report = defaultReport, workDir = WORK_DIRECTORY } = {}
) {
  uri = normalizeUri(uri, 'album')
  report('spotrip.queue.start', uri)

  const album = await getAlbumMetadata(uri)
  let metadata = {
    ...albumTags(album),
    tracks: album.tracks.map(track => trackTags(track, album))
  }

  const mdFile = `${workDir}/work/${uri.replace(/.*:/, '')}.json`
  const jpgFile = mdFile.replace(/json$/, 'jpg')
  await writeFile(mdFile, JSON.stringify(metadata, null, 2))

  await Promise.all([
    spawn('vi', [mdFile], { stdio: 'inherit' }).done,
    getAlbumArt(metadata.tracks[0].trackUri, jpgFile)
  ])

  // reread metadata
  metadata = JSON.parse(await readFile(mdFile, 'utf8'))
  const jobName = metadata.path.replace(/\//g, '_')

  // create work directory
  const destDir = `${workDir}/work/${jobName}`
  await exec('mkdir', ['-p', destDir])
  await rename(mdFile, `${destDir}/metadata.json`)
  await rename(jpgFile, `${destDir}/cover.jpg`)

  // queue work item
  const jobFile = `${workDir}/queue/${jobName}`
  await writeFile(jobFile, `music spotrip ${destDir}`)

  report('spotrip.queue.done', jobName)
}

function albumTags (album) {
  const tags = {
    albumArtist: album.artist.name,
    album: album.name,
    genre: 'Classical',
    year: album.year,
    path: null,
    albumUri: album.uri
  }

  tags.path = slug(album.artist.name) + '/' + slug(album.name)

  const discTotal = countDiscs(album)

  if (discTotal > 1) {
    tags.discTotal = discTotal
  }

  return tags
}

function slug (s) {
  const slugOpts = { remove: /[^\w\s_-]/ }
  return slugify(s, slugOpts)
}

function trackTags (track, album) {
  const tags = {
    title: track.name,
    artist: track.artists.map(a => a.name),
    trackNumber: track.number
  }

  const discTotal = countDiscs(album)
  const trackTotal = countTracks(album, track.disc)
  let file = 'track'

  if (discTotal > 1) {
    tags.discNumber = track.disc
    file += track.disc
  }

  const digits = trackTotal > 99 ? 3 : 2
  file += track.number.toString().padStart(digits, '0')
  file += '.flac'
  tags.trackTotal = trackTotal
  tags.trackUri = track.uri
  tags.file = file

  return tags
}

function countDiscs (album) {
  const discNumbers = album.tracks.map(t => t.disc).filter(Boolean)
  return uniq(discNumbers).length
}

function countTracks (album, discNumber) {
  return album.tracks.filter(t => t.disc === discNumber).length
}

function uniq (list) {
  return [...new Set(list)]
}
