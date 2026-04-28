/**
 * Module storage — mô hình tối ưu MySQL (một nguồn mirror cho KV/bundle)
 *
 * 1) hop_dong_ban_chung_tu vs hop_dong_ban_chung_tu_chi_tiet (và mọi cặp *_list / *_chi_tiet cũ trong htql_mod_*)
 *    - Trên client, dữ liệu nằm ở các khóa KV khác nhau (vd: htql_hop_dong_ban_chung_tu_list vs …_chi_tiet).
 *    - Bảng legacy htql_mod_hop_dong_ban_chung_tu và htql_mod_…_chi_tiet chỉ là hai “kho” mirror tách nhau — dễ trùng lặp trong information_schema.
 *    - Trong htql_module_data CẢ HAI được gộp vào cùng module_id = hop_dong_ban_chung_tu, khác record_key (đúng khóa KV).
 *    → Không cần hai bảng SQL vật lý; sau backfill + dropAllLegacyHtqlModTables chỉ còn htql_module_data.
 *
 * 2) khach_hang vs htql_mod_khach_hang
 *    - khach_hang: bảng entity chuẩn (id + data JSON) phục vụ GET/POST /api/khach-hang — nguồn sự thật cho danh mục KH qua REST.
 *    - htql_mod_khach_hang: bản mirror cũ theo pattern htql_mod_* (record_key/value_str) — trùng mục đích với các dòng trong htql_module_data (module_id khach_hang).
 *    → Không gộp khach_hang vào htql_module_data trong một bước đơn giản: đổi schema + toàn bộ API/UI. Tối ưu hiện tại: giữ khach_hang; xóa htql_mod_khach_hang sau mirror.
 *
 * 3) don_vi_tinh, nha_cung_cap: cùng lớp entity JSON như khach_hang. KV/htql_module_data giữ chứng từ & cấu hình đồng bộ máy trạm; không nhân đôi entity vào htql_mod_*.
 */

const MODULE_ID_MAX = 64
const TABLE_NAME = 'htql_module_data'
const REGISTRY_TABLE = 'htql_module_registry'
const BUNDLE_TABLE_NAME = 'htql_module_bundle'
const LEGACY_TABLE_PREFIX = 'htql_mod_'
const MODULE_TABLE_NAME_MAX = 64

const MODULE_ALIASES = new Map([
  ['baogia', 'bao_gia'],
  ['bao_gia_chi_tiet', 'bao_gia'],
  ['loai_thu_chi', 'thu_chi_tien'],
  ['donhangbanchungtu', 'don_hang_ban_chung_tu'],
  ['don_hang_ban_chi_tiet', 'don_hang_ban'],
  ['don_hang_ban_chung_tu_chi_tiet', 'don_hang_ban_chung_tu'],
  ['don_hang_mua_chi_tiet', 'don_hang_mua'],
  ['hop_dong_ban_chung_tu_chi_tiet', 'hop_dong_ban_chung_tu'],
  ['hop_dong_mua_chi_tiet', 'hop_dong_mua'],
  ['nhan_vat_tu_hang_hoa_chi_tiet', 'nhan_vat_tu_hang_hoa'],
  ['phu_luc_hop_dong_ban_chung_tu_chi_tiet', 'phu_luc_hop_dong_ban_chung_tu'],
  ['thu_tien_bang_chi_tiet', 'thu_tien_bang'],
  ['chi_tien_bang_chi_tiet', 'chi_tien_bang'],
  ['chi_tien_bang_ghi_so', 'chi_tien_bang'],
  ['thu_chi_tien_ghi_so', 'thu_chi_tien'],
  ['hoa_don_ban_chi_tiet', 'hoa_don_ban'],
  ['so_chi_tiet_tien_mat_ghi_so', 'thu_chi_tien'],
  ['so_chi_tiet_tk_nh_ghi_so', 'thu_chi_tien'],
  ['chi_tien_so_chi_tiet_tien_mat', 'chi_tien_bang'],
  ['chi_tien_so_chi_tiet_tk_nh', 'chi_tien_bang'],
  ['sync_log_last_id', 'sync_meta'],
])

