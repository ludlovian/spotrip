#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

get_dest () {
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
