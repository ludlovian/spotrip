#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

# track level capturing
#

track_rip () {
  local album_id=$1
  local track_id=$2

  local -A track_metadata
  sql_track_metadata "$track_id" track_metadata

  local file="${track_metadata[file]}"

  local output="$WORK/$album_id/$file.flac"
  mkdir -p "$WORK/$album_id"

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

  track_capture_pcm \
    "$album_id" \
    "$track_id" \
    "${track_metadata[file]}" \
    "${track_metadata[pcm_bytes]}"

  track_convert_to_flac \
    "$album_id" \
    "${track_metadata[file]}"

  track_cover_art \
    "$album_id" \
    "${track_metadata[artwork]}" \
    "${track_metadata[art_type]}"
}

track_capture_pcm () {
  local album_id=$1
  local track_id=$2
  local file=$3
  local size=$4

  [[ -n "$file" ]] || die 'file missing from metadata'
  [[ -n "$size" ]] || die 'pcm_data missing from metadata'

  local output="$WORK/$album_id/$file.pcm"
  local max_attempts=5 attempt=1 delay=2

  [[ ! -s "$output" ]] || return 0

  while (( attempt <= max_attempts )); do
    rm -f "${output}.tmp"

    if $CMD_PLAY \
        "$CREDS_FILE" "$track_id" |
      pv \
        --size "$size" \
        --rate-limit $OPT_DOWLOAD_RATE |
      python3 \
        $PROGDIR/lib/stream-idle-detect.py \
      > "${output}.tmp"; then

      mv "${output}.tmp" "$output"
      sleep $((RANDOM % 3 + 2))
      return

    else
      if (( attempt < max_attempts )); then
        echo "FAILED: Trying again soon"
        sleep "$delay"
        delay=$((delay * 2))
      fi
      ((attempt++))
    fi
  done

  die "Failed after $max_attempts attempts"
}

track_convert_to_flac () {
  local album_id=$1
  local file=$2

  local input="$WORK/$album_id/$file.pcm"
  local output="$WORK/$album_id/$file.flac"

  [[ -e "$input" ]] || die "$input does not exist"

  flac \
    --force-raw-format \
    --endian=little \
    --sign=signed \
    --sample-rate=44100 \
    --bps=16 \
    --channels=2 \
    -o "$output" \
    "$input" 

  rm "$input"
}

track_cover_art () {
  local album_id=$1
  local artwork=$2
  local art_type=$3

  [[ -n "$art_type" ]] || die 'art_type missing from metadata'
  [[ -n "$artwork" ]] || die 'artwork missing from metadata'

  local output="$WORK/$album_id/cover.$art_type"

  [[ ! -s "$output" ]] || return 0

  local url="$JONOS_URL/art/$artwork"

  curl --silent "$url" > "$output"
}
