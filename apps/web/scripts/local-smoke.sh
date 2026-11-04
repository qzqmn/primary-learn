#!/usr/bin/env bash
# 用「與 Docker 鏡像相同的目錄結構」啟動已建置好的 standalone 伺服器，再跑端到端煙霧測試。
# 用法：先 npm run build，然後 npm run smoke
set -euo pipefail
cd "$(dirname "$0")/.."
CONTENT="$(cd ../../content && pwd)"
[ -d .next/standalone ] || { echo "請先執行 npm run build"; exit 1; }

STAGE=$(mktemp -d)
DATA=$(mktemp -d)
PORT=${SMOKE_PORT:-$((20000 + RANDOM % 20000))}
TOKEN="SMOKE-$RANDOM"
cleanup() { [ -n "${PID:-}" ] && kill "$PID" 2>/dev/null || true; rm -rf "$STAGE" "$DATA"; }
trap cleanup EXIT

cp -r .next/standalone/. "$STAGE/"
mkdir -p "$STAGE/.next" && cp -r .next/static "$STAGE/.next/static"
[ -d public ] && cp -r public "$STAGE/public"
cp -r drizzle "$STAGE/drizzle"
mkdir -p "$STAGE/scripts" && cp scripts/cli.mjs "$STAGE/scripts/cli.mjs"

(cd "$STAGE" && DATA_DIR="$DATA" CONTENT_DIR="$CONTENT" SETUP_TOKEN="$TOKEN" PORT="$PORT" HOSTNAME=127.0.0.1 NODE_ENV=production node server.js >"$STAGE/server.log" 2>&1) &
PID=$!
for _ in $(seq 1 40); do curl -sf "http://127.0.0.1:$PORT/api/healthz" >/dev/null && break; sleep 0.5; done
curl -sf "http://127.0.0.1:$PORT/api/healthz" >/dev/null || { echo "伺服器沒有啟動："; cat "$STAGE/server.log"; exit 1; }

BASE_URL="http://127.0.0.1:$PORT" SETUP_TOKEN="$TOKEN" DATA_DIR="$DATA" node scripts/smoke.mjs
RC=$?
if grep -q "⨯" "$STAGE/server.log"; then echo "伺服器日誌有錯誤："; grep -A3 "⨯" "$STAGE/server.log" | head -20; RC=1; fi

# 順便驗證維護工具（容器內 `cli reset-admin` 就是這支）
echo; echo "# 維護工具"
(cd "$STAGE" && DATA_DIR="$DATA" node scripts/cli.mjs list-admins) | grep -q boss && echo "  ✓ cli list-admins" || { echo "  ✗ cli list-admins"; RC=1; }
OUT=$(cd "$STAGE" && DATA_DIR="$DATA" node scripts/cli.mjs reset-admin boss 2>&1) && echo "  ✓ cli reset-admin 產生臨時密碼" || { echo "  ✗ cli reset-admin: $OUT"; RC=1; }
exit $RC
