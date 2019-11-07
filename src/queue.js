'use strict'

import kleur from 'kleur'
import slugify from 'slugify'
import { join, basename } from 'path'

import spotweb from './spotweb'
import options from './options'
import { normalizeUri, exec, spawn, writeFile, readJson, exists } from './util'
import log from './log'
import checkoutAlbum from './checkoutAlbum'

const { green, cyan } = kleur

export default async function queue (uri, opts) {
  options.set(opts)
  uri = normalizeUri(uri, 'album')

  log(`Queuing ${green(uri)}`)

  const album = await spotweb(`/album/${uri}`).json()

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

  const workPath = await checkoutAlbum(storePath)
  const jobName = basename(workPath)
  const queueFile = join(options.work, 'queue', jobName)

  await writeFile(
    queueFile,
    [
      process.execPath,
      ...process.execArgv,
      process.argv[1],
      'rip',
      workPath
    ].join(' ') + '\n'
  )

  log(`\nQueued ${cyan(jobName)} for ripping`)
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
  const discNumbers = album.tracks.map(t => t.disc).filter(d => !!d)
  return uniq(discNumbers).length
}

function countTracks (album, discNumber) {
  return album.tracks.filter(t => t.disc === discNumber).length
}

function uniq (list) {
  const s = new Set(list)
  return [...s]
}

/*
 * TAGS
 *
 * ALBUMARTIST
 * ALBUM
 * GENRE
 * YEAR
 * ALBUMURI
 * DISCTOTAL (if multi disc)
 *
 * TITLE
 * ARTIST
 * TRACKNUMBER
 * DISCNUMBER (if multi disc)
 * TRACKTOTAL (of current disc)
 * TRACKURI
 */
