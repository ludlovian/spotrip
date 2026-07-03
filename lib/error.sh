#!/bin/bash
# vim: ft=sh ts=2 sts=2 sw=2 et

on_error () {
  local exit_code=$?

  echo "========================================="
  echo "  ERROR: Script failed with exit code $exit_code"
  echo "========================================="
  echo "Stack trace (most recent call first):"

  for ((i=1; i<${#FUNCNAME[@]}; i++)); do
      local func="${FUNCNAME[$i]}"
      local file="${BASH_SOURCE[$i]}"
      local line="${BASH_LINENO[$((i-1))]}"

      if [ -z "$func" ] || [ "$func" == "main" ]; then
          func="main script body"
      fi

      echo "  -> in $func() at $file, line $line"
  done
  echo "========================================="
}

trap 'on_error' ERR
