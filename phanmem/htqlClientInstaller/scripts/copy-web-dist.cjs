const fs = require('fs')
const path = require('path')

const clientRoot = path.join(__dirname, '..')
const repoRoot = path.join(clientRoot, '..', '..')
const dist = path.join(repoRoot, 'dist')
const target = path.join(clientRoot, 'web-dist')

if (!fs.existsSync(dist)) {
  console.error('[copy-web-dist] Chưa có thư mục dist. Chạy: npm run build tại gốc repo HTQL_550.')
  process.exit(1)
}

fs.rmSync(target, { recursive: true, force: true })
fs.cpSync(dist, target, { recursive: true })
console.log('[copy-web-dist]', target)
