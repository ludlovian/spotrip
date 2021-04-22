import { promisify } from 'util'
import { execFile as _execFile } from 'child_process'
import { stat } from 'fs/promises'

const URI_PATTERN = /^[a-zA-Z0-9]{22}$/

export const exec = promisify(_execFile)

export function processEnded (proc) {
  return new Promise((resolve, reject) => {
    proc.once('error', reject)
    proc.on('exit', (code, signal) => {
      if (signal) return reject(new Error(`Signal: ${signal}`))
      if (code) return reject(new Error(`Bad code: ${code}`))
      resolve()
    })
  })
}

export function streamFinished (stream) {
  return new Promise((resolve, reject) => {
    stream.once('error', reject)
    stream.on('finish', resolve)
  })
}

export function normalizeUri (uri, prefix) {
  const coreUri = uri.replace(/.*[:/]/, '')
  if (!URI_PATTERN.test(coreUri)) {
    throw new Error(`Bad URI: ${uri}`)
  }
  return `spotify:${prefix}:${coreUri}`
}

export async function exists (path) {
  try {
    await stat(path)
    return true
  } catch (err) {
    if (err.code === 'ENOENT') return false
    throw err
  }
}
