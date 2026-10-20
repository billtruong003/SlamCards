#!/usr/bin/env bash
# Sends new "Báo lỗi" and player reports (server/reports.js: data/reports/<day>.jsonl, one report a line) to
# Bill on Telegram, through lucy-bridge's bot and proxy, the way vps-diskguard does. Every 5
# minutes by cron (/etc/cron.d/slam-report-notify, written by deploy.sh). Remembers how many lines
# of each day file it has sent; only complete lines (a report being written now waits for the next
# run); at most 10 a run.
set -uo pipefail
DIR=/opt/slam-cards/data/reports
MARK=/var/lib/slam-report-notify
ENV=/root/lucy/bridge/.env
LOG=/root/lucy/vps-maintenance.log
MAX=10

log() { echo "$(date '+%F %T') [slam-report] $*" >> "$LOG"; }
env_val() { grep -m1 "^$1=" "$ENV" | sed -E "s/^[^=]+=//; s/\r$//; s/^[\"']//; s/[\"']$//"; }

# one report line → the Telegram message
format() {
  python3 -c '
import json, sys
r = json.loads(sys.stdin.read())
at = r.get("at", "")[:16].replace("T", " ") + " UTC"
if r.get("type") == "player":
    who = r.get("reported", "") + (" (bot)" if r.get("bot") else "")
    note = "\n" + r["text"] if r.get("text") else ""
    chat = "\n\nChat gần nhất:\n" + "\n".join("· " + c for c in r["chat"]) if r.get("chat") else ""
    print(("Báo cáo người chơi Dép Lào · " + at + "\n\n" + who + " · " + r.get("reason", "") + note + "\n\nphòng " + str(r.get("room", "")) + " · " + str(r.get("kind", "")) + chat)[:3500])
    sys.exit()
head = "Báo lỗi Dép Lào · " + at
where = " · ".join(x for x in [r.get("phase"), "phòng " + r["room"] if r.get("room") else "", r.get("lang"), r.get("screen"), "build " + r["build"] if r.get("build") else ""] if x)
errors = "\nLỗi trang: " + " | ".join(r["errors"]) if r.get("errors") else ""
print((head + "\n\n" + r.get("text", "") + "\n\n" + where + "\n" + r.get("ua", "") + errors)[:3500])
'
}

[ -d "$DIR" ] || exit 0
[ -r "$ENV" ] || { log "cannot read $ENV"; exit 1; }
token=$(env_val TELEGRAM_BOT_TOKEN)
chat=$(env_val LUCY_ALLOWED_USER_ID)
proxy=$(env_val LUCY_TG_PROXY)
[ -n "$token" ] && [ -n "$chat" ] || { log "Telegram token or chat id missing"; exit 1; }
mkdir -p "$MARK"

sent=0
for file in "$DIR"/*.jsonl; do
  [ -e "$file" ] || continue
  name=$(basename "$file")
  done_lines=$(cat "$MARK/$name" 2>/dev/null || echo 0)
  complete=$(wc -l < "$file") # newline-terminated lines only
  while [ "$done_lines" -lt "$complete" ] && [ "$sent" -lt "$MAX" ]; do
    n=$((done_lines + 1))
    if text=$(sed -n "${n}p" "$file" | format); then
      curl -fsS -m 20 ${proxy:+-x "$proxy"} "https://api.telegram.org/bot${token}/sendMessage" \
        --data-urlencode "chat_id=${chat}" --data-urlencode "text=${text}" >/dev/null 2>&1 \
        || { log "Telegram send failed, will retry"; exit 1; }
      sent=$((sent + 1))
    else
      log "$name line $n is not a report, skipped"
    fi
    done_lines=$n
    echo "$done_lines" > "$MARK/$name"
  done
done
[ "$sent" -gt 0 ] && log "sent $sent report(s)"
exit 0
