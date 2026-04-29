/**
 * Cùng nguyên tắc với gói server: `v{YYYY}.{MM}.{BUILD}` — BUILD từ `scripts/client-build-counter.txt`
 * (tăng liên tục; khởi tạo từ `VERSION.txt` nếu chưa có counter, giống `package-htql-server.ps1`).
 * Cập nhật package.json (version + artifactName) và gốc repo `.env.production` (VITE_HTQL_550_VERSION).
 */
const fs = require('fs')
const path = require('path')

const installerRoot = path.join(__dirname, '..')
const repoRoot = path.join(installerRoot, '..', '..')
const counterPath = path.join(repoRoot, 'scripts', 'client-build-counter.txt')
const versionTxtPath = path.join(repoRoot, 'VERSION.txt')
const pkgPath = path.join(installerRoot, 'package.json')
const envProd = path.join(repoRoot, '.env.production')

function readCounterFromVersionTxt() {
  try {
    const raw = fs.readFileSync(versionTxtPath, 'utf8').trim()
    const parts = raw.split('.')
    if (parts.length >= 3) {
      const c = parseInt(parts[2], 10)
      if (Number.isFinite(c)) return c
    }
  } catch (_) {
    /* ignore */
  }
  return 0
}

function main() {
  const skipBump = ['1', 'true', 'on'].includes(String(process.env.HTQL_CLIENT_SKIP_AUTO_BUMP || '').toLowerCase())

  let counter = 0
  if (fs.existsSync(counterPath)) {
    const raw = fs.readFileSync(counterPath, 'utf8').trim()
    const parsed = parseInt(raw, 10)
    if (Number.isFinite(parsed)) counter = parsed
  } else {
    counter = readCounterFromVersionTxt()
  }

  if (!skipBump) {
    counter += 1
    fs.mkdirSync(path.dirname(counterPath), { recursive: true })
    fs.writeFileSync(counterPath, String(counter), 'utf8')
  }

  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const thirdSeg = counter < 100 ? String(counter).padStart(2, '0') : String(counter)
  const ver = `${yyyy}.${mm}.${thirdSeg}`
  const artifactName = `htql_client_v${ver}.exe`

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  pkg.version = ver
  if (!pkg.build) pkg.build = {}
  if (!pkg.build.win) pkg.build.win = {}
  pkg.build.win.artifactName = artifactName
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  console.log('[sync-version]', ver, '→', artifactName, skipBump ? '(skip bump)' : '')

  if (fs.existsSync(envProd)) {
    let env = fs.readFileSync(envProd, 'utf8')
    const line = `VITE_HTQL_550_VERSION=${ver}`
    if (/^\s*VITE_HTQL_550_VERSION=/m.test(env)) {
      env = env.replace(/^\s*VITE_HTQL_550_VERSION=.*$/m, line)
    } else {
      env = env.trimEnd() + '\r\n' + line + '\r\n'
    }
    fs.writeFileSync(envProd, env, 'utf8')
    console.log('[sync-version] .env.production', line)
  } else {
    console.warn('[sync-version] Không tìm thấy .env.production — bỏ qua.')
  }
}

main()
