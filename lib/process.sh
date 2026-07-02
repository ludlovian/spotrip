#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

# The routines to process the queue
#

process_main () {
  if (( $# > 0 )); then
    process_command "$@"
  elif [[ ! -s "$QUEUE" ]]; then
    process_command select
  else
    process_queue
  fi
}

process_queue () {
  local cmdline
  queue_get cmdline

  while [[ -n "$cmdline" ]]; do
    eval "set -- $cmdline"
    process_command "$@"
    queue_complete
    queue_get cmdline
  done
}

process_command () {
  local cmd=$1
  shift

  case "$cmd" in
    select)
      select_album;;
    album)
      album_analyse "$@";;
    track)
      track_rip "$@";;
    tag)
      album_tag "$@";;
    publish)
      album_publish "$@";;
    *)
      die "Unknown command $cmd $@";;
  esac
}
