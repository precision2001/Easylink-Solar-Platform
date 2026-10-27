#!/bin/bash
# CodeDeploy ApplicationStart: rebuild with the server's .env, then (re)start.
#
# The build goes into a separate folder (.next-new) and is only swapped in
# once it has finished — a failed or killed build (e.g. out of memory on the
# t3.small) never leaves the site without a working build. On failure the
# existing build is started instead and the hook exits non-zero, so the
# deployment shows as failed rather than silently serving a 502.
set -uo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd /home/ubuntu/easylink-solar/web

BUILD_OK=0
rm -rf .next-new
if NEXT_DIST_DIR=.next-new NODE_OPTIONS="--max-old-space-size=1536" npm run build \
  && [ -f .next-new/BUILD_ID ]; then
  rm -rf .next-old
  if [ -d .next ]; then mv .next .next-old; fi
  mv .next-new .next
  rm -rf .next-old
  BUILD_OK=1
  echo "Build succeeded — switched to the new build."
else
  rm -rf .next-new
  echo "Build FAILED — keeping the existing build in .next." >&2
fi

if [ ! -f .next/BUILD_ID ]; then
  echo "No usable build in .next — cannot start the site." >&2
  exit 1
fi

pm2 delete easylink-solar || true
pm2 start npm --name "easylink-solar" -- start
pm2 save

if [ "$BUILD_OK" -ne 1 ]; then
  exit 1
fi
