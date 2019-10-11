'use strict'

import kleur from 'kleur'
import slugify from 'slugify'
import { join, dirname } from 'path'

import spotweb from './spotweb'
import options from './options'
import { normalizeUri, exec, spawn, writeFile } from './util'
import log from './log'

const { green, cyan } = kleur

export default async function queue (uri, opts) {
  options.set(opts)
  uri = normalizeUri(uri, 'album')

  const workDir = join(options.work, 'work', uri.replace(/.*:/, ''))
  const queueFile = join(options.work, 'queue', uri.replace(/.*:/, ''))
  const jsonFile = join(workDir, 'metadata.json')

  log(`Queuing ${green(uri)}`)

  await exec('mkdir', ['-p', workDir])
  await exec('mkdir', ['-p', dirname(queueFile)])

  const album = await spotweb(`/album/${uri}`).json()

  const metadata = {
    ...albumTags(album),
    tracks: album.tracks.map(track => trackTags(track, album))
  }

  await writeFile(jsonFile, JSON.stringify(metadata, null, 2))
  await spawn('vi', [jsonFile], { stdio: 'inherit' }).done

  await writeFile(
    queueFile,
    [
      process.execPath,
      ...process.execArgv,
      process.argv[1],
      'rip-album',
      workDir
    ].join(' ') + '\n'
  )

  log(`\nQueued ${cyan(uri)} for ripping`)
}

function slug (s) {
  const slugOpts = { remove: /[^\w\s_-]/ }
  return slugify(s, slugOpts)
}

function albumTags (album) {
  const tags = {
    albumArtist: album.artist.name,
    album: album.name,
    genre: ['Classical'],
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
