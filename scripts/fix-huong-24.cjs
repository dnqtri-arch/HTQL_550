const fs = require('fs')
const path = require('path')
const p = path.join(__dirname, '..', 'deploy', 'HUONG_DAN_CAI_DAT_SERVER_UBUNTU.md')
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/)
const idx = lines.findIndex((l) => l.startsWith('### 2.4 Nginx'))
if (idx < 0) throw new Error('2.4 not found')
lines[idx + 1] =
  '1. **Không** cần b\u01B0\u1EDBc «cài Nginx mới» nếu server đã có **aaPanel** (Nginx do panel quản lý).'
lines[idx + 2] =
  '2. Sau `setup_server.sh`, m\u1EDF **aaPanel** → **Website** → chọn domain/site dùng cho HTQL (hoặc site mặc định) → **Conf**.'
lines[idx + 3] =
  '3. Trong khối `server { ... }`, dán nội dung **`location /api/ { ... }`** t\u1EEB file **`deploy/nginx-htql550-location-snippet.conf.example`** (trong gói zip hoặc `/opt/htql550/deploy/` sau khi cài).'
lines[idx + 4] =
  '4. **Reload Nginx** trong aaPanel. Kiểm tra: `curl -sS http://127.0.0.1/api/htql-meta` (c\u1ED5ng 80) hoặc v\u1EABn gọi trực tiếp **`http://IP:3001`** cho API Node.'
lines[idx + 5] =
  '5. **Cập nhật server lần sau:** nếu đã cấu hình proxy trong aaPanel, **không** cần cài lại Nginx — ch\u1EC9 c\u1EA7n \u0111\u1ED3ng b\u1ED9 mã API (`rsync`/`zip`) và `pm2 restart`.'
fs.writeFileSync(p, lines.join('\n'), 'utf8')
console.log('2.4 lines rewritten')
