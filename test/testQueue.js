import { queueAlbum } from '../src'

const URI = 'https://open.spotify.com/album/031Vhx71seHacFKaHAEm4O'

queueAlbum(URI).then(() => console.log('\nDone'))
