import { getData } from './spotweb'
import { normalizeUri } from './util'

export async function showAlbum (uri) {
  uri = normalizeUri(uri, 'album')

  const md = await getData(`/album/${uri}`)
  console.log(JSON.stringify(md, null, 2))
}

export async function showTrack (uri) {
  uri = normalizeUri(uri, 'track')

  const md = await getData(`/track/${uri}`)
  console.log(JSON.stringify(md, null, 2))
}
