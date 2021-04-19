const CSI = '\u001B['
const CR = '\r'
const EOL = `${CSI}0K`

function log (string, { newline = true, limitWidth } = {}) {
  if (log.prefix) {
    string = log.prefix + string
  }
  if (limitWidth && log.width) {
    string = truncateToWidth(string, log.width)
  }
  if (log.dirty) {
    string = CR + EOL + string
  }
  if (newline) {
    string = string + '\n'
    log.dirty = false
  } else {
    log.dirty = true
  }

  process.stdout.write(string)
}

log.status = string =>
  log(string, {
    newline: false,
    limitWidth: true
  })

log.prefix = ''
if (process.stdout.isTTY) {
  log.width = process.stdout.columns
  process.stdout.on('resize', () => {
    log.width = process.stdout.columns
  })
}

export default log

function truncateToWidth (string, maxWidth) {
  if (string.length < maxWidth) return string
  const parts = []
  let w = 0
  let full
  for (const match of string.matchAll(RE_DECOLOR)) {
    const [, text, ansiCode] = match
    if (full) {
      parts.push(ansiCode)
      continue
    } else if (w + text.length < maxWidth) {
      parts.push(text, ansiCode)
      w += text.length
    } else {
      parts.push(text.slice(0, maxWidth - w - 1), ansiCode)
      full = true
    }
  }
  return parts.join('')
}

const RE_DECOLOR = /(^|[^\x1b]+)((?:\x1b\[\d*m)|$)/g // eslint-disable-line no-control-regex
