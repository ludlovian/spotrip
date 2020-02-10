import { join } from 'path'

import slugify from 'slugify'

import { exec, spawn, writeFile, readJson, exists } from './util'
import { getData } from './spotweb'
import { downloadAlbumArt } from './albumart'
import options from './options'

export async function copyToStore (path, storePath) {
  await exec('mkdir', ['-p', storePath])
  await exec('rsync', [
    '--times',
    '--recursive',
    '--omit-dir-times',
    path + '/',
    storePath + '/'
  ])

  await exec('rm', ['-rf', path])
}

export async function copyFromStore (storePath, workPath) {
  await exec('mkdir', ['-p', workPath])
  await exec('rsync', [
    '--times',
    '--recursive',
    '--omit-dir-times',
    storePath + '/',
    workPath + '/'
  ])
}

export async function downloadMetadata (uri) {
  const album = await getData(`/album/${uri}`)

  let metadata = {
    ...albumTags(album),
    tracks: album.tracks.map(track => trackTags(track, album))
  }

  const jsonFile = join(options.work, 'work', uri.replace(/.*:/, '') + '.json')
  await writeFile(jsonFile, JSON.stringify(metadata, null, 2))
  await spawn('vi', [jsonFile], { stdio: 'inherit' }).done

  metadata = await readJson(jsonFile)
  await exec('rm', [jsonFile])

  const storePath = join(options.store, metadata.path)
  if (await exists(storePath)) {
    throw new Error(`Already exists: ${storePath}`)
  }

  await exec('mkdir', ['-p', storePath])

  await writeFile(
    join(storePath, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  )

  await downloadAlbumArt(
    metadata.tracks[0].trackUri,
    join(storePath, 'cover.jpg')
  )

  return storePath
}

function slug (s) {
  const slugOpts = { remove: /[^\w\s_-]/ }
  return slugify(s, slugOpts)
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