const MODULE_ROOTS = [
  'bao_gia',
  'don_hang_ban_chung_tu',
  'don_hang_ban',
  'don_hang_mua',
  'hop_dong_ban_chung_tu',
  'hop_dong_mua',
  'phu_luc_hop_dong_ban_chung_tu',
  'nhan_vat_tu_hang_hoa',
  'thu_tien_bang',
  'chi_tien_bang',
  'hoa_don_ban',
  'vat_tu_hang_hoa',
  'khach_hang',
  'nha_cung_cap',
  'don_vi_tinh',
  'danh_muc_kho',
  'vthh_loai_custom',
  'vthh_nhom_custom',
  'vthh_thue_vat_custom',
  'vthh_kho_giay_custom',
  'vthh_dinh_luong_custom',
  'thu_chi_tien',
]

function normalizeModuleToken(input) {
  const raw = String(input || '')
    .trim()
    .toLowerCase()
  if (!raw) return ''
  return raw
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MODULE_ID_MAX)
}

function canonicalizeModuleId(rawModuleId) {
  let moduleId = normalizeModuleToken(rawModuleId)
  if (!moduleId) return ''
  moduleId = MODULE_ALIASES.get(moduleId) || moduleId
  for (const root of MODULE_ROOTS) {
    if (moduleId === root || moduleId.startsWith(`${root}_`)) return root
  }
  return moduleId
}

export function moduleIdFromKvKey(storeKey) {
  const key = String(storeKey || '').trim().toLowerCase()
  if (!key.startsWith('htql')) return ''
  let core = key
  if (core.startsWith('htql550_')) core = core.slice('htql550_'.length)
  else if (core.startsWith('htql_')) core = core.slice('htql_'.length)
  const moduleId = canonicalizeModuleId(core)
  if (!moduleId) return ''
  return moduleId
}

function hash36(s) {
  let h = 0
  const x = String(s || '')
  for (let i = 0; i < x.length; i++) h = Math.imul(31, h) + x.charCodeAt(i) | 0
  return (h >>> 0).toString(36)
}

function moduleTableNameFromModuleId(moduleIdRaw) {
  const moduleId = canonicalizeModuleId(moduleIdRaw)
  if (!moduleId) throw new Error('moduleId rỗng hoặc không hợp lệ')
  let suffix = moduleId
  const prefix = `${LEGACY_TABLE_PREFIX}`
  const maxSuffix = MODULE_TABLE_NAME_MAX - prefix.length
  if (suffix.length > maxSuffix) {
    const hs = hash36(suffix).slice(0, 8)
    const head = suffix.slice(0, Math.max(8, maxSuffix - hs.length - 1))
    suffix = `${head}_${hs}`
  }
  return `${prefix}${suffix}`
}

export function tableNameFromModuleId(moduleIdRaw, source = 'kv') {
  if (String(source || '').trim().toLowerCase() === 'bundle') return BUNDLE_TABLE_NAME
  if (!moduleIdRaw) return TABLE_NAME
  return moduleTableNameFromModuleId(moduleIdRaw)
}

function escIdent(name) {
  if (!/^[a-z0-9_]+$/i.test(name)) {
    throw new Error(`Tên định danh SQL không hợp lệ: ${name}`)
  }
  return `\`${name}\``
}

async function ensureSharedModuleTable(pool) {
  const t = escIdent(TABLE_NAME)
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${t} (
      module_id VARCHAR(64) NOT NULL,
      record_key VARCHAR(512) NOT NULL,
      value_str LONGTEXT NOT NULL,
      version BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (module_id, record_key),
      INDEX idx_mod_data_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  )
}

async function ensureModuleTable(pool, moduleIdRaw) {
  const tableName = moduleTableNameFromModuleId(moduleIdRaw)
  const t = escIdent(tableName)
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${t} (
      module_id VARCHAR(64) NOT NULL,
      record_key VARCHAR(512) NOT NULL,
      value_str LONGTEXT NOT NULL,
      version BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (module_id, record_key),
      INDEX idx_mod_data_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  )
  return tableName
}

async function ensureRegistryTable(pool) {
  const t = escIdent(REGISTRY_TABLE)
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${t} (
      module_id VARCHAR(64) NOT NULL PRIMARY KEY,
      table_name VARCHAR(64) NOT NULL,
      source ENUM('kv', 'bundle') NOT NULL DEFAULT 'kv',
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_mod_registry_table (table_name),
      INDEX idx_mod_registry_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  )
}

async function upsertRegistry(pool, moduleId, tableName, source) {
  await pool.query(
    `INSERT INTO ${REGISTRY_TABLE} (module_id, table_name, source)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE table_name = VALUES(table_name), source = VALUES(source), updated_at = CURRENT_TIMESTAMP(3)`,
    [moduleId, tableName, source || 'kv'],
  )
}

