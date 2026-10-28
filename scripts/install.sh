#!/bin/bash
# CodeDeploy runs non-interactive shells; ~/.bashrc is not loaded, so nvm's npm is missing from PATH.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd /home/ubuntu/easylink-solar/web
# Reinstall only when dependencies changed: `npm ci` deletes node_modules,
# which the running site still uses while the new build is made.
LOCK_SHA=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ -d node_modules ] && [ "$(cat node_modules/.lock-sha 2>/dev/null)" = "$LOCK_SHA" ]; then
  echo "Dependencies unchanged — keeping node_modules."
  exit 0
fi
if ! npm ci; then
  echo "npm ci failed; falling back to npm install to resync node_modules"
  npm install
fi
echo "$LOCK_SHA" > node_modules/.lock-sha
