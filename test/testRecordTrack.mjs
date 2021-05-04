import { recordTrack } from '../src/index.mjs'
import { execFileSync } from 'child_process'

const dir = './test/assets'
const uri = 'spotify:track:7IwJGVrr4oH5bun9Luei4t'
const file = `${dir}/track01.flac`

execFileSync('mkdir', ['-p', dir])

recordTrack({ uri, file }).then(() => console.log('\n\nTest finished'))
