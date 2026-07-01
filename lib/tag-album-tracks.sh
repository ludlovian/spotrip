#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

tag_album_tracks () {
  local artist=$1 title=$2
  local -n _track_ids=$3

  local track_id

  print_banner \
    "Artist: ${CYAN}${artist}${RESET}" \
    "Title:  ${CYAN}${title}${RESET}" \
    "        ${RED}Tagging FLAC files${RESET}"

  for track_id in "${_track_ids[@]}"; do
    tag_album_track "$track_id"
  done
}
