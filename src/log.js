const CSI = '\u001B['
const CR = '\r'
const EOL = `${CSI}0K`

function log (string) {
  log.status(string + '\n')
  log.dirty = false
}

log.status = string => {
  const clear = log.dirty ? CR + EOL : ''
  process.stdout.write(`${clear}${log.prefix}${string}`)
  log.dirty = true
}

log.prefix = ''

export default log
