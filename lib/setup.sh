#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

CMD_DBX=/home/alan/bin/dbx
CMD_PLAY=$PROGDIR/bin/play

CREDS_FILE=$PROGDIR/cache/credentials.json
MUSIC_ROOT=/mnt/data/media/albums/Classical

WORK=$PROGDIR/work
QUEUE=$PROGDIR/queue.txt

JONOS_URL="http://pi2.local:3500"

OPT_DOWLOAD_RATE="200K"

mkdir -p $WORK/

die () {
  echo "$@" >&2
  exit 1
}

RESET=$'\e[0m'
RED=$'\e[31m'
GREEN=$'\e[32m'
YELLOW=$'\e[33m'
BLUE=$'\e[34m'
MAGENTA=$'\e[35m'
CYAN=$'\e[36m'
