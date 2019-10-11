'use strict'

import recordAlbum from './recordAlbum'
import tagAlbum from './tagAlbum'
import publishAlbum from './publishAlbum'
import options from './options'

export default async function ripAlbum (path, opts = {}) {
  options.set(opts)

  await recordAlbum(path)
  await tagAlbum(path)
  await publishAlbum(path)
}