export async function ensureModuleMysqlTable(pool, moduleIdRaw, source = 'kv') {
  const moduleId = canonicalizeModuleId(moduleIdRaw)
  if (!moduleId) throw new Error('moduleId rỗng hoặc không hợp lệ')
  const sourceNorm = String(source || 'kv').trim().toLowerCase() === 'bundle' ? 'bundle' : 'kv'
  await ensureRegistryTable(pool)
  let tableName = TABLE_NAME
  if (sourceNorm === 'bundle') {
    tableName = BUNDLE_TABLE_NAME
  } else {
    await ensureSharedModuleTable(pool)
    tableName = await ensureModuleTable(pool, moduleId)
  }
  await upsertRegistry(pool, moduleId, tableName, sourceNorm)
  return { moduleId, tableName }
}

async function upsertSharedRow(pool, moduleIdRaw, recordKey, value, version, source) {
  const { moduleId, tableName } = await ensureModuleMysqlTable(pool, moduleIdRaw, source)
  const t = escIdent(tableName)
  await pool.query(
    `INSERT INTO ${t} (module_id, record_key, value_str, version)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE value_str = VALUES(value_str), version = GREATEST(version, VALUES(version)), updated_at = CURRENT_TIMESTAMP(3)`,
    [moduleId, String(recordKey || ''), String(value ?? ''), Number(version) || 0],
  )
}

async function migrateRowsFromLegacyModTable(pool, physicalTableName, moduleId) {
  const t = escIdent(physicalTableName)
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME AS c
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [physicalTableName],
  )
  const names = new Set((cols || []).map((x) => String(x.c || '').toLowerCase()))
  const keyCol = names.has('record_key')
    ? 'record_key'
    : names.has('store_key')
      ? 'store_key'
      : null
  if (!keyCol || !names.has('value_str')) {
    return { migrated: 0, skipped: true }
  }
  const verExpr = names.has('version') ? 'version' : '0'
  const [rows] = await pool.query(
    `SELECT \`${keyCol}\` AS record_key, value_str, ${verExpr} AS version FROM ${t}`,
  )
  const list = Array.isArray(rows) ? rows : []
  for (const r of list) {
    await upsertSharedRow(pool, moduleId, r.record_key, r.value_str, r.version, 'kv')
  }
  return { migrated: list.length, skipped: false }
}

async function consolidateLegacyModuleTables(pool) {
  const [legacy] = await pool.query(
    `SELECT TABLE_NAME AS table_name
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND TABLE_NAME LIKE ?
       AND TABLE_NAME <> ?`,
    [`${LEGACY_TABLE_PREFIX}%`, TABLE_NAME],
  )
  for (const row of legacy) {
    const tableName = String(row.table_name || '').trim()
    if (!tableName || tableName === TABLE_NAME) continue
    const suffix = tableName.slice(LEGACY_TABLE_PREFIX.length)
    const moduleId = canonicalizeModuleId(suffix)
    if (!moduleId) continue
    const expectedTable = moduleTableNameFromModuleId(moduleId)
    if (tableName === expectedTable) continue
    const t = escIdent(tableName)
    try {
      const { migrated, skipped } = await migrateRowsFromLegacyModTable(pool, tableName, moduleId)
      if (skipped) {
        const [[{ c }]] = await pool.query(`SELECT COUNT(*) AS c FROM ${t}`)
        const n = Number(c) || 0
        if (n === 0) {
          await pool.query(`DROP TABLE ${t}`)
          console.log(`[HTQL_550] htql_mod: đã xóa bảng rỗng (không đọc được schema cũ): ${tableName}`)
        } else {
          console.warn(
            `[HTQL_550] htql_mod migrate: giữ bảng (cần xem tay — không đọc được cột chuẩn): ${tableName} (${n} dòng) → module ${moduleId}`,
          )
        }
        continue
      }
      if (migrated > 0) {
        console.log(`[HTQL_550] htql_mod migrate: ${tableName} → htql_module_data (${migrated} dòng, module ${moduleId})`)
      }
    } catch (e) {
      console.warn(`[HTQL_550] htql_mod migrate lỗi ${tableName}:`, e?.message || e)
      continue
    }
    try {
      await pool.query(`DROP TABLE ${t}`)
    } catch (e2) {
      console.warn(`[HTQL_550] htql_mod DROP ${tableName}:`, e2?.message || e2)
    }
  }
}

