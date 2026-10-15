#!/bin/sh
# Every check, one at a time (parallel browsers overload the laptop). Needs the game server on :8097.
# sh qa/run-all.sh > qa/out/run-all.log
cd "$(dirname "$0")/.."
(cd proto && npm test 2>&1 | grep -E "^# (pass|fail)")
for f in m6-full phase1-checks m2-ui m3-ui live-match ux06-check lang-picker ftue-art; do
  echo "== $f: $(timeout 900 node qa/$f.mjs 2>&1 | grep -E 'FAIL' | head -5 | tr '\n' ' ')"
done
for L in vi-VN en-US zh-CN zh-TW id-ID th-TH pt-BR es-ES ja-JP ko-KR; do
  echo "== devices $L: $(SLAM_LANG=$L timeout 600 node qa/devices.mjs 2>&1 | grep -E 'findings' | grep -vE ' 0 findings, 0 errors' | tr '\n' ' ')"
done
echo "== perf"; timeout 900 node qa/perf.mjs 2>&1 | grep -E "^==|mySlam"
echo "== DONE"
