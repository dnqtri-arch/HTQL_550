/**
 * Đọc VERSION_TAG (VYYYY_MM_DD_NN) → cập nhật package.json (semver + artifactName) và .env.production (VITE_HTQL_550_VERSION).
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const tagPath = path.join(root, 'VERSION_TAG')
const pkgPath = path.join(root, 'package.json')
const envProd = path.join(root, '..', '..', '.env.production')

function parseTag(tag) {
  const m = String(tag)
    .trim()
    .match(/^V(\d{4})_(\d{2})_(\d{2})_(\d+)$/i)
  if (!m) throw new Error(`VERSION_TAG không đúng định dạng VYYYY_MM_DD_NN: ${tag}`)
  const y = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10)
  const d = parseInt(m[3], 10)
  const n = parseInt(m[4], 10)
  return { tag: `V${m[1]}_${m[2]}_${m[3]}_${m[4]}`, y, mo, d, n, semver: `${y}.${mo}.${d}-${n}` }
}

function main() {
  const raw = fs.readFileSync(tagPath, 'utf8').trim()
  const { tag, semver } = parseTag(raw)
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  pkg.version = semver
  if (!pkg.build) pkg.build = {}
  if (!pkg.build.win) pkg.build.win = {}
  pkg.build.win.artifactName = `HTQL_550_Setup_${tag}.exe`
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  console.log('[sync-version]', tag, '→ npm version', semver, '→', pkg.build.win.artifactName)

  if (fs.existsSync(envProd)) {
    let env = fs.readFileSync(envProd, 'utf8')
    const line = `VITE_HTQL_550_VERSION=${tag}`
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
