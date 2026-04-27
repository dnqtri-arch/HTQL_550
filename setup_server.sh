#!/usr/bin/env bash
# HTQL_550 — Cài đặt server (Ubuntu). Phiên bản gói: xem VERSION.txt
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

htql_log() {
  echo "[$(date -Is 2>/dev/null || date)] $*"
}

htql_prepare_apt_network_defaults() {
  # Giảm lỗi apt treo 0% [Waiting for headers] do route IPv6/mirror chập chờn.
  sudo mkdir -p /etc/apt/apt.conf.d
  sudo tee /etc/apt/apt.conf.d/99htql-network >/dev/null <<'APTCONF'
Acquire::Retries "3";
Acquire::http::Timeout "20";
Acquire::https::Timeout "20";
Acquire::ForceIPv4 "true";
APTCONF
}

htql_apt_update_with_retry() {
  local attempts=3
  local n=1
  while (( n <= attempts )); do
    if sudo apt-get update -y; then
      return 0
    fi
    htql_log "apt-get update thất bại (lần ${n}/${attempts}). Đợi 5 giây rồi thử lại..."
    sleep 5
    ((n++))
  done
  return 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION_FILE="${SCRIPT_DIR}/VERSION.txt"
HTQL_VER="$(cat "${VERSION_FILE}" 2>/dev/null || echo 'unknown')"

echo "=========================================="
echo " HTQL_550 Server — bản ${HTQL_VER}"
echo "=========================================="

if [[ "${EUID}" -eq 0 ]]; then
  echo "Không chạy trực tiếp bằng root. Dùng user có sudo."
  exit 1
fi

# --- Chế độ không tương tác (HTQL Control Center: HTQL_SETUP_NONINTERACTIVE=1) ---
DEFAULT_ROOT="/opt/htql550"
# Hai đường dẫn đầy đủ (API: HTQL_PATH_THIET_KE / HTQL_PATH_HOADON_CHUNG_TU). Mặc định cài đặt:
DEFAULT_THIETKE="/ssd_2tb/htql_550/thietke"
DEFAULT_HDCT="/ssd_2tb/htql_550/hdct"
DEFAULT_BACKUP="/hdd_4tb/htql_550"

PG_DB_NAME="${HTQL_SETUP_DB_NAME:-htql_550}"
PG_DB_USER="${HTQL_SETUP_DB_USER:-htql550}"
if [[ ! "${PG_DB_NAME}" =~ ^[a-zA-Z][a-zA-Z0-9_]*$ ]] || [[ ! "${PG_DB_USER}" =~ ^[a-zA-Z][a-zA-Z0-9_]*$ ]]; then
  echo "Lỗi: Tên database chỉ gồm chữ, số, gạch dưới; bắt đầu bằng chữ."
  exit 1
fi

# --- MySQL (aaPanel / có sẵn) — script KHÔNG cài mariadb-server (tránh xung đột aaPanel) ---
HTQL_MYSQL_DB="${HTQL_SETUP_MYSQL_DATABASE:-${HTQL_MYSQL_DATABASE:-htql_550_db}}"
HTQL_MYSQL_USER_APP="${HTQL_SETUP_MYSQL_USER:-${HTQL_MYSQL_USER:-htql_550}}"
if [[ ! "${HTQL_MYSQL_DB}" =~ ^[a-zA-Z][a-zA-Z0-9_]*$ ]] || [[ ! "${HTQL_MYSQL_USER_APP}" =~ ^[a-zA-Z][a-zA-Z0-9_]*$ ]]; then
  echo "Lỗi: HTQL_MYSQL_DATABASE / HTQL_MYSQL_USER chỉ gồm chữ, số, gạch dưới; bắt đầu bằng chữ."
  exit 1
fi

# Gán đường dẫn thiết kế / chứng từ (Control Center: HTQL_SETUP_ATTACH + PATH_* tùy chọn)
htql_apply_storage_paths() {
  HTQL_DIR_THIETKE="${DEFAULT_THIETKE}"
  HTQL_DIR_HDCT="${DEFAULT_HDCT}"
  [[ -n "${HTQL_SETUP_PATH_THIET_KE:-}" ]] && HTQL_DIR_THIETKE="${HTQL_SETUP_PATH_THIET_KE}"
  [[ -n "${HTQL_SETUP_THIETKE:-}" ]] && HTQL_DIR_THIETKE="${HTQL_SETUP_THIETKE}"
  [[ -n "${HTQL_SETUP_PATH_HOADON_CHUNG_TU:-}" ]] && HTQL_DIR_HDCT="${HTQL_SETUP_PATH_HOADON_CHUNG_TU}"
  [[ -n "${HTQL_SETUP_HDCT:-}" ]] && HTQL_DIR_HDCT="${HTQL_SETUP_HDCT}"

  if [[ -n "${HTQL_SETUP_ATTACH:-}" ]]; then
    _a="${HTQL_SETUP_ATTACH%/}"
    if [[ "${_a}" == */attachments ]]; then _root="$(dirname "${_a}")"; else _root="${_a}"; fi
    if [[ -z "${HTQL_SETUP_PATH_THIET_KE:-}" && -z "${HTQL_SETUP_THIETKE:-}" ]]; then
      HTQL_DIR_THIETKE="${_root}/thietke"
    fi
    if [[ -z "${HTQL_SETUP_PATH_HOADON_CHUNG_TU:-}" && -z "${HTQL_SETUP_HDCT:-}" ]]; then
      HTQL_DIR_HDCT="${_root}/hdct"
    fi
  fi

  HTQL_DIR_THIETKE="${HTQL_DIR_THIETKE%/}"
  HTQL_DIR_HDCT="${HTQL_DIR_HDCT%/}"

  PARENT_TK="$(dirname "${HTQL_DIR_THIETKE}")"
  PARENT_HDCT="$(dirname "${HTQL_DIR_HDCT}")"
  if [[ "${PARENT_TK}" == "${PARENT_HDCT}" ]]; then
    SSD_DEFAULT="${PARENT_TK}"
    SAMBA_SSD_MODE="single"
  else
    SSD_DEFAULT="${PARENT_TK}"
    SAMBA_SSD_MODE="split"
    htql_log "Cảnh báo: thư mục cha của thietke (${PARENT_TK}) khác hdct (${PARENT_HDCT}); HTQL_ROOT_SSD=${SSD_DEFAULT} (cha của thietke). Samba: hai share riêng."
  fi
}

if [[ "${HTQL_SETUP_NONINTERACTIVE:-}" == "1" ]]; then
  HTQL_ROOT="${HTQL_SETUP_ROOT:-$DEFAULT_ROOT}"
  HTQL_BACKUP="${HTQL_SETUP_BACKUP:-$DEFAULT_BACKUP}"
  htql_apply_storage_paths
  PG_PASS_IN="${HTQL_SETUP_PG_PASSWORD:-}"
  INSTALL_NODE="${HTQL_SETUP_INSTALL_NODE:-y}"
  HTQL_MYSQL_PASS="${HTQL_SETUP_MYSQL_PASSWORD:-}"
  if [[ -z "${HTQL_MYSQL_PASS}" ]]; then
    echo "Lỗi: HTQL_SETUP_NONINTERACTIVE=1 yêu cầu HTQL_SETUP_MYSQL_PASSWORD (mật khẩu user MySQL đã tạo trong aaPanel)."
    exit 1
  fi
  echo ""
  echo "→ (HTQL Control) Hệ thống & DB: ${HTQL_ROOT}"
  echo "→ (HTQL Control) Thiết kế (thietke):  ${HTQL_DIR_THIETKE}"
  echo "→ (HTQL Control) Chứng từ (hdct):     ${HTQL_DIR_HDCT}"
  echo "→ (HTQL Control) HTQL_ROOT_SSD (.env): ${SSD_DEFAULT}"
  echo "→ (HTQL Control) Backup HDD:    ${HTQL_BACKUP}"
  echo "→ (HTQL Control) PostgreSQL:     user=${PG_DB_USER}  database=${PG_DB_NAME}"
  echo "→ (HTQL Control) MySQL (aaPanel): database=${HTQL_MYSQL_DB}  user=${HTQL_MYSQL_USER_APP}"
  echo ""
else
  echo ""
  echo "— Thiết lập nơi lưu trữ (có thể Enter để dùng mặc định) —"
  echo ""
  read -r -p "1) Hệ thống + cơ sở dữ liệu (mã API, JSON, database trên máy) [${DEFAULT_ROOT}]: " IN_ROOT
  HTQL_ROOT="${IN_ROOT:-$DEFAULT_ROOT}"

  read -r -p "2a) Thư mục đính kèm thiết kế (thietke) [${DEFAULT_THIETKE}]: " IN_THIETKE
  read -r -p "2b) Thư mục đính kèm chứng từ / hóa đơn (hdct) [${DEFAULT_HDCT}]: " IN_HDCT
  HTQL_DIR_THIETKE="${IN_THIETKE:-$DEFAULT_THIETKE}"
  HTQL_DIR_HDCT="${IN_HDCT:-$DEFAULT_HDCT}"
  HTQL_DIR_THIETKE="${HTQL_DIR_THIETKE%/}"
  HTQL_DIR_HDCT="${HTQL_DIR_HDCT%/}"

  PARENT_TK="$(dirname "${HTQL_DIR_THIETKE}")"
  PARENT_HDCT="$(dirname "${HTQL_DIR_HDCT}")"
  if [[ "${PARENT_TK}" == "${PARENT_HDCT}" ]]; then
    SSD_DEFAULT="${PARENT_TK}"
    SAMBA_SSD_MODE="single"
  else
    SSD_DEFAULT="${PARENT_TK}"
    SAMBA_SSD_MODE="split"
    echo ""
    echo "Lưu ý: thietke và hdct không cùng thư mục cha — Samba sẽ tạo hai share riêng."
  fi

  read -r -p "3) Backup định kỳ (HDD) — 01:00 hàng ngày: DB+dữ liệu giữ 10 bản; đồng bộ đính kèm chỉ file mới/thay đổi [${DEFAULT_BACKUP}]: " IN_BACKUP
  HTQL_BACKUP="${IN_BACKUP:-$DEFAULT_BACKUP}"

  read -r -p "Mật khẩu PostgreSQL user htql550 (để trống = tự sinh): " PG_PASS_IN
  read -r -p "Có cài Node.js 20.x (NodeSource) nếu chưa có? (y/n) [y]: " INSTALL_NODE
  INSTALL_NODE="${INSTALL_NODE:-y}"

  if [[ -n "${HTQL_SETUP_MYSQL_PASSWORD:-}" ]]; then
    HTQL_MYSQL_PASS="${HTQL_SETUP_MYSQL_PASSWORD}"
  else
    echo ""
    echo "— MySQL (aaPanel) — Trong Databases → Add DB: database='${HTQL_MYSQL_DB}', user='${HTQL_MYSQL_USER_APP}', Permission: Local server (127.0.0.1)."
    read -r -s -p "Mật khẩu MySQL user ${HTQL_MYSQL_USER_APP}: " HTQL_MYSQL_PASS
    echo ""
    if [[ -z "${HTQL_MYSQL_PASS}" ]]; then
      echo "Lỗi: cần mật khẩu để API kết nối MySQL."
      exit 1
    fi
  fi

  echo ""
  echo "→ Hệ thống & DB (gốc HTQL):  ${HTQL_ROOT}"
  echo "→ Thiết kế (thietke):         ${HTQL_DIR_THIETKE}"
  echo "→ Chứng từ (hdct):            ${HTQL_DIR_HDCT}"
  echo "→ HTQL_ROOT_SSD (.env):      ${SSD_DEFAULT}"
  echo "→ Backup (HDD):               ${HTQL_BACKUP}"
  echo "→ MySQL (aaPanel):            ${HTQL_MYSQL_DB} / ${HTQL_MYSQL_USER_APP}"
  echo ""

  read -r -p "Tiếp tục cài đặt? (y/n) [y]: " CONF
  CONF="${CONF:-y}"
  if [[ ! "${CONF}" =~ ^[yY] ]]; then
    echo "Đã hủy."
    exit 0
  fi
fi

echo ""
# HTQL Control đã chạy apt update+upgrade trong boot script → bỏ qua để tránh chạy gấp đôi
if [[ "${HTQL_SKIP_BOOT_APT:-}" == "1" ]]; then
  htql_log ">>> [HTQL] Bỏ qua apt update/upgrade (đã chạy trong Control Center boot)."
else
  htql_log ">>> [HTQL] Cấu hình apt network defaults (IPv4 + timeout + retry)..."
  htql_prepare_apt_network_defaults
  htql_log ">>> [HTQL] Bước 1/6 — Cập nhật danh mục gói (apt update)..."
  if ! htql_apt_update_with_retry; then
    htql_log "Lỗi: apt update vẫn thất bại sau nhiều lần thử. Kiểm tra DNS/mạng ra ngoài (security.ubuntu.com) rồi chạy lại setup_server.sh."
    exit 1
  fi
  htql_log ">>> [HTQL] Bước 2/6 — Cập nhật phần mềm đã cài trên Ubuntu (apt upgrade)..."
  sudo apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" upgrade
fi
htql_log ">>> [HTQL] Bước 3/6 — Cài đặt gói phụ trợ (PostgreSQL, …) — Nginx: dùng aaPanel hoặc cài tay; script không apt install nginx..."
# mariadb-client: lệnh mysql để kiểm tra kết nối tới MySQL aaPanel — KHÔNG cài mariadb-server — tránh xung đột cổng / dịch vụ)
sudo apt-get install -y \
  mariadb-client \
  postgresql postgresql-contrib \
  imagemagick \
  samba \
  ufw \
  curl \
  ca-certificates \
  rsync \
  unzip \
  openssl \
  cron

# --- Node.js ---
echo ">>> [HTQL] Bước 4/6 — Node.js & PM2 (nếu bật trong cấu hình)..."
if [[ "${INSTALL_NODE}" =~ ^[yY] ]]; then
  if ! command -v node >/dev/null 2>&1; then
    # Không dùng curl | sudo bash (stdin) — tương thích cài đặt không TTY / HTQL Control (SUDO_ASKPASS)
    curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/htql_nodesource_setup.sh
    sudo bash /tmp/htql_nodesource_setup.sh
    sudo apt-get install -y nodejs
  fi
fi
command -v node >/dev/null 2>&1 || { echo "Cần Node.js. Cài đặt rồi chạy lại script."; exit 1; }

htql_log ">>> [HTQL] Cài pm2 toàn cục (npm -g)..."
sudo npm install -g pm2

# sudo npm -g thường cài vào prefix root — đảm bảo pm2 trong PATH cho user hiện tại
export PATH="/usr/local/bin:/usr/bin:${PATH:-}"
_NPM_GBIN="$(sudo npm bin -g 2>/dev/null || true)"
if [[ -n "${_NPM_GBIN}" && -d "${_NPM_GBIN}" ]]; then
  export PATH="${_NPM_GBIN}:${PATH}"
fi
if ! command -v pm2 >/dev/null 2>&1; then
  for _try in /usr/local/bin/pm2 /usr/bin/pm2 "${HOME}/.npm-global/bin/pm2"; do
    if [[ -x "${_try}" ]]; then
      export PATH="$(dirname "${_try}"):${PATH}"
      break
    fi
  done
fi
if ! command -v pm2 >/dev/null 2>&1 && [[ -n "${_NPM_GBIN}" && -x "${_NPM_GBIN}/pm2" ]]; then
  sudo ln -sf "${_NPM_GBIN}/pm2" /usr/local/bin/pm2 2>/dev/null || true
  export PATH="/usr/local/bin:${PATH}"
fi
if ! command -v pm2 >/dev/null 2>&1; then
  htql_log "Lỗi: không tìm thấy pm2 sau npm install -g pm2. Kiểm tra: sudo npm bin -g"
  exit 1
fi
htql_log ">>> [HTQL] pm2 OK: $(command -v pm2)"

htql_log ">>> [HTQL] Bước 5/6 — Triển khai thư mục, API, PostgreSQL, PM2, kiểm tra Nginx (aaPanel), UFW, Samba..."

# --- Thư mục ---
sudo mkdir -p "${HTQL_ROOT}/server" "${HTQL_ROOT}/database" "${HTQL_ROOT}/data" \
  "${HTQL_DIR_THIETKE}" "${HTQL_DIR_HDCT}" "${HTQL_BACKUP}"
sudo chown -R "$(whoami):$(whoami)" "${HTQL_ROOT}"
sudo chown -R "$(whoami):$(whoami)" "${HTQL_DIR_THIETKE}" "${HTQL_DIR_HDCT}" 2>/dev/null || true
sudo chown -R "$(whoami):$(whoami)" "${HTQL_BACKUP}" 2>/dev/null || true

chmod -R u+rwX "${HTQL_DIR_THIETKE}" "${HTQL_DIR_HDCT}" "${SSD_DEFAULT}" 2>/dev/null || true

# --- Copy gói ---
rsync -a "${SCRIPT_DIR}/server/" "${HTQL_ROOT}/server/"
rsync -a "${SCRIPT_DIR}/database/" "${HTQL_ROOT}/database/"
if [[ -d "${SCRIPT_DIR}/data" ]]; then
  rsync -a "${SCRIPT_DIR}/data/" "${HTQL_ROOT}/data/"
fi
rsync -a "${SCRIPT_DIR}/deploy/" "${HTQL_ROOT}/deploy/" 2>/dev/null || true

# --- npm API ---
htql_log ">>> [HTQL] npm install API (server)..."
(cd "${HTQL_ROOT}/server" && npm install --omit=dev)

htql_log ">>> [HTQL] SSD: thietke=${HTQL_DIR_THIETKE} hdct=${HTQL_DIR_HDCT}  HTQL_ROOT_SSD=${SSD_DEFAULT}"

# --- MySQL (aaPanel) — chỉ kiểm tra kết nối + ghi .env (không tạo DB/user trên máy) ---
htql_log ">>> [HTQL] MySQL (aaPanel): kiểm tra TCP 127.0.0.1:3306, database đã tạo trong panel..."
if ! command -v mysql >/dev/null 2>&1; then
  echo "[HTQL] Lỗi: thiếu lệnh mysql (apt install mariadb-client đã gọi ở trên)."
  exit 1
fi
_MY_ERR="$(mktemp)"
while true; do
  if MYSQL_PWD="${HTQL_MYSQL_PASS}" mysql -h 127.0.0.1 -P 3306 -u "${HTQL_MYSQL_USER_APP}" --protocol=TCP \
    -e "SELECT 1 AS htql_mysql_ok" "${HTQL_MYSQL_DB}" 2>"${_MY_ERR}"; then
    break
  fi
  echo "[HTQL] Loi ket noi MySQL (aaPanel). Chi tiet:"
  cat "${_MY_ERR}" >&2 || true
  : >"${_MY_ERR}"
  if [[ "${HTQL_SETUP_NONINTERACTIVE:-}" == "1" ]]; then
    rm -f "${_MY_ERR}"
    echo ""
    echo "  • Dam bao MySQL trong aaPanel dang chay; da Add DB: ${HTQL_MYSQL_DB}, user ${HTQL_MYSQL_USER_APP}, Local server."
    echo "  • API Node dung TCP 127.0.0.1:3306."
    echo "  • Kiem tra HTQL_SETUP_MYSQL_PASSWORD / mat khau trong aaPanel roi chay lai script."
    exit 1
  fi
  echo ""
  echo "[HTQL] Mat khau khong dung hoac khong ket noi duoc MySQL. Nhap lai (de trong + Enter = thoat)."
  read -r -s -p "Mat khau MySQL user ${HTQL_MYSQL_USER_APP}: " HTQL_MYSQL_PASS
  echo ""
  if [[ -z "${HTQL_MYSQL_PASS}" ]]; then
    rm -f "${_MY_ERR}"
    echo "[HTQL] Da dung: can mat khau dung de tiep tuc cai dat."
    exit 1
  fi
done
rm -f "${_MY_ERR}"
htql_log ">>> [HTQL] MySQL: kết nối OK (database ${HTQL_MYSQL_DB}, user ${HTQL_MYSQL_USER_APP})."

htql_log ">>> [HTQL] Ghi ${HTQL_ROOT}/server/.env (MySQL + đường dẫn lưu trữ)..."
mkdir -p "${HTQL_ROOT}/server" "${HTQL_ROOT}/update/client" "${HTQL_ROOT}/update/server"
_env_out="$(mktemp)"
{
  echo "NODE_ENV=production"
  echo "PORT=3001"
  echo "HTQL_INSTALL_ROOT=${HTQL_ROOT}"
  echo "HTQL_DATA_DIR=${HTQL_ROOT}/data"
  echo "HTQL_ROOT_SSD=${SSD_DEFAULT}"
  echo "HTQL_PATH_HOADON_CHUNG_TU=${HTQL_DIR_HDCT}"
  echo "HTQL_PATH_THIET_KE=${HTQL_DIR_THIETKE}"
  echo "HTQL_PATH_BACKUP_DU_LIEU=${HTQL_BACKUP}/backup_dulieu"
  echo "HTQL_PATH_BACKUP_CT_TK=${HTQL_BACKUP}/backup_ct_tk"
  echo "HTQL_UPDATE_CLIENT_DIR=${HTQL_ROOT}/update/client"
  echo "HTQL_UPDATE_SERVER_DIR=${HTQL_ROOT}/update/server"
  echo "HTQL_MYSQL_HOST=127.0.0.1"
  echo "HTQL_MYSQL_PORT=3306"
  echo "HTQL_MYSQL_USER=${HTQL_MYSQL_USER_APP}"
  printf 'HTQL_MYSQL_PASSWORD=%s\n' "${HTQL_MYSQL_PASS}"
  echo "HTQL_MYSQL_DATABASE=${HTQL_MYSQL_DB}"
} > "${_env_out}"
mv "${_env_out}" "${HTQL_ROOT}/server/.env"
chmod 600 "${HTQL_ROOT}/server/.env"
printf '%s\n' "${HTQL_MYSQL_PASS}" > "${HTQL_ROOT}/.mysql_password"
chmod 600 "${HTQL_ROOT}/.mysql_password"
htql_log "Đã lưu mật khẩu MySQL (user ${HTQL_MYSQL_USER_APP}) tại: ${HTQL_ROOT}/.mysql_password"

htql_log ">>> [HTQL] Thư mục data, logs, update/client, update/server, backup HDD — mkdir + phân quyền user triển khai..."
mkdir -p "${HTQL_ROOT}/data" "${HTQL_ROOT}/logs" "${HTQL_ROOT}/update/client" "${HTQL_ROOT}/update/server"
mkdir -p "${HTQL_BACKUP}/backup_dulieu" "${HTQL_BACKUP}/backup_ct_tk"
chmod -R u+rwX "${HTQL_ROOT}/data" "${HTQL_ROOT}/update" "${HTQL_ROOT}/logs" 2>/dev/null || true
sudo chown -R "$(whoami):$(whoami)" "${HTQL_ROOT}/data" "${HTQL_ROOT}/update" "${HTQL_ROOT}/logs" 2>/dev/null || true
sudo chown -R "$(whoami):$(whoami)" "${HTQL_BACKUP}" 2>/dev/null || true

# --- PostgreSQL (schema dùng cho tích hợp sau; API hiện tại dùng JSON) ---
htql_log ">>> [HTQL] PostgreSQL: tạo DB / user / schema..."
DB_PASS="${PG_PASS_IN}"
if [[ -z "${DB_PASS}" ]]; then
  DB_PASS="$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)"
fi

DB_PASS_SQL="${DB_PASS//\'/\'\'}"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${PG_DB_NAME}'" | grep -q 1 \
  || sudo -u postgres createdb "${PG_DB_NAME}"

if ! sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '${PG_DB_USER}'" | grep -q 1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE USER ${PG_DB_USER} WITH PASSWORD '${DB_PASS_SQL}';"
fi

sudo -u postgres psql -d "${PG_DB_NAME}" -v ON_ERROR_STOP=1 -f "${HTQL_ROOT}/database/schema_postgresql.sql"

sudo -u postgres psql -d postgres -c "GRANT CONNECT ON DATABASE ${PG_DB_NAME} TO ${PG_DB_USER};"
sudo -u postgres psql -d "${PG_DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${PG_DB_USER};"
sudo -u postgres psql -d "${PG_DB_NAME}" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${PG_DB_USER};"
sudo -u postgres psql -d "${PG_DB_NAME}" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${PG_DB_USER};"

echo "${DB_PASS}" > "${HTQL_ROOT}/.pg_password"
chmod 600 "${HTQL_ROOT}/.pg_password"
echo "Đã lưu mật khẩu PostgreSQL user ${PG_DB_USER} tại: ${HTQL_ROOT}/.pg_password"

# --- PM2 ---
htql_log ">>> [HTQL] PM2: ecosystem, start, save, startup..."
ECO="${HTQL_ROOT}/server/ecosystem.config.cjs"
sed \
  -e "s|__HTQL_SERVER_DIR__|${HTQL_ROOT}/server|g" \
  "${HTQL_ROOT}/deploy/ecosystem.config.cjs.example" > "${ECO}"

(cd "${HTQL_ROOT}/server" && pm2 delete htql550-api 2>/dev/null || true)
(cd "${HTQL_ROOT}/server" && pm2 start ecosystem.config.cjs)
pm2 save
PM2_SU_FILE="${HTQL_ROOT}/deploy/PM2_STARTUP_SUDO_ONCE.txt"
mkdir -p "${HTQL_ROOT}/deploy"
pm2 startup systemd -u "$(whoami)" --hp "${HOME}" 2>&1 | tee "${PM2_SU_FILE}" || true
htql_log "PM2: nếu sau reboot «pm2 status» trống — chạy MỘT LẦN lệnh sudo trong: ${PM2_SU_FILE}"
if [[ -f "${HTQL_ROOT}/deploy/ensure-pm2-boot.sh" ]]; then
  chmod +x "${HTQL_ROOT}/deploy/ensure-pm2-boot.sh" 2>/dev/null || true
fi
# Bổ sung @reboot: khôi phục htql550-api nếu systemd user chưa chạy (cúp điện / user chưa chạy lệnh sudo từ pm2 startup).
mkdir -p "${HTQL_ROOT}/logs"
if command -v crontab >/dev/null 2>&1; then
  ENSURE_LINE="@reboot sleep 25 && /bin/bash -lc 'export PATH=\"/usr/local/bin:/usr/bin:${PATH}\"; \"${HTQL_ROOT}/deploy/ensure-pm2-boot.sh\"' >>\"${HTQL_ROOT}/logs/pm2_reboot_cron.log\" 2>&1"
  if ! crontab -l 2>/dev/null | grep -Fq 'ensure-pm2-boot.sh'; then
    ( crontab -l 2>/dev/null | grep -v 'ensure-pm2-boot.sh' || true; echo "${ENSURE_LINE}" ) | crontab -
    htql_log "Đã thêm cron @reboot → ensure-pm2-boot.sh (log: ${HTQL_ROOT}/logs/pm2_reboot_cron.log)"
  fi
fi

# --- Nginx: aaPanel da co Nginx — KHONG apt install nginx; chi kiem tra + huong dan snippet proxy /api/ ---
htql_log ">>> [HTQL] Nginx (tai su dung aaPanel / kiem tra san co)..."
SNIP_SRC="${HTQL_ROOT}/deploy/nginx-htql550-location-snippet.conf.example"
[[ -f "${SNIP_SRC}" ]] || SNIP_SRC="${SCRIPT_DIR}/deploy/nginx-htql550-location-snippet.conf.example"
NGINX_BIN=""
AAPANEL_NGX="/www/server/nginx/sbin/nginx"
if [[ -x "${AAPANEL_NGX}" ]]; then
  NGINX_BIN="${AAPANEL_NGX}"
elif command -v nginx >/dev/null 2>&1; then
  NGINX_BIN="$(command -v nginx)"
fi
if [[ -n "${NGINX_BIN}" ]]; then
  htql_log "Da phat hien Nginx: ${NGINX_BIN}"
  if [[ -d /www/server/panel ]]; then
    htql_log "aaPanel: Website -> site -> Conf — dan khoi location /api/ tu file mau, roi Reload Nginx."
    htql_log "Mau trong goi: ${SNIP_SRC}"
  elif [[ -d /etc/nginx/sites-available ]]; then
    htql_log "Nginx kieu Debian (khong aaPanel) — ap site mau htql550 vao sites-available."
    sudo cp "${HTQL_ROOT}/deploy/nginx-htql550.conf.example" /etc/nginx/sites-available/htql550 2>/dev/null || \
      sudo cp "${SCRIPT_DIR}/deploy/nginx-htql550.conf.example" /etc/nginx/sites-available/htql550
    sudo ln -sf /etc/nginx/sites-available/htql550 /etc/nginx/sites-enabled/htql550
    if sudo "${NGINX_BIN}" -t 2>/dev/null; then
      sudo systemctl reload nginx 2>/dev/null || sudo "${NGINX_BIN}" -s reload 2>/dev/null || true
    else
      htql_log "Canh bao: nginx -t that bai — kiem tra cau hinh tay."
    fi
  else
    htql_log "Nginx ton tai nhung khong nhan dang layout; them proxy /api/ tay — xem ${SNIP_SRC}"
  fi
else
  htql_log "Canh bao: chua thay Nginx. Cai aaPanel (khuyen nghi) hoac: sudo apt install nginx — roi dan snippet tu ${SNIP_SRC}"
fi

# --- UFW ---
htql_log ">>> [HTQL] UFW..."
sudo ufw allow OpenSSH || true
sudo ufw allow 80/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 5432/tcp
sudo ufw allow 445/tcp
echo "y" | sudo ufw enable || true

# --- Samba (share SSD — một gốc hoặc hai thư mục riêng) ---
if [[ -f /etc/samba/smb.conf ]]; then
  if [[ "${SAMBA_SSD_MODE}" == "single" ]] && ! grep -q '\[htql550_ssd\]' /etc/samba/smb.conf; then
    sudo tee -a /etc/samba/smb.conf >/dev/null <<SMB
[htql550_ssd]
   path = ${SSD_DEFAULT}
   browseable = yes
   read only = no
   guest ok = no
   create mask = 0664
   directory mask = 0775
SMB
    echo "Đã thêm share Samba [htql550_ssd] → ${SSD_DEFAULT} (gồm thietke/ và hdct/). Tạo user: sudo smbpasswd -a <user>"
    sudo systemctl restart smbd || true
  elif [[ "${SAMBA_SSD_MODE}" == "split" ]]; then
    if ! grep -q '\[htql550_thietke\]' /etc/samba/smb.conf; then
      sudo tee -a /etc/samba/smb.conf >/dev/null <<SMB
[htql550_thietke]
   path = ${HTQL_DIR_THIETKE}
   browseable = yes
   read only = no
   guest ok = no
   create mask = 0664
   directory mask = 0775
SMB
    fi
    if ! grep -q '\[htql550_hdct\]' /etc/samba/smb.conf; then
      sudo tee -a /etc/samba/smb.conf >/dev/null <<SMB
[htql550_hdct]
   path = ${HTQL_DIR_HDCT}
   browseable = yes
   read only = no
   guest ok = no
   create mask = 0664
   directory mask = 0775
SMB
    fi
    echo "Đã thêm Samba [htql550_thietke] → ${HTQL_DIR_THIETKE}, [htql550_hdct] → ${HTQL_DIR_HDCT}. Tạo user: sudo smbpasswd -a <user>"
    sudo systemctl restart smbd || true
  fi
fi

# --- Backup định kỳ 01:00 + đồng bộ nối tiếp 01:30 ---
htql_log ">>> [HTQL] Cài đặt backup định kỳ (01:00) + đồng bộ nối tiếp (01:30)..."
sudo systemctl enable cron 2>/dev/null || true
sudo systemctl start cron 2>/dev/null || true
mkdir -p "${HTQL_ROOT}/logs"
sudo tee /usr/local/bin/htql550-backup.sh > /dev/null <<HTQL_BACKUP_EOF
#!/usr/bin/env bash
set -euo pipefail
HTQL_ROOT="${HTQL_ROOT}"
HTQL_DIR_THIETKE="${HTQL_DIR_THIETKE}"
HTQL_DIR_HDCT="${HTQL_DIR_HDCT}"
BACKUP_ROOT="${HTQL_BACKUP}"
MYSQL_DB="${HTQL_MYSQL_DB}"
MYSQL_USER="${HTQL_MYSQL_USER_APP}"
PG_DB_NAME="${PG_DB_NAME}"
DAILY="\${BACKUP_ROOT}/daily_system"
BACKUP_CT_TK="\${BACKUP_ROOT}/backup_ct_tk"
mkdir -p "\${DAILY}" "\${BACKUP_CT_TK}/hdct" "\${BACKUP_CT_TK}/thietke" "\${HTQL_ROOT}/logs"
DAY="\$(date +%Y%m%d)"
LOG="\${HTQL_ROOT}/logs/htql550-backup.log"
{
  echo "[\$(date -Is)] Bắt đầu backup HTQL_550"
  /usr/bin/sudo -u postgres /usr/bin/pg_dump "\${PG_DB_NAME}" 2>/dev/null | gzip -c > "\${DAILY}/db_\${DAY}.sql.gz" || echo "[\$(date -Is)] Cảnh báo: pg_dump thất bại (kiểm tra PostgreSQL)."
  if [[ -d "\${HTQL_ROOT}/data" ]]; then
    tar czf "\${DAILY}/data_\${DAY}.tar.gz" -C "\${HTQL_ROOT}" data 2>/dev/null || true
  fi
  if [[ -f "\${HTQL_ROOT}/.mysql_password" ]] && command -v mysqldump >/dev/null 2>&1; then
    export MYSQL_PWD="\$(cat "\${HTQL_ROOT}/.mysql_password")"
    mysqldump -h127.0.0.1 -P3306 -u"\${MYSQL_USER}" --protocol=TCP --single-transaction --skip-comments "\${MYSQL_DB}" 2>/dev/null | gzip -c > "\${DAILY}/mysql_\${DAY}.sql.gz" || echo "[\$(date -Is)] Cảnh báo: mysqldump thất bại (kiểm tra MySQL aaPanel)."
    unset MYSQL_PWD
    ls -1t "\${DAILY}"/mysql_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
  fi
  ls -1t "\${DAILY}"/db_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
  ls -1t "\${DAILY}"/data_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
  echo "[\$(date -Is)] Hoàn tất backup (PostgreSQL + MySQL + data xoay vòng 10 bản)."
} >> "\${LOG}" 2>&1
HTQL_BACKUP_EOF
sudo chmod 755 /usr/local/bin/htql550-backup.sh
sudo tee /usr/local/bin/htql550-sync-cttk.sh > /dev/null <<HTQL_SYNC_EOF
#!/usr/bin/env bash
set -euo pipefail
HTQL_ROOT="${HTQL_ROOT}"
HTQL_DIR_THIETKE="${HTQL_DIR_THIETKE}"
HTQL_DIR_HDCT="${HTQL_DIR_HDCT}"
BACKUP_ROOT="${HTQL_BACKUP}"
BACKUP_CT_TK="\${BACKUP_ROOT}/backup_ct_tk"
mkdir -p "\${BACKUP_CT_TK}/hdct" "\${BACKUP_CT_TK}/thietke" "\${HTQL_ROOT}/logs"
LOG="\${HTQL_ROOT}/logs/htql550-sync-cttk.log"

# Chỉ đồng bộ hai nhánh SSD (hdct + thietke) → HDD theo .env; không rsync cây khác.
# Bỏ --checksum (đọc toàn bộ file mỗi lần, dễ lỗi/kẹt trên ổ lớn); dùng mặc định rsync (size+mtime).
# Nếu nguồn rỗng (SSD chưa mount) thì KHÔNG chạy --delete để tránh xoá nhầm bản sao HDD.
htql_sync_one() {
  local src="\$1" dst="\$2" name="\$3"
  if [[ ! -d "\$src" ]]; then
    echo "[\$(date -Is)] Cảnh báo: thiếu thư mục nguồn (\$name): \$src"
    return 0
  fi
  if [[ -z "\$(find "\$src" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null || true)" ]]; then
    echo "[\$(date -Is)] Cảnh báo: bỏ qua rsync \$name — nguồn rỗng (kiểm tra mount SSD / HTQL_PATH_*), không ghi đích."
    return 0
  fi
  mkdir -p "\$dst"
  local lock="/tmp/htql550-sync-\${name}.lock"
  if command -v flock >/dev/null 2>&1; then
    if flock -n "\$lock" rsync -a --delete "\$src/" "\$dst/"; then
      echo "[\$(date -Is)] OK rsync \$name."
    else
      echo "[\$(date -Is)] Cảnh báo: rsync \$name (đang chạy song song hoặc lỗi I/O?)."
    fi
  else
    rsync -a --delete "\$src/" "\$dst/" || echo "[\$(date -Is)] Cảnh báo: rsync \$name."
  fi
}

{
  echo "[\$(date -Is)] Bắt đầu đồng bộ nối tiếp hdct/thietke → \${BACKUP_CT_TK}"
  htql_sync_one "\${HTQL_DIR_HDCT}" "\${BACKUP_CT_TK}/hdct" "hdct"
  htql_sync_one "\${HTQL_DIR_THIETKE}" "\${BACKUP_CT_TK}/thietke" "thietke"
  echo "[\$(date -Is)] Hoàn tất đồng bộ nối tiếp."
} >> "\${LOG}" 2>&1
HTQL_SYNC_EOF
sudo chmod 755 /usr/local/bin/htql550-sync-cttk.sh
# Tránh trùng dòng cron khi chạy lại script
( crontab -l 2>/dev/null | grep -Ev '/usr/local/bin/htql550-(backup|sync-cttk)\.sh' || true
  echo "0 1 * * * /usr/local/bin/htql550-backup.sh"
  echo "30 1 * * * /usr/local/bin/htql550-sync-cttk.sh"
) | crontab -
htql_log ">>> [HTQL] Đã đăng ký cron: 01:00 — \`/usr/local/bin/htql550-backup.sh\`"
htql_log ">>> [HTQL] Đã đăng ký cron: 01:30 — \`/usr/local/bin/htql550-sync-cttk.sh\`"

htql_log ">>> [HTQL] Bước 6/6 — Dọn gói không dùng, cache apt và file tạm..."
sudo apt-get autoremove -y
sudo apt-get autoclean
sudo rm -f /tmp/htql_nodesource_setup.sh 2>/dev/null || true

_PRIMARY_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
[[ -z "${_PRIMARY_IP}" ]] && _PRIMARY_IP="127.0.0.1"
_REPORT_FILE="${HTQL_ROOT}/HTQL_INSTALL_REPORT.txt"

{
  echo ""
  echo "=========================================="
  echo " HTQL_550 — BÁO CÁO CÀI ĐẶT HOÀN TẤT"
  echo "=========================================="
  echo "Phiên bản gói:              ${HTQL_VER}"
  echo "Máy chủ (hostname):         $(hostname 2>/dev/null || echo '?')"
  echo "IP chính:                   ${_PRIMARY_IP}"
  echo ""
  echo "— Nơi lưu trữ —"
  echo "Hệ thống + DB (API, data):  ${HTQL_ROOT}"
  echo "Thiết kế (thietke):          ${HTQL_DIR_THIETKE}"
  echo "Chứng từ (hdct):             ${HTQL_DIR_HDCT}"
  echo "HTQL_ROOT_SSD (.env):        ${SSD_DEFAULT}"
  echo "Backup định kỳ (HDD):       ${HTQL_BACKUP}"
  echo "  • DB + thư mục data:       \`${HTQL_BACKUP}/daily_system/\` (PostgreSQL + tar data + mysqldump MySQL — giữ tối đa 10 bản/ngày, xóa bản cũ)"
  echo "  • Chứng từ + thiết kế:      \`${HTQL_BACKUP}/backup_ct_tk/hdct\` + \`thietke\` (đồng bộ nối tiếp)"
  echo "  • Lịch:                    01:00 hàng ngày — \`/usr/local/bin/htql550-backup.sh\`"
  echo "  • Lịch đồng bộ nối tiếp:    01:30 hàng ngày — \`/usr/local/bin/htql550-sync-cttk.sh\`"
  echo "  • Log backup:              ${HTQL_ROOT}/logs/htql550-backup.log"
  echo "  • Log đồng bộ nối tiếp:     ${HTQL_ROOT}/logs/htql550-sync-cttk.log"
  echo ""
  echo "— Cơ sở dữ liệu PostgreSQL —"
  echo "Database:                   ${PG_DB_NAME}"
  echo "User:                       ${PG_DB_USER}"
  echo "Mật khẩu:                   đã lưu tại ${HTQL_ROOT}/.pg_password (không hiển thị trong log)"
  echo ""
  echo "— MySQL (aaPanel — API HTQL_550, TCP 127.0.0.1) —"
  echo "Database:                   ${HTQL_MYSQL_DB:-htql_550_db}"
  echo "User ứng dụng:              ${HTQL_MYSQL_USER_APP:-htql_550}"
  echo "Host:                       127.0.0.1:3306 (script không cài mariadb-server)"
  echo "Mật khẩu app:               đã lưu tại ${HTQL_ROOT}/.mysql_password"
  echo "File cấu hình API:         ${HTQL_ROOT}/server/.env"
  echo ""
  echo "— Dịch vụ —"
  echo "API:                        http://${_PRIMARY_IP}:3001/"
  echo "Kiểm tra API:               http://${_PRIMARY_IP}:3001/api/don-vi-tinh"
  echo "PM2:                        pm2 status  |  pm2 logs"
  echo "Nginx: aaPanel -> Website -> Conf; location /api/ -> 127.0.0.1:3001; file mau: deploy/nginx-htql550-location-snippet.conf.example"
  if [[ "${SAMBA_SSD_MODE}" == "single" ]]; then
    echo "Samba:                      [htql550_ssd] → ${SSD_DEFAULT}"
  else
    echo "Samba:                      [htql550_thietke] → ${HTQL_DIR_THIETKE}  |  [htql550_hdct] → ${HTQL_DIR_HDCT}"
  fi
  echo ""
  echo "Báo cáo đã ghi:             ${_REPORT_FILE}"
  echo "=========================================="
} | tee "${_REPORT_FILE}"
chmod 600 "${_REPORT_FILE}" 2>/dev/null || true
