#!/usr/bin/env bash
# Runs on the VPS from deploy.sh: installs the game's nginx sites from this folder when they differ
# from what is live, checks the whole nginx config, and reloads gracefully (open games keep their
# sockets). A config that fails the check is rolled back and the deploy stops.
set -euo pipefail
cd "$(dirname "$0")"

# live site name -> file in this folder
declare -A SITES=([slam-domain]=nginx-slam-domain.conf [slam-cards]=nginx-slam-ip.conf)
BACKUP="$(mktemp -d)"
changed=()

for site in "${!SITES[@]}"; do
  src="${SITES[$site]}"
  available="/etc/nginx/sites-available/$site"
  enabled="/etc/nginx/sites-enabled/$site"
  cmp -s "$src" "$enabled" && continue
  [ -e "$enabled" ] && cp -P "$enabled" "$BACKUP/$site.enabled"
  [ -e "$available" ] && cp "$available" "$BACKUP/$site.available"
  cp "$src" "$available"
  ln -sfn "$available" "$enabled"
  changed+=("$site")
done

if [ ${#changed[@]} -eq 0 ]; then
  echo "nginx: no change"
  rm -rf "$BACKUP"
  exit 0
fi

if ! nginx -t; then
  echo "nginx: new config failed the check, rolling back ${changed[*]}" >&2
  for site in "${changed[@]}"; do
    rm -f "/etc/nginx/sites-enabled/$site"
    [ -e "$BACKUP/$site.enabled" ] && cp -P "$BACKUP/$site.enabled" "/etc/nginx/sites-enabled/$site"
    [ -e "$BACKUP/$site.available" ] && cp "$BACKUP/$site.available" "/etc/nginx/sites-available/$site"
  done
  nginx -t
  exit 1
fi
systemctl reload nginx
echo "nginx: reloaded with ${changed[*]} (previous files in $BACKUP)"
