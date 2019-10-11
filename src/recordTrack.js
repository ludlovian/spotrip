'use strict'

import { basename } from 'path'

import options from './options'
import { normalizeUri, exec } from './util'
import spotweb from './spotweb'
import log from './log'

export default async function recordTrack (uri, dest, opts = {}) {
  options.set(opts)

  uri = normalizeUri(uri, 'track')
  const pcm = dest.replace(/\.flac$/, '') + '.pcm'
  const filename = basename(dest)
  const { progressFrequency = 1000 } = options

  showProgress('capturing')
  const progressInterval = setInterval(getProgress, progressFrequency)

  try {
    await spotweb(`/play/${uri}?format=raw`).toFile(pcm)
  } finally {
    clearInterval(progressInterval)
  }

  const receipt = await spotweb(`/receipt/${uri}`).json()
  if (receipt.failed) {
    throw new Error(`Recording of ${uri} failed: ${receipt.error}`)
  }

  showProgress('converting')

  await exec('flac', [
    '--silent',
    '--force',
    '--force-raw-format',
    '--endian=little',
    '--channels=2',
    '--bps=16',
    '--sample-rate=44100',
    '--sign=signed',
    `--output-name=${dest}`,
    pcm
  ])

  await exec('rm', [pcm])

  function showProgress (action, pct) {
    const pctString = pct == null ? '' : ` ... ${Math.floor(pct)}%`
    log.status(`${filename} ${action}${pctString} `)
  }

  async function getProgress () {
    const data = await spotweb('/status').json()
    const { status } = data
    if (
      !status.streaming ||
      status.uri !== uri ||
      typeof status.length !== 'number' ||
      status.length <= 0 ||
      typeof status.pos !== 'number'
    ) {
      return
    }
    showProgress('capturing', (100 * status.pos) / status.length)
  }
}
