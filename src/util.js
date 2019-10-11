'use strict'

import {
  writeFile as _writeFile,
  readFile as _readFile,
  stat as _stat
} from 'fs'
import { promisify } from 'util'
import { execFile as _execFile, spawn as _spawn } from 'child_process'

export const exec = promisify(_execFile)
export const writeFile = promisify(_writeFile)
export const readFile = promisify(_readFile)
const stat = promisify(_stat)

export function normalizeUri (uri, prefix) {
  return `spotify:${prefix}:${uri.replace(/.*[:/]/, '')}`
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
