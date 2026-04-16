/**
 * Migration: cấu trúc cũ trên SSD (tiền tố module: bao_gia/, don_hang_mua/, …)
 * → cấu trúc mới (không tiền tố) + cập nhật chuỗi trong htql_kv_store.
 *
 * Chạy một lần trên máy chủ (sau backup):
 *   cd /opt/htql550/server && node migrateStorageLayout.js
 *
 * Hoặc bật một lần: HTQL_STORAGE_MIGRATE_ON_START=1 pm2 restart … --update-env
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import dotenv from 'dotenv'
import { createMysqlPool, useMysqlStorage } from './db/mysqlPool.js'
import { tryBootstrapMysqlDatabase } from './db/mysqlBootstrap.js'
import { ensureSchema } from './db/ensureSchema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

/** Tiền tố thư mục cấp 1 cũ — ưu tiên chuỗi dài trước khi thay trong KV. */
export const LEGACY_FOLDER_PREFIXES = [
  'phu_luc_hop_dong_ban',
  'hop_dong_ban',
  'hop_dong_mua',
  'don_hang_mua',
  'don_hang_ban',
  'thu_tien_bang',
  'chi_tien_bang',
  'bao_gia',
]

function resolveInstallRoot() {
  return process.env.HTQL_INSTALL_ROOT
    ? path.resolve(process.env.HTQL_INSTALL_ROOT)
    : path.resolve(path.join(__dirname, '..'))
}

function resolveDataDir(installRoot) {
  return process.env.HTQL_DATA_DIR ? path.resolve(process.env.HTQL_DATA_DIR) : path.join(installRoot, 'data')
}

function resolveSsdPaths() {
  const INSTALL_ROOT = resolveInstallRoot()
  const IS_LINUX_OPT = INSTALL_ROOT.startsWith('/opt/')
  const SSD_ROOT = process.env.HTQL_ROOT_SSD
    ? path.resolve(process.env.HTQL_ROOT_SSD)
    : IS_LINUX_OPT
      ? '/ssd_2tb/htql_550'
      : ''
  const DATA_DIR = resolveDataDir(INSTALL_ROOT)
  const PATH_HOADON_CHUNG_TU = process.env.HTQL_PATH_HOADON_CHUNG_TU
    ? path.resolve(process.env.HTQL_PATH_HOADON_CHUNG_TU)
    : SSD_ROOT
      ? path.join(SSD_ROOT, 'hdct')
      : path.join(DATA_DIR, 'hdct')
  const PATH_THIET_KE = process.env.HTQL_PATH_THIET_KE
    ? path.resolve(process.env.HTQL_PATH_THIET_KE)
    : SSD_ROOT
      ? path.join(SSD_ROOT, 'thietke')
      : path.join(DATA_DIR, 'thietke')
  return { INSTALL_ROOT, DATA_DIR, SSD_ROOT, PATH_HOADON_CHUNG_TU, PATH_THIET_KE }
}

/** Bỏ tiền tố legacy trong chuỗi (virtual_path, JSON KV, …). */
export function stripLegacyVirtualPathPrefixes(s) {
  if (typeof s !== 'string' || !s) return s
  let out = s
  for (const p of LEGACY_FOLDER_PREFIXES) {
    const a = `${p}/`
    const b = `${p}\\`
    while (out.includes(a)) out = out.split(a).join('')
    while (out.includes(b)) out = out.split(b).join('')
  }
  return out
}

function mergeEntry(from, to) {
  if (!fs.existsSync(from)) return 0
  const st = fs.lstatSync(from)
  if (st.isFile()) {
    if (fs.existsSync(to)) {
      process.stderr.write(`[migrate] bỏ qua (đích đã tồn tại): ${to}\n`)
      return 0
    }
    fs.renameSync(from, to)
    return 1
  }
  if (!st.isDirectory()) return 0
  if (!fs.existsSync(to)) {
    fs.renameSync(from, to)
    return 1
  }
  const toSt = fs.lstatSync(to)
  if (!toSt.isDirectory()) {
    process.stderr.write(`[migrate] bỏ qua (đích không phải thư mục): ${to}\n`)
    return 0
  }
  let n = 0
  for (const name of fs.readdirSync(from)) {
    n += mergeEntry(path.join(from, name), path.join(to, name))
  }
  try {
    if (fs.existsSync(from) && fs.readdirSync(from).length === 0) fs.rmdirSync(from)
  } catch {
    /* ignore */
  }
  return n
}

