#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

select_spotify_album () {
  local -n _out_id=$1
  local -n _out_artist=$2
  local -n _out_title=$3

  local -a id_list artist_list title_list
  sql_spotify_albums id_list artist_list title_list

  local -a menu_list
  local i entry
  for i in "${!id_list[@]}"; do
    entry="${artist_list[$i]} / ${title_list[$i]}"
    menu_list+=("$i" "$entry")
  done

  exec 3>&1
  i=$(
    dialog \
      --title "Spotrip" \
      --menu "Select an album to rip" \
      0 0 0 \
      "${menu_list[@]}" \
      2>&1 >&3 || true
  )
  exec 3>&-

  if [[ -n "$i" ]]; then
    _out_id=${id_list[$i]}
    _out_artist=${artist_list[$i]}
    _out_title=${title_list[$i]}
  else
    _out_id=
    dialog --clear
  fi
}
