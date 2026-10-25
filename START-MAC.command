#!/bin/bash
cd "$(dirname "$0")" || exit 1
echo "=========================================="
echo "  Z&Z  Luxury Bridals - starting up..."
echo "=========================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[!] Node.js not found. Install it once from https://nodejs.org (LTS) and run this file again."
  read -r -p "Press Enter to close."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[1/2] First run - installing the two small packages used by the site..."
  npm install --no-audit --no-fund
  echo
fi

echo "[2/2] Starting the website..."
( sleep 2; open "http://localhost:3000" ) &
node server.js

echo
read -r -p "Server stopped. Press Enter to close."
