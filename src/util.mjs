const URI_PATTERN = /^[a-zA-Z0-9]{22}$/

export function normalizeUri (uri, prefix) {
  const coreUri = uri.replace(/.*[:/]/, '').replace(/\?.*$/, '')
  if (!URI_PATTERN.test(coreUri)) {
    throw new Error(`Bad URI: ${uri}`)
  }
  return `spotify:${prefix}:${coreUri}`
}
