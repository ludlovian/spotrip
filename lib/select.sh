#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

select_album () {
  local id artist title dest
  dlg_select_album id artist title
  [[ -n "$id" ]] || exit 0

  dlg_album_dest "$artist" "$title" dest
  [[ -n "$dest" ]] || exit 0

  dialog --clear

  queue_add "album" "$id" "$dest"
}

dlg_select_album () {
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

dlg_album_dest () {
  local artist=$1
  local title=$2
  local -n _out_dest=$3

  artist="${artist// /-}"
  artist="${artist//[^A-Za-z0-9-]/}"

  title="${title// /-}"
  title="${title//[^A-Za-z0-9-]/}"

  local _text="$artist/$title"

  exec 3>&1
  _text=$(
    dialog \
      --title "Spotrip" \
      --inputbox "Enter the destination" \
      0 0 \
      "$_text" \
      2>&1 >&3 || true
  )
  exec 3>&-

  if [[ -n "$_text" ]]; then
    _out_dest=$_text
  else
    _out_dest=
    dialog --clear
  fi
}
