/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const p = path.join(__dirname, '..', 'setup_server.sh')
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/)
let changed = 0

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  if (line.includes('htql_log') && line.includes('3/6') && line.includes('PostgreSQL, Nginx')) {
    lines[i] = line.replace(
      /\(PostgreSQL, Nginx, …\)/u,
      '(PostgreSQL, …) — Nginx: dùng aaPanel hoặc cài tay; script không apt install nginx',
    )
    changed++
  }
  if (line.includes('htql_log') && line.includes('5/6') && line.includes(', PM2, Nginx, UFW')) {
    lines[i] = line.replace(', PM2, Nginx, UFW', ', PM2, kiểm tra Nginx (aaPanel), UFW')
    changed++
  }
  if (
    line.includes('backup_ct_tk/hdct') &&
    line.includes('echo "  • Lịch:') &&
    line.split('  echo "  • Lịch:').length === 2
  ) {
    const [a, b] = line.split('  echo "  • Lịch:')
    lines[i] = a.trimEnd()
    lines.splice(i + 1, 0, '  echo "  • Lịch:' + b)
    changed++
    i++
  }
  if (line.includes('sites-available/htql550') && line.includes('echo "Nginx')) {
    lines[i] =
      '  echo "Nginx: aaPanel -> Website -> Conf; location /api/ -> 127.0.0.1:3001; file mau: deploy/nginx-htql550-location-snippet.conf.example"'
    changed++
  }
}

fs.writeFileSync(p, lines.join('\n'), 'utf8')
console.log('patch-setup-small-fixes: replacements', changed, p)
