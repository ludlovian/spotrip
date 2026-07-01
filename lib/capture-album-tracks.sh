#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

# Captures all the spotify tracks for an album
#
# Parameters:
#   $1              - the album id
#

capture_album_tracks () {
  local album_id=$1
  local -n _track_ids=$2

  local track_id

  for track_id in "${_track_ids[@]}"; do
    capture_track "$track_id"
  done
}


