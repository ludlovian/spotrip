'use strict'

export default class Speedo {
  constructor ({ length = 10 } = {}) {
    this.length = length
    this.start = Date.now()
    this.readings = [[this.start, 0]]
  }

  update (n) {
    this.readings.push([Date.now(), n])
    if (this.readings.length > this.length) {
      this.readings.splice(0, this.readings.length - this.length)
    }
    this.current = n
  }

  rate () {
    if (this.readings.length < 2) return null
    const last = this.readings[this.readings.length - 1]
    const first = this.readings[0]
    return (1e3 * (last[1] - first[1])) / (last[0] - first[0])
  }

  percent () {
    if (!this.total) return null
    return Math.round((100 * this.current) / this.total)
  }

  eta () {
    if (!this.total) return null
    const rate = this.rate()
    if (rate === null) return null
    return (this.total - this.current) / rate
  }

  taken () {
    return (this.readings[this.readings.length - 1][0] - this.start) / 1e3
  }
}
