#!/bin/sh
# Startet einen lokalen Server und führt alle Browser-Tests aus (Playwright + Software-WebGL).
# Aufruf aus dem Repo-Ordner:  sh tests/run-all.sh
cd "$(dirname "$0")/.." || exit 1
OUT="${TMPDIR:-/tmp}/aschenfall-tests"; mkdir -p "$OUT"
python3 -m http.server 8123 >/dev/null 2>&1 &
SRV=$!
sleep 1
export NODE_PATH="$(npm root -g)"
fail=0
for t in tests/*.js; do
  name=$(basename "$t" .js)
  out=$(node "$t" "$OUT" 2>&1)
  if echo "$out" | grep -qE 'PAGEERR|Error:|ERRORS \["|ERR \["|TimeoutError'; then
    echo "FEHLER  $name"; echo "$out" | tail -6; fail=1
  else
    echo "ok      $name"
  fi
done
kill $SRV 2>/dev/null
[ $fail -eq 0 ] && echo "Alle Tests bestanden." || echo "Es gibt Fehler."
exit $fail
