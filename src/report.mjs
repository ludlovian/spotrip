import EventEmitter from 'events'
import { format } from '@lukeed/ms'

import log from 'logjs'

const reporter = new EventEmitter()
const report = reporter.emit.bind(reporter)

export default report

let prefix

reporter
  .on('spotrip.queue.start', uri => log(`Queue ${log.green(uri)}`))
  .on('spotrip.queue.done', name => {
    log('')
    log(`Queued ${log.cyan(name)} for ripping.`)
  })
  .on('spotrip.track.record.start', file => {
    const name = file.replace(/.*\//, '')
    prefix = log.green(name)
    log.status(prefix + ' ... ')
  })
  .on('spotrip.track.record.update', ({ percent, taken, eta }) =>
    log.status(
      [
        prefix,
        `- ${percent}% `,
        `in ${format(taken)} `,
        `eta ${format(eta)}`
      ].join(' ')
    )
  )
  .on('spotrip.track.record.done', ({ total, speed }) => {
    prefix += log.green(
      ` - ${fmtDuration(total * 1e3)}  at ${speed.toFixed(1)}x`
    )
    log.status(prefix)
  })
  .on('spotrip.track.convert.start', () =>
    log.status(prefix + ' ... converting')
  )
  .on('spotrip.track.convert.done', () => {
    log(prefix)
    prefix = ''
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
