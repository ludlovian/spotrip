'use strict'

import sade from 'sade'
import { version } from '../package.json'
import queue from './queue'
import recordTrack from './recordTrack'
import recordAlbum from './recordAlbum'
import ripAlbum from './ripAlbum'
import tagAlbum from './tagAlbum'
import publishAlbum from './publishAlbum'
import extractMp3 from './extractMp3'
import { catchExceptions } from './util'

const prog = sade('spotrip')

prog
  .version(version)
  .option('--work', 'The working directory structure', '/home/alan/music')
  .option(
    '--store',
    'The store for music',
    '/nas/data/media/music/albums/Classical'
  )
  .option('--spotweb', 'The port for spotweb', 39704)

prog
  .command('queue <album-url>', 'queue the album for ripping')
  .action(catchExceptions(queue))

prog
  .command('record-track <track-uri> <dest>', 'record a track')
  .action(catchExceptions(recordTrack))

prog
  .command('record-album <dir>', 'record an album')
  .action(catchExceptions(recordAlbum))

prog
  .command('retag <dir>', 'set tags for an album')
  .action(catchExceptions(tagAlbum))

prog
  .command('publish <dir>', 'publish the album')
  .action(catchExceptions(publishAlbum))

prog
  .command('rip <dir>', 'record, tag and store an album')
  .action(catchExceptions(ripAlbum))

prog
  .command('extract-mp3 <dir>', 'converts MP3 dir')
  .action(catchExceptions(extractMp3))

prog.parse(process.argv)
