import ms from 'ms'

import report from './report'

const sleep = tm => new Promise(resolve => setTimeout(resolve, tm))

export default function retry (fn, opts = {}) {
  return tryOne({ ...opts, fn, attempt: 1 })
}

function tryOne (opts) {
  const {
    fn,
    attempt,
    maxAttempts = 5,
    delay = ms('1 minute'),
    backoff = n => n * 1.5
  } = opts

  return Promise.resolve(fn()).catch(err => {
    if (attempt > maxAttempts) throw err
    report.emit('retry', { attempt, delay, err })
    return sleep(delay).then(() =>
      tryOne({
        ...opts,
        attempt: attempt + 1,
        delay: backoff(delay)
      })
    )
  })
}
