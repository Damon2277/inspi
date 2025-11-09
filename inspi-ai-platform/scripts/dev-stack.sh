#!/usr/bin/env bash

set -euo pipefail

COMPOSE_FILE="docker-compose.dev.yml"

function usage() {
  cat <<'EOF'
用法：scripts/dev-stack.sh [start|stop|logs]

start  启动 Mongo + 前端，自动跟踪日志
stop   停止并清理容器
logs   查看运行中服务的日志
EOF
}

cmd=${1:-}

case "$cmd" in
  start)
    docker compose -f "$COMPOSE_FILE" up --build
    ;;
  stop)
    docker compose -f "$COMPOSE_FILE" down
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f
    ;;
  *)
    usage
    exit 1
    ;;
esac
