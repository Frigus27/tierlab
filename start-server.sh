#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-4320}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "需要 Python 3 才能启动本地服务器。" >&2
  exit 1
fi

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "端口 $PORT 已被占用。可以换一个端口，例如：" >&2
  echo "  PORT=4321 ./start-server.sh" >&2
  exit 1
fi

echo ""
echo "  TIERLAB · Tier List 生成器"
echo "  ─────────────────────────────"
echo "  http://$HOST:$PORT/"
echo ""
echo "  按 Ctrl+C 停止"
echo ""

exec python3 -m http.server "$PORT" --bind "$HOST" --directory "$ROOT_DIR"
