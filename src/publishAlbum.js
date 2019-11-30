import { join } from 'path'

import options from './options'
import { readJson, exec } from './util'
import report from './report'

export default async function publishAlbum (path) {
  const md = await readJson(join(path, 'metadata.json'))
  const storePath = join(options.store, md.path)

  report.beforePublish(md.path)

  await exec('mkdir', ['-p', storePath])
  await exec('rsync', [
    '--times',
    '--recursive',
    '--omit-dir-times',
    path + '/',
    storePath + '/'
  ])

  await exec('rm', ['-rf', path])

  report.afterPublish()
}
