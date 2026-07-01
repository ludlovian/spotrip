#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

declare -gA ALBUM_METADATA_CACHE

sql_album_metadata () {
  local album_id=$1
  local -n _out_artist=$2
  local -n _out_title=$3
  local -n _out_tracks=$4

  local data sql parms
  if [[ -n "${ALBUM_METADATA_CACHE[$album_id]-}" ]]; then
    data="${ALBUM_METADATA_CACHE[$album_id]}"
  else
    parms="[\"$album_id\"]"
    sql="
      select  b.title               as album
            , ifnull(b.artist, '')  as artist
            , jsonb_group_array(
                t.spotify_id
                order by seq)       as tracks

        from  tb_spotify_album            as a
        join  vw_spotify_album_adjusted   as b using (spotify_album_id)
        join  tb_spotify_track            as t using (spotify_album_id)

        where a.spotify_id = ?1"
    data=$(
      $CMD_DBX query \
        jonos-library \
        "$sql" \
        -P "$parms" \
        -f json
    )
    ALBUM_METADATA_CACHE["$album_id"]="$data"
  fi

  unset '_result[@]'

  IFS=$'\t' read -r _out_title _out_artist < <(
    jq -r '.[0] | "\(.album)\t\(.artist)"' <<< "$data"
  )
  readarray -t _out_tracks < <(
    jq -r '.[0].tracks[]' <<< "$data"
  )
}

