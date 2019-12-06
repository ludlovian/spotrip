'use strict'

import sade from 'sade'
import { version } from '../package.json'
import {
  queueAlbum,
  recordTrack,
  recordAlbum,
  ripAlbum,
  tagAlbum,
  publishAlbum,
  checkoutAlbum,
  daemonStatus,
  daemonStart,
  daemonStop
} from './commands'
import extractMp3 from './extractMp3'
import extractFlac from './extractFlac'
import { showAlbum, showTrack } from './show'
import options from './options'

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

prog
  .command('queue <album-url>')
  .describe('queue the album for ripping')
  .action(queueAlbum)
prog
  .command('record track <track-uri> <dest>')
  .describe('record a track')
  .action(recordTrack)
prog
  .command('record album <dir>')
  .describe('record an album')
  .action(recordAlbum)
prog
  .command('tag <dir>')
  .describe('set tags for an album')
  .action(tagAlbum)
prog
  .command('checkout <dir>')
  .describe('checkout a working copy of the album')
  .action(checkoutAlbum)
prog
  .command('publish <dir>')
  .describe('publish the album')
  .action(publishAlbum)
prog
  .command('rip <dir>')
  .describe('record, tag and store an album')
  .action(ripAlbum)
prog
  .command('extract mp3 <dir>')
  .describe('converts MP3 dir')
  .action(extractMp3)
prog
  .command('extract flac <dir>')
  .describe('converts FLAC dir')
  .action(extractFlac)
prog
  .command('daemon status')
  .describe('report on spotweb')
  .action(daemonStatus)
prog
  .command('daemon stop')
  .describe('stop spotweb')
  .action(daemonStop)
prog
  .command('daemon start')
  .describe('start spotweb')
  .action(daemonStart)
prog
  .command('show album <uri>')
  .describe('show the metadata for an album')
  .action(showAlbum)
prog
  .command('show track <uri>')
  .describe('show the metadata for a track')
  .action(showTrack)

const parse = prog.parse(process.argv, { lazy: true })
if (parse) {
  const { handler, args } = parse
  options.set(args.pop())

  handler.apply(null, args).catch(err => {
    console.error('An unexpected error occured')
    console.error(err)
    process.exit(1)
  })
}
