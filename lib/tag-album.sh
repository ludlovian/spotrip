#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

# Tags a complete album with the right FLAC metadata tags
#

tag_album () {
  local album_id=$1
  local -n _track_ids=$2

  local track_id

  for  track_id in "${_track_ids[@]}"; do
    tag_track $track_id
  done
}

tag_track () {
  local track_id=$1

  local -A track_metadata
  local -a artists
  local -a album_artists
  local -a tags

  sql_track_metadata $track_id track_metadata

  unpack_artists "${track_metadata[artist]}" artists
  unpack_artists "${track_metadata[album_artist]}" album_artists
  local flac_file="$WORK/${track_metadata[file]}.flac"

  metaflac --remove-all-tags "$flac_file"
  metaflac --remove --block-type=PICTURE "$flac_file"

  tags+=(--no-utf8-convert)

  tags+=("--set-tag=TITLE=${track_metadata[title]}")

  local artist
  for artist in "${artists[@]}"; do
    tags+=("--set-tag=ARTIST=${artist}")
  done

  tags+=("--set-tag=GENRE=Classical")
  tags+=("--set-tag=ALBUM=${track_metadata[album]}")

  local album_artist
  for album_artist in "${album_artists[@]}"; do
    tags+=("--set-tag=ALBUMARTIST=${album_artist}")
  done

  tags+=("--set-tag=DISCNUMBER=${track_metadata[disc_number]}")
  tags+=("--set-tag=TRACKNUMBER=${track_metadata[track_number]}")

  tags+=("--set-tag=TRACKID=${track_metadata[track_id]}")
  tags+=("--set-tag=ALBUMID=${track_metadata[album_id]}")

  tags+=("--import-picture-from=$WORK/cover.${track_metadata[art_type]}")

  metaflac "${tags[@]}" "$flac_file"
}
