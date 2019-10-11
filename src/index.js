'use strict'

import sade from 'sade'
import { version } from '../package.json'
import queue from './queue'
import recordTrack from './recordTrack'
import recordAlbum from './recordAlbum'
import ripAlbum from './ripAlbum'
import tagAlbum from './tagAlbum'
import publishAlbum from './publishAlbum'

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

prog.command('queue <album-url>', 'queue the album for ripping').action(queue)

prog
  .command('record-track <track-uri> <dest>', 'record a track')
  .action(recordTrack)

prog.command('record-album <dir>', 'record an album').action(recordAlbum)

prog.command('tag-album <dir>', 'set tags for an album').action(tagAlbum)

prog.command('publish-album <dir>', 'publish the album').action(publishAlbum)

prog
  .command('rip-album <dir>', 'record, tag and store an album')
  .action(ripAlbum)

prog.parse(process.argv)
