#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

main () {
  local id artist title dest

  if [[ ! -f $PROGDIR/current.job ]]; then 
    select_spotify_album id artist title
    [[ -n "$id" ]] || exit

    get_dest "$artist" "$title" dest
    [[ -n "$dest" ]] || exit

    dialog --clear

    printf 'migrate_album %q %q\n' \
      "$id" "$dest" \
      > $PROGDIR/current.job
  else
    echo 'Resuming task'
  fi

  source $PROGDIR/current.job

  rm $PROGDIR/current.job
}
