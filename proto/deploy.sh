#!/usr/bin/env bash
# Build the client and push client + server to the VPS (ssh host "hordecall").
# Served at http://14.225.255.73:8096 by nginx -> node on 127.0.0.1:8097 (pm2 app "slam-cards").
set -euo pipefail
cd "$(dirname "$0")"

npx vite build
tar czf /tmp/slam.tgz dist server src/rules.js src/config.js
scp /tmp/slam.tgz hordecall:/tmp/slam.tgz
ssh hordecall 'cd /opt/slam-cards && rm -rf dist server src && tar xzf /tmp/slam.tgz && rm /tmp/slam.tgz && pm2 restart slam-cards --update-env'
rm /tmp/slam.tgz
echo "Deployed: https://billthedevstudio.io.vn/slam-cards/ (also http://14.225.255.73:8096)"
