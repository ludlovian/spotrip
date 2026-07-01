#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

main () {
  local id artist title dest

  select_spotify_album id artist title
  [[ -n "$id" ]] || exit

  get_dest "$artist" "$title" dest
  [[ -n "$dest" ]] || exit

  dialog --clear

  migrate_album "$id" "$dest"
}
