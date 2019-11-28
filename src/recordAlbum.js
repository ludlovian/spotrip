import { join } from 'path'

import options from './options'
import recordTrack from './recordTrack'
import { readJson, exists } from './util'
import report from './report'

export default async function recordAlbum (path, opts = {}) {
  options.set(opts)

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
