import { join } from 'path'

import recordTrack from './recordTrack'
import { readJson, exists } from './util'
import report from './report'

export default async function recordAlbum (path) {
  const md = await readJson(join(path, 'metadata.json'))

  report.albumRecording(md)

  for (const track of md.tracks) {
    const flacFile = join(path, track.file)

    if (!(await exists(flacFile))) {
      await recordTrack(track.trackUri, flacFile)
    }
  }

  report.albumRecorded()
}
