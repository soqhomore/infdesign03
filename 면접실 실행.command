#!/bin/zsh
cd "${0:A:h}"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js가 필요합니다. https://nodejs.org 에서 설치한 뒤 다시 실행해 주세요."
  read -r
  exit 1
fi
node --env-file-if-exists=.env server.mjs &
room_server_pid=$!
trap 'kill "$room_server_pid" 2>/dev/null' EXIT
sleep 1
open http://127.0.0.1:4173
wait "$room_server_pid"
