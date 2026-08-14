#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="packflow"
HOST="${PACKFLOW_HOST:-127.0.0.1}"
PORT="${PACKFLOW_PORT:-8080}"
PID_FILE="${SCRIPT_DIR}/.${APP_NAME}.pid"
LOG_FILE="${SCRIPT_DIR}/.${APP_NAME}.log"

usage() {
  cat <<EOF
用法：$(basename "$0") {start|stop|restart|status}

命令：
  start    本地启动静态页面
  stop     停止本地服务
  restart  重启本地服务
  status   查看本地服务状态

默认访问地址：http://${HOST}:${PORT}
可通过 PACKFLOW_PORT=9000 $(basename "$0") start 修改端口。
EOF
}

read_pid() {
  if [[ -f "${PID_FILE}" ]]; then
    tr -d '[:space:]' < "${PID_FILE}"
  fi
}

is_running() {
  local pid="${1:-}"
  [[ "${pid}" =~ ^[0-9]+$ ]] || return 1
  kill -0 "${pid}" 2>/dev/null
}

status() {
  local pid
  pid="$(read_pid || true)"
  if is_running "${pid}"; then
    echo "${APP_NAME} 正在运行（PID: ${pid}）"
    echo "访问地址：http://${HOST}:${PORT}"
    echo "日志文件：${LOG_FILE}"
    return 0
  fi

  [[ -f "${PID_FILE}" ]] && rm -f "${PID_FILE}"
  echo "${APP_NAME} 未运行"
  return 1
}

start() {
  local pid
  pid="$(read_pid || true)"
  if is_running "${pid}"; then
    echo "${APP_NAME} 已在运行（PID: ${pid}）"
    echo "访问地址：http://${HOST}:${PORT}"
    return 0
  fi

  command -v python3 >/dev/null 2>&1 || {
    echo "错误：本地启动需要 python3。" >&2
    exit 1
  }

  rm -f "${PID_FILE}"
  : > "${LOG_FILE}"
  (
    cd "${SCRIPT_DIR}"
    exec python3 -m http.server "${PORT}" --bind "${HOST}"
  ) >>"${LOG_FILE}" 2>&1 &
  echo $! > "${PID_FILE}"

  sleep 0.2
  if ! is_running "$(read_pid)"; then
    echo "启动失败，请查看 ${LOG_FILE}" >&2
    rm -f "${PID_FILE}"
    exit 1
  fi

  echo "${APP_NAME} 已启动（PID: $(read_pid)）"
  echo "访问地址：http://${HOST}:${PORT}"
}

stop() {
  local pid
  pid="$(read_pid || true)"
  if ! is_running "${pid}"; then
    rm -f "${PID_FILE}"
    echo "${APP_NAME} 未运行"
    return 0
  fi

  kill "${pid}"
  for _ in {1..20}; do
    is_running "${pid}" || break
    sleep 0.1
  done

  if is_running "${pid}"; then
    echo "停止失败，进程仍在运行（PID: ${pid}）" >&2
    exit 1
  fi

  rm -f "${PID_FILE}"
  echo "${APP_NAME} 已停止"
}

COMMAND="${1:-}"
case "${COMMAND}" in
  ""|help|-h|--help)
    usage
    ;;
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    stop
    start
    ;;
  status)
    status
    ;;
  *)
    usage
    exit 1
    ;;
esac
