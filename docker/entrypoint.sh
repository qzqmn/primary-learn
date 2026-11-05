#!/bin/sh
# 容器入口：先確保資料目錄可寫，再降權成 node（uid 1000）執行程式。
#
# 為甚麼需要：/data 掛載進來之後，擁有者常常是 root（bind mount、NAS、rootless Docker、
# 以前用 root 建立過的 volume…），而程式以非 root 運行，就會 SQLITE_CANTOPEN。
# 這裡以 root 啟動、修正權限、再降權，所以不論怎樣掛載都能啟動。
set -e

DATA_DIR="${DATA_DIR:-/data}"
APP_UID=1000
APP_GID=1000

fail_hint() {
  echo "============================================================" >&2
  echo " 錯誤：資料目錄 $DATA_DIR 無法寫入（目前用戶 uid=$(id -u)）" >&2
  echo " 請讓 uid $APP_UID 擁有該目錄，例如在宿主機執行：" >&2
  echo "   chown -R $APP_UID:$APP_GID <你掛載到 $DATA_DIR 的資料夾>" >&2
  echo " 或用 root 啟動容器（不要設定 user:），本入口會自動修正權限。" >&2
  echo "============================================================" >&2
  exit 1
}

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR"
  # 只有在有檔案／目錄不屬於 node 時才修正（正常啟動時很快就結束）
  if [ -n "$(find "$DATA_DIR" \( ! -uid "$APP_UID" -o ! -gid "$APP_GID" \) -print -quit 2>/dev/null)" ]; then
    echo "[entrypoint] 修正 $DATA_DIR 的擁有者 → $APP_UID:$APP_GID"
    chown -R "$APP_UID:$APP_GID" "$DATA_DIR" || echo "[entrypoint] 警告：chown 失敗（NFS／root squash 或權限不足？）" >&2
  fi
  export HOME=/home/node
  # 降權需要 SETUID／SETGID 能力。compose 若有 cap_drop: ALL 卻沒有 cap_add，就會沒有這些能力：
  # 這時不要直接失敗，改為警告並以目前用戶運行（資料目錄屬於 root 時仍可寫）。
  if setpriv --reuid="$APP_UID" --regid="$APP_GID" --init-groups true 2>/dev/null; then
    exec setpriv --reuid="$APP_UID" --regid="$APP_GID" --init-groups "$@"
  fi
  echo "[entrypoint] 警告：沒有 SETUID／SETGID 能力，無法降權，將以 root 運行程式。" >&2
  echo "[entrypoint] 建議在 compose 的 app 服務加上：cap_add: [CHOWN, DAC_OVERRIDE, SETUID, SETGID]（見 deploy/docker-compose.yml）" >&2
  exec "$@"
fi

# 已經是非 root（例如 docker run --user 1000:1000）：不能修正權限，只能檢查
[ -w "$DATA_DIR" ] || fail_hint
exec "$@"
