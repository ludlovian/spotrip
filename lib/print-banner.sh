#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

print_banner () {
  local cols=$(tput cols)
  local dash_line
  printf -v dash_line '%*s' $((cols - 1)) '' && dash_line="${dash_line// /-}"
  echo "$dash_line"
  for line in "$@";do
    echo "$line"
  done
  echo "$dash_line"
}
