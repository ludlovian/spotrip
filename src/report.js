import kleur from 'kleur'

import log from './log'
import { time } from './util'

const { green, cyan } = kleur

const handlers = {
  beforePublish: path => log(`Storing to ${path}`),
  afterPublish: () => log('Stored'),

  flacTrackExtracted: track => log(green(track)),
  flacAlbumExtracted: () => log('\nExtracted'),

  mp3TrackExtracting: name => log.status(`${name} extracting`),
  mp3TrackConverting: name => log.status(`${name} converting`),
  mp3TrackExtracted: track => log(green(track)),
  mp3AlbumExtracted: () => log('\nExtracted'),

  beforeCheckout: dir => log.status(`Copying to ${dir}`),
  afterCheckout: dir => log(`Copied to ${dir}`),

  albumQueueing: uri => log(`Queue ${green(uri)}`),
  albumQueued: name => log(`\nQueued ${cyan(name)} for ripping`),

  taggingTrack: name => log.status(`Tagging ${name}`),
  taggingReplayGain: () => log.statue('Calculating replay gain'),
  taggedAlbum: () => log('Album tags written'),

  albumRecording: md => {
    log(`Recording ${cyan(md.album)}`)
    log(`by ${cyan(md.albumArtist)}`)
    log(`from ${md.albumUri}`)
    log('')
  },
  albumRecorded: () => log(''),

  trackRecording: ({ name }) => log.status(`${green(name)} ... `),
  trackRecordingUpdate: ({ name, curr, total, eta }) =>
    log.status(
      `${green(name)} - ${time(curr)}  of ${time(total)}  eta ${time(eta)}`
    ),
  trackRecordingDone: ({ name, total, speed }) =>
    log.status(green(`${name} - ${time(total)}  at ${speed}x`)),
  trackConverting: ({ name, total, speed }) =>
    log.status(
      green(`${name} - ${time(total)}  at ${speed}x`) + ' ... converting'
    ),
  trackRecorded: ({ name, total, speed }) =>
    log(green(`${name} - ${time(total)}  at ${speed}x`))
}

export default function report (msg, ...data) {
  handlers[msg](...data)
}

Object.keys(handlers).forEach(k => (report[k] = report.bind(null, k)))
