#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

declare -gA TRACK_METADATA_CACHE

sql_track_metadata () {
  local track_id=$1
  local -n _result=$2

  local data sql parms

  if [[ -n "${TRACK_METADATA_CACHE[$track_id]-}" ]]; then
    data="${TRACK_METADATA_CACHE[$track_id]}"
  else
    parms="[\"$track_id\"]"
    sql="
      select  t.spotify_id                      as track_id
            , b.title                           as album
            , ifnull(b.genre, 'Classical')      as genre
            , ifnull(b.artist, '')              as album_artist
            , a.spotify_id                      as album_id
            , u.title                           as title
            , u.artist                          as artist
            , ifnull(t.disc_number, 0)          as disc_number
            , ifnull(t.track_number, t.seq)     as track_number
            , printf(
                'track%d%03d'
              , ifnull(t.disc_number, 0)
              , ifnull(t.track_number, t.seq)
              )                                 as file
            , t.duration_ms                     as duration_ms
            , round(t.duration_ms * 44.1 * 4)   as pcm_bytes
            , case r.mime_type
                when 'image/png' then 'png'
                else                  'jpg'
              end                               as art_type
            , t.artwork_id                      as artwork
            , ( select count(*)
                  from tb_spotify_track as aa
                where aa.spotify_album_id
                        = t.spotify_album_id )  as num_tracks
            , t.seq                             as seq

        from  tb_spotify_track            as t
        join  vw_spotify_track_adjusted   as u using (spotify_track_id)
        join  tb_spotify_album            as a using (spotify_album_id)
        join  vw_spotify_album_adjusted   as b using (spotify_album_id)
        join  tb_artwork                  as r on r.artwork_id = t.artwork_id

        where t.spotify_id = ?1"
    data=$(
      $CMD_DBX query \
        jonos-library \
        "$sql" \
        -P "$parms" \
        -f json
    )
    TRACK_METADATA_CACHE["$track_id"]="$data"
  fi

  unset '_result[@]'

  while IFS='=' read -r key value; do
    _result["$key"]="$value"
  done < <(
    jq -r '.[0] | to_entries[] | "\(.key)=\(.value)"' <<< "$data"
  )
}

