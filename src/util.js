import fs from 'fs'
import stream from 'stream'
import { promisify } from 'util'
import { execFile as _execFile, spawn as _spawn } from 'child_process'

export const pipeline = promisify(stream.pipeline)

export const exec = promisify(_execFile)
export const writeFile = fs.promises.writeFile
export const readFile = fs.promises.readFile
export const readdir = fs.promises.readdir
const stat = fs.promises.stat

const URI_PATTERN = /^[a-zA-Z0-9]{22}$/

export function normalizeUri (uri, prefix) {
  const coreUri = uri.replace(/.*[:/]/, '')
  if (!URI_PATTERN.test(coreUri)) {
    throw new Error(`Bad URI: ${uri}`)
  }
  return `spotify:${prefix}:${coreUri}`
}

export function spawn (...args) {
  const proc = _spawn(...args)
  proc.done = new Promise((resolve, reject) => {
    proc.once('error', reject)
    proc.on('exit', (code, signal) => {
      if (signal) return reject(new Error(signal))
      resolve(code)
    })
  })
  return proc
}

export async function readJson (file) {
  const data = await readFile(file, { encoding: 'utf8' })
  return JSON.parse(data)
}

export async function exists (file) {
  try {
    await stat(file)
    return true
  } catch (e) {
    return false
  }
}

export function time (n) {
  n = Math.round(n)
  const mn = Math.floor(n / 60)
    .toString()
    .padStart(2, '0')
  const sc = (n % 60).toString().padStart(2, '0')
  return `${mn}:${sc}`
}

export function comma (n) {
  return typeof n === 'number' ? n.toLocaleString() : ''
}
