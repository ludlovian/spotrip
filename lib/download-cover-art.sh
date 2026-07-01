#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

# Downloads the cover art file
#
# Uprefs
#   track_metadata    - the metadata of the current track
#

download_cover_art () {
  local art_type="${track_metadata[art_type]}"
  local artwork="${track_metadata[artwork]}"

  [[ -n "$art_type" ]] || die 'art_type missing from metadata'
  [[ -n "$artwork" ]] || die 'artwork missing from metadata'

  local output="$WORK/cover.$art_type"

  [[ ! -e "$output" ]] || return 0

  printf 'Downloading cover.%s ... ' "$art_type"

  local url="$JONOS_URL/art/$artwork"

  curl --silent "$url" > "$output"

  printf 'done\n'
}


