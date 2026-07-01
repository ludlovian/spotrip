#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

# Applies album level replay gain
#

calc_replay_gain () {
  local -a flac_files=("$WORK"/track*.flac)
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
