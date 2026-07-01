#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

# Plays the spotify track and stores the PCM data
#
# Parameters:
#   $1              - the track id
#
# Uprefs
#   track_metadata    - the metadata of the current track
#   OPT_DOWLOAD_RATE  - the max rate
#

capture_track_pcm () {
  local track_id=$1
  local file="${track_metadata[file]}"
  local size="${track_metadata[pcm_bytes]}"

  [[ -n "$file" ]] || die 'file missing from metadata'
  [[ -n "$size" ]] || die 'pcm_data missing from metadata'

  local output="$WORK/$file.pcm"

  if [[ -e "$output" ]]; then
    printf 'Capturing %s.pcm ... already done\n' "$file"
    return 0
  fi
  printf 'Capturing %s.pcm ...\n' "$file"

  $CMD_PLAY "$CREDS_FILE" "$track_id" |
    pv \
      --size "$size" \
      --rate-limit $OPT_DOWLOAD_RATE \
      > "${output}.tmp"

  mv "${output}.tmp" "$output"

  printf 'Capturing %s.pcm ... complete\n' "$file"

  sleep $((RANDOM % 4 + 2))
}
