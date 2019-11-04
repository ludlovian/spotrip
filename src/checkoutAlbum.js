'use strict'

import { join, normalize } from 'path'

import options from './options'
import { readJson, exec } from './util'
import log from './log'

export default async function checkoutAlbum (path, opts = {}) {
  options.set(opts)

  path = normalize(path)

  if (path.startsWith(options.work)) {
    return path
  }

  const md = await readJson(join(path, 'metadata.json'))
  const workDir = md.path.replace('/', '_')
  const workPath = join(options.work, 'work', workDir)

  log.status(`Copying to ${workDir}`)

  await exec('mkdir', ['-p', workPath])
  await exec('rsync', [
    '--times',
    '--recursive',
    '--omit-dir-times',
    path + '/',
    workPath + '/'
  ])

  log(`Copied to ${workDir}`)
  return workPath
}
