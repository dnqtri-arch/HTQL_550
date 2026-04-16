/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const p = path.join(__dirname, '..', 'setup_server.sh')
let t = fs.readFileSync(p, 'utf8')
const startMark = '# --- Nginx '
const endMark = '\n\n# --- UFW ---'
const i = t.indexOf(startMark)
if (i < 0) throw new Error('Nginx section start not found')
const j = t.indexOf(endMark, i)
if (j < 0) throw new Error('Nginx section end not found')

const newBlock = [
  '# --- Nginx: aaPanel da co Nginx — KHONG apt install nginx; chi kiem tra + huong dan snippet proxy /api/ ---',
  'htql_log ">>> [HTQL] Nginx (tai su dung aaPanel / kiem tra san co)..."',
  'SNIP_SRC="${HTQL_ROOT}/deploy/nginx-htql550-location-snippet.conf.example"',
  '[[ -f "${SNIP_SRC}" ]] || SNIP_SRC="${SCRIPT_DIR}/deploy/nginx-htql550-location-snippet.conf.example"',
  'NGINX_BIN=""',
  'AAPANEL_NGX="/www/server/nginx/sbin/nginx"',
  'if [[ -x "${AAPANEL_NGX}" ]]; then',
  '  NGINX_BIN="${AAPANEL_NGX}"',
  'elif command -v nginx >/dev/null 2>&1; then',
  '  NGINX_BIN="$(command -v nginx)"',
  'fi',
  'if [[ -n "${NGINX_BIN}" ]]; then',
  '  htql_log "Da phat hien Nginx: ${NGINX_BIN}"',
  '  if [[ -d /www/server/panel ]]; then',
  '    htql_log "aaPanel: Website -> site -> Conf — dan khoi location /api/ tu file mau, roi Reload Nginx."',
  '    htql_log "Mau trong goi: ${SNIP_SRC}"',
  '  elif [[ -d /etc/nginx/sites-available ]]; then',
  '    htql_log "Nginx kieu Debian (khong aaPanel) — ap site mau htql550 vao sites-available."',
  '    sudo cp "${HTQL_ROOT}/deploy/nginx-htql550.conf.example" /etc/nginx/sites-available/htql550 2>/dev/null || \\',
  '      sudo cp "${SCRIPT_DIR}/deploy/nginx-htql550.conf.example" /etc/nginx/sites-available/htql550',
  '    sudo ln -sf /etc/nginx/sites-available/htql550 /etc/nginx/sites-enabled/htql550',
  '    if sudo "${NGINX_BIN}" -t 2>/dev/null; then',
  '      sudo systemctl reload nginx 2>/dev/null || sudo "${NGINX_BIN}" -s reload 2>/dev/null || true',
  '    else',
  '      htql_log "Canh bao: nginx -t that bai — kiem tra cau hinh tay."',
  '    fi',
  '  else',
  '    htql_log "Nginx ton tai nhung khong nhan dang layout; them proxy /api/ tay — xem ${SNIP_SRC}"',
  '  fi',
  'else',
  '  htql_log "Canh bao: chua thay Nginx. Cai aaPanel (khuyen nghi) hoac: sudo apt install nginx — roi dan snippet tu ${SNIP_SRC}"',
  'fi',
].join('\n')

t = t.slice(0, i) + newBlock + t.slice(j)
fs.writeFileSync(p, t, 'utf8')
console.log('patched nginx block in', p)
