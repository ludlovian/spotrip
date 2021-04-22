import { recordAlbum } from '../src'

const path = '/home/alan/music/work/Gesualdo_Tenebrae'

recordAlbum({ path }).then(() => console.log('==Test Over=='))
