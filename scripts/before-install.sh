#!/bin/bash
set -euo pipefail
# Runs as root (no runas). The running site's build (.next) is kept — it keeps
# serving until start.sh swaps in the new one. Only leftovers of an
# interrupted build are removed. (The deploy bundle never contains .next, so
# stale chunks can't collide with it.)
TARGET="/home/ubuntu/easylink-solar/web"
rm -rf "$TARGET/.next-new" "$TARGET/.next-old"
