import EventEmitter from 'events'
import ms from 'ms'

import log from 'logjs'

const reporter = new EventEmitter()
const report = reporter.emit.bind(reporter)

export default report

reporter
  .on('spotrip.queue.start', uri => log(`Queue ${log.green(uri)}`))
  .on('spotrip.queue.done', name => {
    log('')
    log(`Queued ${log.cyan(name)} for ripping.`)
  })
  .on('spotrip.track.record.start', file => {
    const name = file.replace(/.*\//, '')
    log.prefix = `${log.green(name)} `
    log.status('... ')
  })
  .on('spotrip.track.record.update', ({ percent, taken, eta }) =>
    log.status(`- ${percent}%  in ${ms(taken)}  eta ${ms(eta)}`)
  )
  .on('spotrip.track.record.done', ({ total, speed }) => {
    log.prefix += log.green(
      `- ${fmtDuration(total * 1e3)}  at ${speed.toFixed(1)}x`
    )
    log.status('')
  })
  .on('spotrip.track.convert.start', () => log.status(' ... converting'))
  .on('spotrip.track.convert.done', () => {
    log('')
    log.prefix = ''
  })
  .on('spotrip.album.record.start', md => {
    log(`Recording ${log.cyan(md.album)}`)
    log(`by ${log.cyan(md.albumArtist)}`)
    log(`from ${md.albumUri}`)
    log('')
  })
  .on('spotrip.album.record.done', () => log(''))

function fmtDuration (ms) {
  const secs = Math.round(ms / 1e3)
  const mn = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0')
  const sc = (secs % 60).toString().padStart(2, '0')
  return `${mn}:${sc}`
}
