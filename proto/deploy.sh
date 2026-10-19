#!/usr/bin/env bash
# Build the client and push client + server to the VPS (ssh host "hordecall", or SLAM_HOST=user@host).
# Served at https://billthedevstudio.io.vn/slam-cards/ by nginx -> node on 127.0.0.1:8097 (pm2 app "slam-cards").
set -euo pipefail
cd "$(dirname "$0")"

npx vite build
tar czf /tmp/slam.tgz dist server deploy src/rules.js src/config.js src/catalog.js src/ads.js
HOST="${SLAM_HOST:-hordecall}"
scp /tmp/slam.tgz "$HOST":/tmp/slam.tgz
# nginx first (deploy/nginx-install.sh: only when the sites changed, rolled back if the check fails),
# so a bad nginx file stops the deploy before the running game is touched
ssh "$HOST" 'set -e; rm -rf /tmp/slam-new && mkdir /tmp/slam-new && tar xzf /tmp/slam.tgz -C /tmp/slam-new && rm /tmp/slam.tgz
  bash /tmp/slam-new/deploy/nginx-install.sh
  cd /opt/slam-cards && rm -rf dist server src deploy && cp -a /tmp/slam-new/. . && rm -rf /tmp/slam-new
  pm2 restart slam-cards --update-env'
rm /tmp/slam.tgz
echo "Deployed: https://billthedevstudio.io.vn/slam-cards/"
