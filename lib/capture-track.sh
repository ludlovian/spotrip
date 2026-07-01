#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

# Captures a spotify track into a fully tagged flac file
#
# Parameters:
#   $1              - the track id
#

capture_track () {
  local track_id=$1

  local -A track_metadata
  sql_track_metadata "$track_id" track_metadata

  local file="${track_metadata[file]}"

  local output="$WORK/$file.flac"
  if [[ -e "$output" ]]; then
    printf 'Capturing %s.flac ... already done\n' "$file"
    return 0
  fi

  print_banner \
    "Artist: ${CYAN}${track_metadata[album_artist]}${RESET}" \
    "Album:  ${CYAN}${track_metadata[album]}${RESET}" \
    "Title:  ${YELLOW}${track_metadata[title]}${RESET}" \
    "Track:  ${GREEN}${track_metadata[seq]}${RESET}"\
" / ${GREEN}${track_metadata[num_tracks]}${RESET}" \
    "        ${RED}Capturing track${RESET}"

  capture_track_pcm "$track_id"
  download_cover_art
  convert_pcm_to_flac
}

