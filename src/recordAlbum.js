import { readFile } from 'fs/promises'

import { exists } from './util'
import { recordTrack } from './recordTrack'
import defaultReport from './report'

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
