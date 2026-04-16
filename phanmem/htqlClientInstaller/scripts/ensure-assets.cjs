const fs = require('fs')
const path = require('path')

const clientRoot = path.join(__dirname, '..')
const repoRoot = path.join(clientRoot, '..', '..')
const dstDir = path.join(clientRoot, 'build')
fs.mkdirSync(dstDir, { recursive: true })

const bundledIco = path.join(clientRoot, 'build', 'icon.ico')
const fromToolRelease = path.join(repoRoot, 'phanmem', 'controlCenter', 'release', '.icon-ico', 'icon.ico')
const dstIco = path.join(dstDir, 'icon.ico')
if (fs.existsSync(bundledIco)) {
  fs.copyFileSync(bundledIco, dstIco)
  console.log('[ensure-assets]', dstIco, '(từ build/icon.ico)')
} else if (fs.existsSync(fromToolRelease)) {
  fs.copyFileSync(fromToolRelease, dstIco)
  console.log('[ensure-assets]', dstIco, '(từ Tool Server release)')
} else {
  const logoPng = path.join(repoRoot, 'logo', 'logo_nambac.png')
  if (!fs.existsSync(logoPng)) {
    console.error('[ensure-assets] Cần phanmem/htqlClientInstaller/build/icon.ico hoặc logo:', logoPng)
    process.exit(1)
  }
  fs.copyFileSync(logoPng, path.join(dstDir, 'icon.png'))
  console.warn('[ensure-assets] Chưa có icon.ico — tạm dùng icon.png; NSIS có thể lỗi.')
  process.exit(1)
}
