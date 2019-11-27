'use strict'

import http from 'http'

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
    const { spotweb: port } = options
    http
      .get(`http://localhost:${port}${path}`, resolve)
      .once('error', reject)
      .end()
  }).catch(err => {
    if (err.code === 'ECONNREFUSED') throw new Error('Spotweb not running')
    throw err
  })
}
