import { basename, join, resolve } from 'path'

import retry from 'retry'

import {
  captureTrackPCM,
  convertPCMtoFLAC,
  tagTrack,
  addReplayGain
} from './track'
import { getSpotwebPid, startSpotweb, stopSpotweb } from './spotweb'
import { copyToStore, copyFromStore, downloadMetadata } from './album'
import { normalizeUri, readJson, exists, writeFile } from './util'
import report from './report'
import options from './options'

export async function recordTrack (uri, flacFile) {
  uri = normalizeUri(uri, 'track')
  const pcmFile = flacFile.replace(/\.flac$/, '') + '.pcm'

  await retry(() => captureTrackPCM(uri, pcmFile, { onProgress }), {
    onRetry: data => report('retry', data),
    retries: 5,
    delay: 60 * 1000
  })

  report('track.converting.start')
  await convertPCMtoFLAC(pcmFile, flacFile)
  report('track.converting.done')

  function onProgress (data) {
    if (!data.curr) {
      report('track.capturing.start', basename(flacFile))
    } else if (data.done) {
      report('track.capturing.done', data)
    } else {
      report('track.capturing.update', data)
    }
  }
}

export async function recordAlbum (path) {
  const md = await readJson(join(path, 'metadata.json'))

  report('album.recording.start', md)

  for (const track of md.tracks) {
    const flacFile = join(path, track.file)

    if (!(await exists(flacFile))) {
      await recordTrack(track.trackUri, flacFile)
    }
  }

  report('album.recording.done')
}

export async function tagAlbum (path) {
  const md = await readJson(join(path, 'metadata.json'))
  const coverFile = join(path, 'cover.jpg')
  const hasCover = await exists(coverFile)

  for (const track of md.tracks) {
    report('track.tagging', track.file)
    const flacFile = join(path, track.file)
    await tagTrack(flacFile, md, track, hasCover && coverFile)
  }

  report('album.replayGain.start')
  await addReplayGain(md.tracks.map(track => join(path, track.file)))
  report('album.replayGain.done')
}

export async function publishAlbum (path) {
  const md = await readJson(join(path, 'metadata.json'))
  const storePath = join(options.store, md.path)

  report('album.publishing.start', storePath)
  await copyToStore(path, storePath)
  report('album.publishing.done')
}

export async function checkoutAlbum (path) {
  path = resolve(path)

  if (path.startsWith(options.work)) return path

  const md = await readJson(join(path, 'metadata.json'))
  const workDir = md.path.replace('/', '_')
  const workPath = join(options.work, 'work', workDir)

  report('album.checkout.start', workDir)
  await copyFromStore(path, workPath)
  report('album.checkout.done', workDir)

  return workPath
}

export async function ripAlbum (path) {
  const workPath = await checkoutAlbum(path)
  await recordAlbum(workPath)
  await tagAlbum(workPath)
  await publishAlbum(workPath)
}

export async function queueAlbum (uri) {
  uri = normalizeUri(uri, 'album')
  report('album.queue.start', uri)

  const path = await downloadMetadata(uri)
  const workPath = await checkoutAlbum(path)
  const jobName = basename(workPath)
  const queueFile = join(options.work, 'queue', jobName)

  await writeFile(queueFile, `spotrip rip ${workPath}\n`)

  report('album.queue.done', jobName)
}

export async function daemonStatus () {
  report('daemon.status', await getSpotwebPid())
}

export async function daemonStart () {
  await startSpotweb()
  report('daemon.started')
}

export async function daemonStop () {
  await stopSpotweb()
  report('daemon.stopped')
}
