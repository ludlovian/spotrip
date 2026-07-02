#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

# Queue handling functions
#

#
# queue_add <cmd> <param> ...
#
# Adds a command to the end of the queue
#

queue_add () {
  local line=$(printf '%q ' "$@")
  printf '%s\n' "${line% }" >> $QUEUE
}


#
# queue_get var
#
# Retrieves the first item in the queue into the named variable
#
# If no item, then the var is cleared
#

queue_get () {
  local -n _queue_line=$1

  _queue_line=
  [[ -s "$QUEUE" ]] || return 0

  _queue_line=$(head -n 1 "$QUEUE")
}


#
# queue_conplete
#
# Removes the first item from the queue as is it now complete
#
# Removes the queue file if it is empty
#
queue_complete () {
  [[ -s "$QUEUE" ]] || return 0
  tail -n +2 "$QUEUE" > "${QUEUE}.tmp" && mv "${QUEUE}.tmp" "$QUEUE"

  [[ ! -s "$QUEUE" ]] || return 0
  rm -f "$QUEUE"
}
