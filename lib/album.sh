#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

# album level analysis
#
# decomposes an album into tasks
#

album_analyse () {
  local album_id=$1
  local dest=$2

  local artist title track_id
  local -a tracks

  sql_album_metadata "$1" artist title tracks

  print_banner \
    "Artist: ${CYAN}${artist}${RESET}" \
    "Title:  ${CYAN}${title}${RESET}" \
    "Path:   ${YELLOW}${dest}${RESET}" \
    "        ${RED}Analysing album...${RESET}"

  for track_id in "${tracks[@]}"; do
    queue_add track "$album_id" "$track_id"
  done

  queue_add tag "$album_id"
  queue_add publish "$album_id" "$dest"

}

album_tag () {
  local album_id=$1

  local artist title track_id
  local -a tracks
  sql_album_metadata "$1" artist title tracks

  print_banner \
    "Artist: ${CYAN}${artist}${RESET}" \
    "Title:  ${CYAN}${title}${RESET}" \
    "        ${RED}Tagging album...${RESET}"

  for  track_id in "${tracks[@]}"; do
    album_tag_track "$album_id" "$track_id"
  done

  album_replay_gain "$album_id"
}

album_tag_track () {
  local album_id=$1
  local track_id=$2

  local -A track_metadata
  local -a artists album_artists tags
  local flac_file artist album_artist cover_file

  sql_track_metadata $track_id track_metadata

  unpack_artists "${track_metadata[artist]}" artists
  unpack_artists "${track_metadata[album_artist]}" album_artists
  flac_file="$WORK/$album_id/${track_metadata[file]}.flac"
  cover_file="$WORK/$album_id/cover.${track_metadata[art_type]}"

  metaflac --remove-all-tags "$flac_file"
  metaflac --remove --block-type=PICTURE "$flac_file"

  tags+=(--no-utf8-convert)

  tags+=("--set-tag=TITLE=${track_metadata[title]}")

  for artist in "${artists[@]}"; do
    tags+=("--set-tag=ARTIST=${artist}")
  done

  tags+=("--set-tag=GENRE=Classical")
  tags+=("--set-tag=ALBUM=${track_metadata[album]}")

  for album_artist in "${album_artists[@]}"; do
    tags+=("--set-tag=ALBUMARTIST=${album_artist}")
  done

  tags+=("--set-tag=DISCNUMBER=${track_metadata[disc_number]}")
  tags+=("--set-tag=TRACKNUMBER=${track_metadata[track_number]}")

  tags+=("--set-tag=TRACKID=${track_metadata[track_id]}")
  tags+=("--set-tag=ALBUMID=${track_metadata[album_id]}")

  tags+=("--import-picture-from=$cover_file")

  metaflac "${tags[@]}" "$flac_file"
}

album_replay_gain () {
  local album_id=$1
  local -a flac_files=("$WORK/$album_id"/track*.flac)
  metaflac --add-replay-gain "${flac_files[@]}"

  local album_gain album_peak
  local sample=${flac_files[0]}

  album_gain=$(metaflac --show-tag=REPLAYGAIN_ALBUM_GAIN "$sample")
  album_peak=$(metaflac --show-tag=REPLAYGAIN_ALBUM_PEAK "$sample")

  album_gain=${album_gain#*=}
  album_peak=${album_peak#*=}

  [[ -n "$album_gain" && -n "$album_peak" ]] || die "No replaygain for $sample"

  metaflac \
    --remove-tag=REPLAYGAIN_TRACK_GAIN \
    --remove-tag=REPLAYGAIN_TRACK_PEAK \
    --set-tag="REPLAYGAIN_TRACK_GAIN=$album_gain" \
    --set-tag="REPLAYGAIN_TRACK_PEAK=$album_peak" \
    "${flac_files[@]}"
}

album_publish () {
  local album_id=$1
  local dest=$2

  local artist title
  local -a tracks

  sql_album_metadata "$1" artist title tracks

  print_banner \
    "Artist: ${CYAN}${artist}${RESET}" \
    "Title:  ${CYAN}${title}${RESET}" \
    "Path:   ${YELLOW}${dest}${RESET}" \
    "        ${RED}Publishing album...${RESET}"

  mkdir -p "$MUSIC_ROOT/$dest"

  rsync \
    --archive \
    --verbose \
    "$WORK/$album_id/" \
    "$MUSIC_ROOT/$dest/"

  rm -rf "$WORK/$album_id"
}