/** Đưa nội dung base/<prefix>/* lên base/*. */
export function promoteLegacyFirstSegment(baseDir, prefix) {
  if (!baseDir || !fs.existsSync(baseDir)) return { promoted: 0, removed: false }
  const legacyRoot = path.join(baseDir, prefix)
  if (!fs.existsSync(legacyRoot) || !fs.statSync(legacyRoot).isDirectory()) {
    return { promoted: 0, removed: false }
  }
  let promoted = 0
  for (const name of fs.readdirSync(legacyRoot)) {
    promoted += mergeEntry(path.join(legacyRoot, name), path.join(baseDir, name))
  }
  let removed = false
  try {
    if (fs.existsSync(legacyRoot) && fs.readdirSync(legacyRoot).length === 0) {
      fs.rmdirSync(legacyRoot)
      removed = true
    }
  } catch {
    /* ignore */
  }
  return { promoted, removed }
}

export function migrateDiskBases(pathThietKe, pathChungTu) {
  const bases = [
    ['PATH_THIET_KE', pathThietKe],
    ['PATH_HOADON_CHUNG_TU', pathChungTu],
  ]
  const summary = []
  for (const [label, base] of bases) {
    if (!base || !fs.existsSync(base)) {
      summary.push({ label, skipped: true })
      continue
    }
    const perPrefix = {}
    for (const prefix of LEGACY_FOLDER_PREFIXES) {
      perPrefix[prefix] = promoteLegacyFirstSegment(base, prefix)
    }
    summary.push({ label, base, perPrefix })
  }
  return summary
}

const KV_FILE = 'htql_kv_store.json'

export async function migrateKvStoreStrings(mysqlPool, dataDir) {
  let rowsUpdated = 0
  let keysTouched = 0

  if (mysqlPool) {
    const [rows] = await mysqlPool.query(
      `SELECT store_key, value_str, version FROM htql_kv_store`,
    )
    for (const r of rows) {
      const next = stripLegacyVirtualPathPrefixes(r.value_str)
      if (next === r.value_str) continue
      await mysqlPool.query(
        `UPDATE htql_kv_store SET value_str = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP(3) WHERE store_key = ?`,
        [next, r.store_key],
      )
      keysTouched++
      rowsUpdated++
    }
  }

  const kvPath = path.join(dataDir, KV_FILE)
  if (fs.existsSync(kvPath)) {
    try {
      const raw = fs.readFileSync(kvPath, 'utf8')
      const j = JSON.parse(raw)
      if (j && typeof j === 'object' && !Array.isArray(j)) {
        let fileChanged = false
        for (const k of Object.keys(j)) {
          const row = j[k]
          if (!row || typeof row.value !== 'string') continue
          const next = stripLegacyVirtualPathPrefixes(row.value)
          if (next === row.value) continue
          j[k] = { ...row, value: next, version: (row.version ?? 0) + 1 }
          fileChanged = true
          keysTouched++
          rowsUpdated++
        }
        if (fileChanged) {
          fs.writeFileSync(kvPath, JSON.stringify(j, null, 2), 'utf8')
        }
      }
    } catch (e) {
      process.stderr.write(`[migrate] cảnh báo htql_kv_store.json: ${e}\n`)
    }
  }

  return { rowsUpdated, keysTouched }
}

/**
 * @param {{ pathThietKe: string, pathHoaDonChungTu: string, mysqlPool: import('mysql2/promise').Pool | null, dataDir: string }} o
 */
export async function runMigrateStorageLayout(o) {
  const disk = migrateDiskBases(o.pathThietKe, o.pathHoaDonChungTu)
  const kv = await migrateKvStoreStrings(o.mysqlPool, o.dataDir)
  return { disk, kv, paths: { pathThietKe: o.pathThietKe, pathHoaDonChungTu: o.pathHoaDonChungTu } }
}

async function cliMain() {
  const { PATH_THIET_KE, PATH_HOADON_CHUNG_TU, DATA_DIR } = resolveSsdPaths()
  process.stdout.write(
    `[migrate] PATH_THIET_KE=${PATH_THIET_KE}\n[migrate] PATH_HOADON_CHUNG_TU=${PATH_HOADON_CHUNG_TU}\n[migrate] DATA_DIR=${DATA_DIR}\n`,
  )

  let mysqlPool = null
  if (useMysqlStorage()) {
    await tryBootstrapMysqlDatabase()
    mysqlPool = createMysqlPool()
    await ensureSchema(mysqlPool)
  }

  const result = await runMigrateStorageLayout({
    pathThietKe: PATH_THIET_KE,
    pathHoaDonChungTu: PATH_HOADON_CHUNG_TU,
    mysqlPool,
    dataDir: DATA_DIR,
  })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  process.stdout.write('[migrate] xong.\n')
  if (mysqlPool) await mysqlPool.end()
}

function isMainModule() {
  const a = process.argv[1]
  if (!a) return false
  try {
    return import.meta.url === pathToFileURL(path.resolve(a)).href
  } catch {
    return false
  }
}
if (isMainModule()) {
  cliMain().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