async function syncModuleRegistryToPerModuleTable(pool) {
  const [rows] = await pool.query(`SELECT module_id, source FROM ${escIdent(REGISTRY_TABLE)}`)
  for (const r of rows || []) {
    const moduleId = canonicalizeModuleId(String(r.module_id || ''))
    if (!moduleId) continue
    const source = String(r.source || 'kv').trim().toLowerCase() === 'bundle' ? 'bundle' : 'kv'
    const tableName = source === 'bundle' ? BUNDLE_TABLE_NAME : moduleTableNameFromModuleId(moduleId)
    await upsertRegistry(pool, moduleId, tableName, source)
  }
}

/**
 * Sau khi đã mirror KV + bundle vào htql_module_data, gỡ mọi bảng vật lý cũ `htql_mod_*`
 * (tránh phân tán; module mới chỉ cần thêm module_id trong htql_module_data — không tạo bảng mới).
 * Giữ bảng legacy: HTQL_KEEP_LEGACY_MOD_TABLES=1
 */
export async function dropAllLegacyHtqlModTables(pool) {
  if (String(process.env.HTQL_KEEP_LEGACY_MOD_TABLES ?? '0').trim() === '1') {
    console.log('[HTQL_550] Giữ bảng htql_mod_* (HTQL_KEEP_LEGACY_MOD_TABLES=1)')
    return
  }
  await ensureRegistryTable(pool)
  const [regRows] = await pool.query(`SELECT table_name FROM ${escIdent(REGISTRY_TABLE)}`)
  const inUse = new Set((regRows || []).map((r) => String(r.table_name || '').trim()).filter(Boolean))
  const [legacy] = await pool.query(
    `SELECT TABLE_NAME AS table_name
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND TABLE_NAME REGEXP '^htql_mod_[a-zA-Z0-9_]+$'`,
  )
  for (const row of legacy) {
    const name = String(row.table_name || '').trim()
    if (!name) continue
    if (inUse.has(name)) continue
    const id = escIdent(name)
    try {
      await pool.query(`DROP TABLE IF EXISTS ${id}`)
      console.log(`[HTQL_550] Đã gỡ bảng legacy htql_mod_*: ${name}`)
    } catch (e) {
      console.warn(`[HTQL_550] Không DROP được ${name}:`, e?.message || e)
    }
  }
}

/**
 * Xóa bảng module cũ không còn được registry sử dụng.
 * Mặc định bật (đặt HTQL_DROP_UNUSED_MODULE_TABLES=0 để giữ lại).
 */
export async function dropUnusedModuleTables(pool) {
  const off = String(process.env.HTQL_DROP_UNUSED_MODULE_TABLES ?? '1').trim().toLowerCase()
  if (off === '0' || off === 'false' || off === 'off') return
  await ensureRegistryTable(pool)
  const [regRows] = await pool.query(`SELECT table_name FROM ${escIdent(REGISTRY_TABLE)}`)
  const inUse = new Set((regRows || []).map((r) => String(r.table_name || '').trim()).filter(Boolean))
  const [tables] = await pool.query(
    `SELECT TABLE_NAME AS table_name
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND TABLE_NAME LIKE ?`,
    [`${LEGACY_TABLE_PREFIX}%`],
  )
  for (const row of tables || []) {
    const t = String(row.table_name || '').trim()
    if (!t) continue
    if (inUse.has(t)) continue
    try {
      await pool.query(`DROP TABLE IF EXISTS ${escIdent(t)}`)
      console.log(`[HTQL_550] Đã xóa bảng module không còn dùng: ${t}`)
    } catch (e) {
      console.warn(`[HTQL_550] Không xóa được bảng module cũ ${t}:`, e?.message || e)
    }
  }
}

export async function backfillModuleMysqlTables(pool) {
  await ensureSharedModuleTable(pool)
  await ensureRegistryTable(pool)
  for (const moduleId of MODULE_ROOTS) {
    const tableName = await ensureModuleTable(pool, moduleId)
    await upsertRegistry(pool, moduleId, tableName, 'kv')
  }
  await consolidateLegacyModuleTables(pool)
  await syncModuleRegistryToPerModuleTable(pool)

  const [kvRows] = await pool.query(`SELECT store_key, value_str, version FROM htql_kv_store WHERE store_key LIKE 'htql%'`)
  for (const r of kvRows) {
    const key = String(r.store_key || '')
    const moduleId = moduleIdFromKvKey(key)
    if (!moduleId) continue
    await upsertSharedRow(pool, moduleId, key, r.value_str, r.version, 'kv')
  }

  await dropUnusedModuleTables(pool)
  await dropAllLegacyHtqlModTables(pool)
}

