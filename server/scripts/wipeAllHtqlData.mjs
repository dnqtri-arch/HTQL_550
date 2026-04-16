/**
 * Xóa toàn bộ nghiệp vụ HTQL:
 * - MySQL: TRUNCATE các bảng do ensureSchema quản lý (khi đã cấu hình server/.env).
 * - File (fallback / đồng bộ dev): `data/donViTinh.json`, `nhaCungCap.json`, `khachHang.json` → `[]`;
 *   `htqlClientRegistry.json` → `{}`; `htql_kv_store.json` → `{}` nếu tồn tại.
 *
 * Chạy: từ gốc repo `node server/scripts/wipeAllHtqlData.mjs` hoặc `npm run wipe-data` (thư mục gốc).
 * Nên dừng API (pm2 / npm run dev) trước khi chạy; khởi động lại sau.
 *
 * Không xóa file đính kèm trên SSD (hdct/thietke/vthh) — xóa tay trên server nếu cần.
 */
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createMysqlPool } from '../db/mysqlPool.js'
import { HTQL_ENSURED_TABLES } from '../db/ensureSchema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SERVER_DIR = path.join(__dirname, '..')
dotenv.config({ path: path.join(SERVER_DIR, '.env') })

const INSTALL_ROOT = process.env.HTQL_INSTALL_ROOT
  ? path.resolve(process.env.HTQL_INSTALL_ROOT)
  : path.resolve(path.join(SERVER_DIR, '..'))

const DATA_DIR = process.env.HTQL_DATA_DIR
  ? path.resolve(process.env.HTQL_DATA_DIR)
  : path.join(INSTALL_ROOT, 'data')

function wipeJsonFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const writes = [
    ['donViTinh.json', '[]\n'],
    ['nhaCungCap.json', '[]\n'],
    ['khachHang.json', '[]\n'],
    ['htqlClientRegistry.json', '{}\n'],
  ]
  for (const [name, content] of writes) {
    const p = path.join(DATA_DIR, name)
    fs.writeFileSync(p, content, 'utf8')
    process.stdout.write(`[wipe] Ghi: ${p}\n`)
  }
  const kv = path.join(DATA_DIR, 'htql_kv_store.json')
  if (fs.existsSync(kv)) {
    fs.writeFileSync(kv, '{}\n', 'utf8')
    process.stdout.write(`[wipe] Đã làm rỗng: ${kv}\n`)
  } else {
    process.stdout.write(`[wipe] Không có ${kv} (OK)\n`)
  }
}

async function wipeMysql() {
  const pool = createMysqlPool()
  if (!pool) {
    process.stdout.write(
      '[wipe] MySQL: không cấu hình (thiếu HTQL_MYSQL_* / DB_* trong server/.env) — chỉ ghi lại file JSON trong data/.\n',
    )
    return
  }
  const conn = await pool.getConnection()
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS=0')
    for (const t of HTQL_ENSURED_TABLES) {
      await conn.query(`TRUNCATE TABLE \`${t}\``)
      process.stdout.write(`[wipe] MySQL TRUNCATE: ${t}\n`)
    }
    await conn.query('SET FOREIGN_KEY_CHECKS=1')
  } finally {
    conn.release()
    await pool.end()
  }
}

async function main() {
  process.stdout.write(`[wipe] DATA_DIR=${DATA_DIR}\n`)
  await wipeMysql()
  wipeJsonFiles()
  process.stdout.write('[wipe] Hoàn tất.\n')
}

main().catch((e) => {
  process.stderr.write(String(e?.stack || e) + '\n')
  process.exit(1)
})
