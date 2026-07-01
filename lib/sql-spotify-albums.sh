#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

sql_spotify_albums () {
  local -n _out_id_list=$1
  local -n _out_artist_list=$2
  local -n _out_title_list=$3

  local data sql
  sql="
    select  a.spotify_id                    as id
          , ifnull(b.artist, 'Unknown')     as artist
          , ifnull(b.title, 'Unknown')      as title

      from  tb_spotify_album                as a
      join  vw_spotify_album_adjusted       as b using (spotify_album_id)

    order by 2, 3"

  data=$(
    $CMD_DBX query \
      jonos-library \
      "$sql" \
      -f json
  )

  _out_id_list=()
  _out_artist_list=()
  _out_title_list=()

  local id artist title idx=0

  while read -r id && read -r artist && read -r title; do
    _out_id_list[$idx]="$id"
    _out_artist_list[$idx]="$artist"
    _out_title_list[$idx]="$title"
    ((idx++)) || true
  done < <(
    jq -r '.[] | (.id, .artist, .title)' <<< "$data"
  )
}
