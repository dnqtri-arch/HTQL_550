const fs = require('fs')
const path = require('path')
const toolRoot = path.join(__dirname, '..')
const src = path.join(toolRoot, '..', '..', 'logo', 'logo_nambac.png')
const dstDir = path.join(toolRoot, 'build')
const dst = path.join(dstDir, 'logo_nambac.png')
if (!fs.existsSync(src)) {
  console.error('[copy-icon] Không tìm thấy:', src)
  process.exit(1)
}
fs.mkdirSync(dstDir, { recursive: true })
fs.copyFileSync(src, dst)
console.log('[copy-icon]', dst)
