import http from 'http'
import { spawn } from 'child_process'

import { exec } from './util'
import options from './options'
import report from './report'

export async function getData (path) {
  const response = await getResponse(path)
  response.setEncoding('utf8')
  let data = ''
  for await (const chunk of response) {
    data += chunk
  }
  return JSON.parse(data)
}

export function getStream (path) {
  return getResponse(path)
}

function getResponse (path) {
  return new Promise((resolve, reject) => {
    const port = options['spotweb-port']
    http
      .get(`http://localhost:${port}${path}`, resolve)
      .once('error', reject)
      .end()
  }).catch(err => {
    if (err.code === 'ECONNREFUSED') throw new Error('Spotweb not running')
    throw err
  })
}

export async function daemonStatus () {
  const { stdout } = await exec('pgrep', [
    '-fx',
    options['spotweb-command']
  ]).catch(err => {
    if (err.code !== 1) throw err
    return err
  })
  report.daemonStatus(stdout.trim())
}

export async function stopDaemon () {
  await exec('pkill', ['-fx', options['spotweb-command']])
  report.daemonStopped()
}

export async function startDaemon () {
  const [cmd, ...args] = options['spotweb-command'].split(' ')
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref()
  report.daemonStarted()
}
