'use strict'

import sade from 'sade'
import { version } from '../package.json'
import queue from './queue'
import recordTrack from './recordTrack'
import recordAlbum from './recordAlbum'
import ripAlbum from './ripAlbum'
import tagAlbum from './tagAlbum'
import publishAlbum from './publishAlbum'
import checkoutAlbum from './checkoutAlbum'
import extractMp3 from './extractMp3'
import extractFlac from './extractFlac'
import { daemonStatus, startDaemon, stopDaemon } from './spotweb'

const prog = sade('spotrip')

prog
  .version(version)
  .option('--work', 'The working directory structure', '/home/alan/music')
  .option(
    '--store',
    'The store for music',
    '/nas/data/media/music/albums/Classical'
  )
  .option('--spotweb-port', 'The port for spotweb', 39705)
  .option(
    '--spotweb-command',
    'The command for spotweb',
    '/home/alan/env/spotweb/bin/python3 /home/alan/dev/spotweb/spotweb.py'
  )

prog.command('queue <album-url>', 'queue the album for ripping').action(queue)

prog
  .command('record-track <track-uri> <dest>', 'record a track')
  .action(recordTrack)

prog.command('record-album <dir>', 'record an album').action(recordAlbum)

prog.command('retag <dir>', 'set tags for an album').action(tagAlbum)

prog
  .command('checkout <dir>', 'checkout a working copy of the album')
  .action(checkoutAlbum)

prog.command('publish <dir>', 'publish the album').action(publishAlbum)

prog.command('rip <dir>', 'record, tag and store an album').action(ripAlbum)

prog.command('extract-mp3 <dir>', 'converts MP3 dir').action(extractMp3)

prog.command('extract-flac <dir>', 'converts FLAC dir').action(extractFlac)

prog.command('daemon-status', 'report on spotweb').action(daemonStatus)
prog.command('daemon-stop', 'stop spotweb').action(stopDaemon)
prog.command('daemon-start', 'start spotweb').action(startDaemon)

const parse = prog.parse(process.argv, { lazy: true })
if (parse) {
  const { handler, args } = parse

  handler.apply(null, args).catch(err => {
    console.error('An unexpected error occured')
    console.error(err)
    process.exit(1)
  })
}
