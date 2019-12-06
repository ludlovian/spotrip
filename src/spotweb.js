import http from 'http'
import { spawn } from 'child_process'

import { exec } from './util'
import options from './options'

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
  }).then(
    res => {
      if (res.statusCode !== 200) {
        throw new Error(`${res.statusCode} - ${res.statusMessage}`)
      }
      return res
    },
    err => {
      if (err.code === 'ECONNREFUSED') throw new Error('Spotweb not running')
      throw err
    }
  )
}

export function getSpotwebPid () {
  return exec('pgrep', ['-fx', options['spotweb-command']]).then(
    ({ stdout }) => stdout.trim(),
    err => {
      if (err.code) return ''
      throw err
    }
  )
}

export async function stopSpotweb () {
  await exec('pkill', ['-fx', options['spotweb-command']])
}

export async function startSpotweb () {
  const [cmd, ...args] = options['spotweb-command'].split(' ')
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref()
}
