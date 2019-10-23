'use strict'

import { join } from 'path'

import options from './options'
import { readJson, exists, exec } from './util'
import log from './log'

export default async function tagAlbum (path, opts = {}) {
  options.set(opts)

  const md = await readJson(join(path, 'metadata.json'))
  const coverFile = join(path, 'cover.jpg')
  const hasCover = await exists(coverFile)

  for (const track of md.tracks) {
    log.status(`Tagging ${track.file}`)

    const flacFile = join(path, track.file)

    if (hasCover) {
      await importCover(flacFile, coverFile)
    }

    const tags = [...getTags(md), ...getTags(track)]
    await addTags(flacFile, tags)
  }

  log.status('Calculating replay gain')
  await addReplayGain(md.tracks.map(track => join(path, track.file)))
}

async function importCover (file, cover) {
  await exec('metaflac', ['--remove', '--block-type=PICTURE', file])
  await exec('metaflac', [`--import-picture-from=${cover}`, file])
}

async function addTags (file, tags) {
  await exec('metaflac', [
    '--remove-all-tags',
    ...tags.map(tag => `--set-tag=${tag}`),
    file
  ])
}

const EXCEPT_TAGS = new Set(['PATH', 'TRACKS', 'FILE'])
function getTags (obj) {
  const tags = []
  for (const k of Object.keys(obj)) {
    const K = k.toUpperCase()
    if (EXCEPT_TAGS.has(K)) continue
    const v = obj[k]
    if (Array.isArray(v)) {
      tags.push(K + '-' + v.join(', '))
    } else if (v) {
      tags.push(K + '=' + v)
    }
  }
  return tags
}

async function addReplayGain (files) {
  await exec('metaflac', ['--add-replay-gain', ...files])
}
