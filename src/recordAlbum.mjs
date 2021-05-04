import { readFile } from 'fs/promises'

import exists from 'pixutil/exists'

import { recordTrack } from './recordTrack.mjs'
import defaultReport from './report.mjs'

export async function recordAlbum ({ report = defaultReport, path }) {
  const md = JSON.parse(await readFile(`${path}/metadata.json`, 'utf8'))

  report('spotrip.album.record.start', md)

  for (const track of md.tracks) {
    const file = `${path}/${track.file}`
    if (!(await exists(file))) {
      await recordTrack({ report, file, uri: track.trackUri })
    }
  }

  report('spotrip.album.record.done')
}
