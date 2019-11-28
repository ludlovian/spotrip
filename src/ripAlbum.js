import checkoutAlbum from './checkoutAlbum'
import recordAlbum from './recordAlbum'
import tagAlbum from './tagAlbum'
import publishAlbum from './publishAlbum'
import options from './options'

export default async function ripAlbum (path, opts = {}) {
  options.set(opts)

  const workPath = await checkoutAlbum(path)
  await recordAlbum(workPath)
  await tagAlbum(workPath)
  await publishAlbum(workPath)
}
