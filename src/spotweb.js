'use strict'

import { createWriteStream } from 'fs'
import { request } from 'http'

import options from './options'

export default function spotweb (path) {
  const opts = {
    path,
    port: options.spotweb,
    method: 'GET'
  }

  const pResponse = new Promise((resolve, reject) => {
    const req = request(opts, resolve)
    req.once('error', reject)
    req.end()
  }).catch(e => {
    if (e.code === 'ECONNREFUSED') throw new Error('Spotweb not running')
    throw e
  })

  pResponse.json = () => pResponse.then(r => toJson(r))
  pResponse.toFile = file => pResponse.then(r => toFile(r, file))

  return pResponse
}

function toJson (response) {
  return new Promise((resolve, reject) => {
    let data = ''
    response.setEncoding('utf8')
    response
      .once('error', reject)
      .on('data', chunk => {
        data += chunk
      })
      .on('end', () => resolve(data))
  }).then(data => JSON.parse(data))
}

function toFile (response, file) {
  return new Promise((resolve, reject) => {
    const stream = createWriteStream(file, { encoding: null })
    stream.once('error', reject).on('finish', resolve)
    response.once('error', reject)
    response.pipe(stream)
  })
}
