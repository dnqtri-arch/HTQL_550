const fs = require('fs')
const path = require('path')
const p = path.join(__dirname, '..', 'deploy', 'HUONG_DAN_CAI_DAT_SERVER_UBUNTU.md')
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/)
const i = lines.findIndex((l) => l.includes('sites-available/htql550') && l.includes('sudo nginx -t'))
if (i < 0) throw new Error('nginx line not found')
lines[i] =
  '**Nginx (aaPanel):** trong **Website \u2192 Conf**, d\u00E1n kh\u1ED1i `location /api/` t\u1EEB file `deploy/nginx-htql550-location-snippet.conf.example`, r\u1ED3i Reload Nginx. M\u00E1y kh\u00F4ng aaPanel: c\u00F3 th\u1EC3 d\u00F9ng site `sites-available/htql550` nh\u01B0 log c\u1EE7a `setup_server.sh` (Nginx Debian).'
fs.writeFileSync(p, lines.join('\n'), 'utf8')
console.log('b5 nginx ok')
