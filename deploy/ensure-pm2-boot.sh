#!/usr/bin/env bash
# HTQL_550 — Khôi phục tiến trình PM2 sau reboot nếu dump có sẵn nhưng danh sách trống.
# Chạy tay: bash /opt/htql550/deploy/ensure-pm2-boot.sh
# (Hoặc đặt trong cron @reboot sau khi đã chạy đúng lệnh sudo từ `pm2 startup`.)
set -euo pipefail

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[htql-pm2] pm2 không có trong PATH — cài: npm install -g pm2"
  exit 1
fi

if pm2 jlist 2>/dev/null | grep -q 'htql550-api'; then
  echo "[htql-pm2] htql550-api đã có trong PM2."
  exit 0
fi

if [[ -f "${HOME}/.pm2/dump.pm2" ]]; then
  echo "[htql-pm2] pm2 resurrect (từ ~/.pm2/dump.pm2)..."
  pm2 resurrect || true
fi

if pm2 jlist 2>/dev/null | grep -q 'htql550-api'; then
  echo "[htql-pm2] OK — htql550-api đã khởi động."
  exit 0
fi

echo "[htql-pm2] Cảnh báo: chưa thấy htql550-api."
echo "  1) Chạy MỘT LẦN lệnh sudo do \`pm2 startup systemd\` in ra (xem PM2_STARTUP_SUDO_ONCE.txt trong thư mục cài)."
echo "  2) Hoặc: cd /opt/htql550/server && pm2 start ecosystem.config.cjs && pm2 save"
exit 1
