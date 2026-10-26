#!/usr/bin/env bash
# Publishes the game portal to https://billthedevstudio.io.vn (everything outside /slam-cards/).
# Builds ./site, uploads it next to the live copy and swaps the folders in one move, then installs
# the nginx site from proto/deploy (same script the game's deploy uses: backup, nginx -t, rollback,
# graceful reload). Never touches the game process.
#   bash portal/deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

VPS="${VPS:-root@14.225.255.73}"
LIVE=/var/www/billthedevstudio-portal

node build.mjs
tar -C site -czf - . | ssh "$VPS" "rm -rf $LIVE.new && mkdir -p $LIVE.new && tar -C $LIVE.new -xzf - && chmod -R a+rX $LIVE.new"
ssh "$VPS" "rm -rf $LIVE.old; [ -d $LIVE ] && mv $LIVE $LIVE.old; mv $LIVE.new $LIVE"

tar -C ../proto/deploy -czf - nginx-install.sh nginx-slam-domain.conf nginx-slam-ip.conf \
  | ssh "$VPS" "rm -rf /tmp/portal-nginx && mkdir -p /tmp/portal-nginx && tar -C /tmp/portal-nginx -xzf - && bash /tmp/portal-nginx/nginx-install.sh"

for path in / /en/ /privacy/ /ads.txt /games.json /slam-cards/; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "https://billthedevstudio.io.vn$path")" "$path"
done
