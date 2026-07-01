#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

# Converts a captured PCM file into a flac file
#
# Uprefs
#   track_metadata    - the metadata of the current track
#

convert_pcm_to_flac () {
  local file="${track_metadata[file]}"
  local input="$WORK/$file.pcm"
  local output="$WORK/$file.flac"

  [[ -e "$input" ]] || die "$input does not exist"

  local -a convert_opts=(
    -force-raw-format
    --endian=little
    --sign=signed
    --sample-rate=44100
    --bps=16
    --channels=2
  )

  printf 'Converting %s.pcm -> %s.flac ...\n' "$file" "$file"

  flac \
    "${convert_opts[@]}" \
    -o "$output" \
    "$input" 

  rm "$input"

  printf 'Converting %s.pcm -> %s.flac ... done\n' "$file" "$file"
}

build_flac_tag_opts () {
  local -n _tags=$1
  local -a artists
  local -a album_artists

  unpack_artists "${track_metadata[artist]}" artists
  unpack_artists "${track_metadata[album_artist]}" album_artists


  _tags+=(--no-utf8-convert)

  _tags+=("--tag=TITLE=${track_metadata[title]}")
  for artist in "${artists[@]}"; do
    _tags+=("--tag=ARTIST=${artist}")
  done
  _tags+=("--tag=GENRE=Classical")
  _tags+=("--tag=ALBUM=${track_metadata[album]}")
  for album_artist in "${album_artists[@]}"; do
    _tags+=("--tag=ALBUMARTIST=${album_artist}")
  done

  _tags+=("--tag=DISCNUMBER=${track_metadata[disc_number]}")
  _tags+=("--tag=TRACKNUMBER=${track_metadata[track_number]}")

  _tags+=("--tag=TRACKID=${track_metadata[track_id]}")
  _tags+=("--tag=ALBUMID=${track_metadata[album_id]}")

  _tags+=("--picture=$WORK/cover.${track_metadata[art_type]}")
}
