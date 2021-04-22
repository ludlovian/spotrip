import { recordTrack } from '../src'
import { execFileSync } from 'child_process'

const dir = '/home/alan/music/work/Gesualdo_Tenebrae'
const uri = 'spotify:track:6ADCBr59IpB9lZHuE5pmfz'
const file = `${dir}/track01.flac`

execFileSync('mkdir', ['-p', dir])

recordTrack({ uri, file }).then(() => console.log('\n\nTest finished'))
