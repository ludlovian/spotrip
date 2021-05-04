import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import http from 'http'

import { normalizeUri } from './util.mjs'

const SONOS_PLAYER = '192.168.86.210'
const SONOS_PORT = 1400

export function albumArtUri (
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

export async function getAlbumArt (uri, destFile) {
  const res = await new Promise((resolve, reject) => {
    const req = http.get(albumArtUri(uri), resolve)
    req.once('error', reject).end()
  })

  if (res.statusCode !== 200) {
    throw new Error(`${res.statusCode} - ${res.statusMessage}`)
  }

  await pipeline(res, createWriteStream(destFile))
}
