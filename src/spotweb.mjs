import http from 'http'
import { spawn } from 'child_process'

import exec from 'pixutil/exec'

import { DAEMON_PORT, DAEMON_COMMAND } from './defaults.mjs'

export async function daemonPid ({ port = DAEMON_PORT } = {}) {
  return exec('fuser', [`${port}/tcp`]).then(
    ({ stdout }) => stdout.trim().split('/')[0],
    err => {
      if (err.code) return ''
      throw err
    }
  )
}

export async function daemonStart ({ cmd = DAEMON_COMMAND } = {}) {
  const [file, ...args] = cmd.split(' ')
  spawn(file, args, { detached: true, stdio: 'ignore' }).unref()
}

export async function daemonStop ({ port = DAEMON_PORT } = {}) {
  const pid = await daemonPid({ port })
  if (pid) await exec('kill', [pid])
}

export async function getAlbumMetadata (uri) {
  return getData({ path: `/album/${uri}` })
}

export async function getTrackMetadata (uri) {
  return getData({ path: `/track/${uri}` })
}

export function getPlayStream (uri) {
  return getResponse({ path: `/play/${uri}` })
}

export function getStatus () {
  return getData({ path: '/status' })
}

async function getData (opts) {
  const response = await getResponse(opts)
  response.setEncoding('utf8')
  let data = ''
  for await (const chunk of response) {
    data += chunk
  }
  return JSON.parse(data)
}

async function getResponse ({ path, port = DAEMON_PORT } = {}) {
  try {
    const p = new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${port}${path}`, resolve)
      req.once('error', reject).end()
    })
    const response = await p
    const { statusCode: code, statusMessage: msg } = response
    if (code !== 200) throw Object.assign(new Error(msg), { response })
    return response
  } catch (err) {
    if (err.code === 'ECONNREFUSED') throw new Error('Spotweb not running')
    throw err
  }
}
