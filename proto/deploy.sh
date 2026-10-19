#!/usr/bin/env bash
# Build the client and push client + server to the VPS (ssh host "hordecall", or SLAM_HOST=user@host).
# Served at https://billthedevstudio.io.vn/slam-cards/ by nginx -> node on 127.0.0.1:8097 (pm2 app "slam-cards").
set -euo pipefail
cd "$(dirname "$0")"

npx vite build
# all of src: the server imports shared modules from it (rules, config, catalog, ads, tutorial...),
# and a list kept by hand here once missed a new one
tar czf /tmp/slam.tgz dist server deploy src
HOST="${SLAM_HOST:-hordecall}"

# Stop new matches and wait for the ones in play to finish (server/ops.js, loopback port 8197).
# Players see a banner meanwhile. A server from before the admin port is not waited for.
ssh "$HOST" DRAIN_MIN="${SLAM_DRAIN_MINUTES:-3}" bash -s <<'DRAIN'
ops=http://127.0.0.1:8197
curl -fsS -X POST "$ops/drain?minutes=$DRAIN_MIN" >/dev/null || { echo "no admin port (older server): not waiting"; exit 0; }
for _ in $(seq 180); do
  playing=$(curl -fsS "$ops/status" | grep -o '"playing":[0-9]*' | cut -d: -f2)
  [ "$playing" = 0 ] && { echo "no match in play"; exit 0; }
  echo "waiting: $playing match(es) in play"
  sleep 5
done
curl -fsS -X POST "$ops/undrain" >/dev/null
echo "matches still in play after 15 min: drain cancelled, deploy stopped" >&2
exit 1
DRAIN

scp /tmp/slam.tgz "$HOST":/tmp/slam.tgz
# nginx first (deploy/nginx-install.sh: only when the sites changed, rolled back if the check fails),
# so a bad nginx file stops the deploy before the running game is touched
ssh "$HOST" 'set -e; rm -rf /tmp/slam-new && mkdir /tmp/slam-new && tar xzf /tmp/slam.tgz -C /tmp/slam-new && rm /tmp/slam.tgz
  bash /tmp/slam-new/deploy/nginx-install.sh
  cd /opt/slam-cards && rm -rf dist server src deploy && cp -a /tmp/slam-new/. . && rm -rf /tmp/slam-new
  pm2 restart slam-cards --update-env'
rm /tmp/slam.tgz
echo "Deployed: https://billthedevstudio.io.vn/slam-cards/"
