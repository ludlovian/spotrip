#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

copy_to_dest () {
  local dest=$1
  rsync \
    --archive \
    --remove-source-files \
    "$WORK/" \
    "$MUSIC_ROOT/$DEST/"
}
