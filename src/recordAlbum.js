'use strict'

import { join } from 'path'
import kleur from 'kleur'

import options from './options'
import recordTrack from './recordTrack'
import { readJson, exists } from './util'
import log from './log'

const { cyan } = kleur

export default async function recordAlbum (path, opts = {}) {
  options.set(opts)

  const md = await readJson(join(path, 'metadata.json'))

  log(`Recording ${cyan(md.album)}`)
  log(`by ${cyan(md.albumArtist)}`)
  log(`from ${md.albumUri}`)
  log('')

  for (const track of md.tracks) {
    const flacFile = join(path, track.file)

    if (!(await exists(flacFile))) {
      await recordTrack(track.trackUri, flacFile)
    }
  }

  log('')
}
