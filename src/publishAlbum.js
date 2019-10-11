'use strict'

import { join } from 'path'

import options from './options'
import { readJson, exec } from './util'
import log from './log'

export default async function publishAlbum (path, opts = {}) {
  options.set(opts)

  const md = await readJson(join(path, 'metadata.json'))
  const storePath = join(options.store, md.path)

  log(`Storing to ${md.path}`)

  await exec('mkdir', ['-p', storePath])
  await exec('rsync', [
    '--times',
    '--recursive',
    '--omit-dir-times',
    path + '/',
    storePath + '/'
  ])

  await exec('rm', ['-rf', path])

  log('Stored')
}
