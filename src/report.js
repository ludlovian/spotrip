import kleur from 'kleur'
import ms from 'ms'

import EventEmitter from 'events'

import log from './log'

const { green, cyan } = kleur

const reporter = new EventEmitter()
export default function report (msg, payload) {
  reporter.emit(msg, payload)
}

reporter
  .on('track.capturing.start', name => {
    log.prefix = `${green(name)} `
    log.status('... ')
  })
  .on('track.capturing.update', ({ curr, total, eta }) =>
    log.status(
      [
        `- ${fmtDuration(curr)}`,
        `of ${fmtDuration(total)}`,
        `eta ${fmtDuration(eta)}`
      ].join('  ')
    )
  )
  .on('track.capturing.done', ({ name, total, speed }) => {
    log.prefix += green(`- ${fmtDuration(total)}  at ${speed.toFixed(1)}x`)
    log.status(' ')
  })
  .on('track.converting.start', () => log.status(' ... converting'))
  .on('track.converting.done', () => {
    log('')
    log.prefix = ''
  })
  .on('track.tagging', name => log.status(`Tagging ${name}`))
  .on('album.recording.start', md => {
    log(`Recording ${cyan(md.album)}`)
    log(`by ${cyan(md.albumArtist)}`)
    log(`from ${md.albumUri}`)
    log('')
  })
  .on('album.recording.done', () => log(''))
  .on('album.replayGain.start', () => log.status('Calculating replay gain'))
  .on('album.replayGain.done', () => log('Album tags written'))
  .on('album.publishing.start', path => log(`Storing to ${path}`))
  .on('album.publishing.done', () => log('Stored'))
  .on('album.checkout.start', dir => log.status(`Copying to ${dir}`))
  .on('album.checkout.done', dir => log(`Copied to ${dir}`))
  .on('album.queue.start', uri => log(`Queue ${green(uri)}`))
  .on('album.queue.done', name => log(`\nQueued ${cyan(name)} for ripping`))
  .on('daemon.status', pid =>
    log(pid ? `spotweb running as pid ${pid}` : 'spotweb not running')
  )
  .on('daemon.stopped', () => log('spotweb stopped'))
  .on('daemon.started', () => log('spotweb started'))
  .on('retry', ({ delay, err }) => {
    console.error(
      `\nError occured: ${err.message}\nWaiting ${ms(delay)} to retry...`
    )
  })
  .on('extract.mp3.track.start', name => log.status(`${name} extracting`))
  .on('extract.mp3.track.convert', name => log.status(`${name} converting`))
  .on('extract.mp3.track.done', track => log(green(track)))
  .on('extract.mp3.album.done', () => log('\nExtracted'))
  .on('extract.flac.track', track => log(green(track)))
  .on('extract.flac.album', () => log('\nExtracted'))

function fmtDuration (ms) {
  const secs = Math.round(ms / 1e3)
  const mn = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0')
  const sc = (secs % 60).toString().padStart(2, '0')
  return `${mn}:${sc}`
}
