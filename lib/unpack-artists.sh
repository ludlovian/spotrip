#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

# Unpacks a pipe delimited string into the named array
#
# Parameters:
#   $1              - the list of artists
#   $2              - the name of the array
#

unpack_artists () {
  local artist_list=$1
  local -n _result=$2

  [[ -n "$artist_list" ]] || return 0
  IFS='|' read -a _result <<<"$artist_list" || true
}
