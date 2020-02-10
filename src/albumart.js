import { createWriteStream } from 'fs'
import http from 'http'

import { normalizeUri, pipeline } from './util'

const SONOS_PLAYER = '192.168.86.210'
const SONOS_PORT = 1400

export function getAlbumArtUri (
  uri,
  { player = SONOS_PLAYER, port = SONOS_PORT } = {}
) {
  uri = normalizeUri(uri, 'track')
  return [
    `http://${player}:${port}`,
    '/getaa?s=1&u=',
    encodeURIComponent(
      [
        'x-sonos-spotify:',
        encodeURIComponent(uri),
        '?sid=9&flags=8224&sn=1'
      ].join('')
    )
  ].join('')
}

export async function downloadAlbumArt (uri, destFile) {
  const coverData = await new Promise((resolve, reject) =>
    http
      .get(getAlbumArtUri(uri), resolve)
      .once('error', reject)
      .end()
  ).then(res => {
    if (res.statusCode !== 200) {
      throw new Error(`${res.statusCode} - ${res.statusMessage}`)
    }
    return res
  })

  const fileStream = createWriteStream(destFile)
  await pipeline(coverData, fileStream)
}
