'use strict'

const CSI = '\u001B['
const CR = '\r'
const EOL = `${CSI}0K`

var dirty = false

function log (string) {
  if (dirty) {
    string = CR + EOL + string
    dirty = false
  }
  console.log(string)
}

function status (string) {
  if (dirty) {
    string = CR + EOL + string
  }
  process.stdout.write(string)
  dirty = true
}

log.status = status
log.log = log

export default log
