import checkoutAlbum from './checkoutAlbum'
import recordAlbum from './recordAlbum'
import tagAlbum from './tagAlbum'
import publishAlbum from './publishAlbum'

export default async function ripAlbum (path) {
  const workPath = await checkoutAlbum(path)
  await recordAlbum(workPath)
  await tagAlbum(workPath)
  await publishAlbum(workPath)
}
