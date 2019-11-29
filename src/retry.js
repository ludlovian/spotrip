export default async function retry (
  fn,
  { attempts = 5, delay = 60 * 1000, backoff = n => n + 60 * 1000 } = {}
) {
  await makeAttempt(1)

  async function makeAttempt (n) {
    try {
      return await fn()
    } catch (err) {
      if (n > attempts) throw err
      console.error(`\nError occured: ${err.message}`)
      console.error(`Waiting ${(delay / 1e3).toFixed()}s to retry ...`)
      const ms = delay
      delay = backoff(delay)
      return sleep(ms).then(() => makeAttempt(n + 1))
    }
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
