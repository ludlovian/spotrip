#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

migrate_album () {
  local album_id=$1
  local dest=$2
  local artist title
  local -a tracks

  sql_album_metadata "$1" artist title tracks

  print_banner \
    "Artist: ${CYAN}${artist}${RESET}" \
    "Title:  ${CYAN}${title}${RESET}"

  capture_album_tracks "$album_id" tracks

  print_banner \
    "Artist: ${CYAN}${artist}${RESET}" \
    "Title:  ${CYAN}${title}${RESET}" \
    "        ${RED}Tagging tracks${RESET}"

  tag_album "$album_id" tracks
  calc_replay_gain

  print_banner \
    "Artist: ${CYAN}${artist}${RESET}" \
    "Title:  ${CYAN}${title}${RESET}" \
    "        ${RED}Copying to ${dest}...${RESET}"

  copy_to_dest "$dest"

  print_banner \
    "Artist: ${CYAN}${artist}${RESET}" \
    "Title:  ${CYAN}${title}${RESET}" \
    "        ${GREEN}Complete${RESET}"
}
