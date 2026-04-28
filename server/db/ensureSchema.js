/**
 * Tạo / cập nhật schema MySQL cho API Node.
 *
 * — Chạy mỗi lần PM2 khởi động API (`donViTinhServer.js` → `ensureSchema`). Purge `htql_http_session` chạy **sau** `listen` (nền), xem `purgeStaleHtqlHttpSessions`.
 * — Bảng mới cho phân hệ / module: thêm khối `CREATE TABLE IF NOT EXISTS` tại đây;
 *   deploy gói server mới → tự tạo bảng, không cần client «tạo bảng» (client chỉ gọi REST/htql-kv).
 * — Dữ liệu nghiệp vụ (DVT, NCC, KH): cột `data JSON` + `version` (đồng bộ đa máy trạm).
 */
import { PAPER_SIZE_SEED } from './paperSizesCatalog.js'

export const HTQL_MYSQL_SCHEMA_VERSION = 20260435

/**
 * Xoá dòng phiên cũ (theo batch) — giảm dung lượng bảng htql_http_session.
 * Nguyên nhân phình: request không gửi lại cookie → token mới mỗi lần → hàng triệu dòng `client_key` NULL.
 *
 * HTQL_HTTP_SESSION_PURGE_ON_START=0 tắt purge (dev).
 * Gọi từ **sau** `app.listen` (nền) — không chặn mở cổng 3001 khi bảng rất lớn.
 * `options.yieldMs`: nghỉ giữa các batch (ưu tiên request API).
 */
export async function purgeStaleHtqlHttpSessions(pool, options = {}) {
  const yieldMs = Math.min(Math.max(Number(options.yieldMs ?? NaN) || 0, 0), 5000)
  const maxRoundsOverride =
    options.maxRounds != null && Number.isFinite(Number(options.maxRounds)) ? Number(options.maxRounds) : null
  const force = Boolean(options.force)

  const off = String(process.env.HTQL_HTTP_SESSION_PURGE_ON_START ?? '1').trim().toLowerCase()
  if (!force && (off === '0' || off === 'false' || off === 'off')) return 0

  const batch = Math.min(Math.max(Number(process.env.HTQL_HTTP_SESSION_PURGE_BATCH || 20000) || 20000, 2000), 100000)
  const maxRoundsFromEnv = Math.min(Math.max(Number(process.env.HTQL_HTTP_SESSION_PURGE_MAX_ROUNDS || 2000) || 2000, 1), 5000)
  const maxRounds =
    maxRoundsOverride != null
      ? Math.min(Math.max(maxRoundsOverride, 1), 5000)
      : maxRoundsFromEnv
  const anonDays = Math.min(Math.max(Number(process.env.HTQL_HTTP_SESSION_ANONYMOUS_RETENTION_DAYS || 7) || 7, 1), 365)
  const days = Math.min(Math.max(Number(process.env.HTQL_HTTP_SESSION_RETENTION_DAYS || 60) || 60, 1), 730)

  let total = 0
  const yieldIfNeeded = async () => {
    if (yieldMs > 0) await new Promise((r) => setTimeout(r, yieldMs))
  }
  try {
    let rounds = 0
    while (rounds < maxRounds) {
      const [r] = await pool.query(
        `DELETE FROM htql_http_session WHERE client_key IS NULL AND last_seen_at < DATE_SUB(NOW(3), INTERVAL ? DAY) LIMIT ?`,
        [anonDays, batch],
      )
      const n = typeof r?.affectedRows === 'number' ? r.affectedRows : 0
      total += n
      if (!n) break
      rounds++
      await yieldIfNeeded()
    }
    rounds = 0
    while (rounds < maxRounds) {
      const [r] = await pool.query(
        `DELETE FROM htql_http_session WHERE last_seen_at < DATE_SUB(NOW(3), INTERVAL ? DAY) LIMIT ?`,
        [days, batch],
      )
      const n = typeof r?.affectedRows === 'number' ? r.affectedRows : 0
      total += n
      if (!n) break
      rounds++
      await yieldIfNeeded()
    }
    /** Xoá mọi dòng `client_key IS NULL` (lịch sử ẩn danh / bot); mặc định bật — API không còn ghi nhóm này. Tắt: HTQL_HTTP_SESSION_PURGE_ANONYMOUS_ALL=0 */
    const purgeAllAnon = String(process.env.HTQL_HTTP_SESSION_PURGE_ANONYMOUS_ALL ?? '1')
      .trim()
      .toLowerCase()
    if (purgeAllAnon !== '0' && purgeAllAnon !== 'false' && purgeAllAnon !== 'off') {
      rounds = 0
      while (rounds < maxRounds) {
        const [r] = await pool.query(`DELETE FROM htql_http_session WHERE client_key IS NULL LIMIT ?`, [batch])
        const n = typeof r?.affectedRows === 'number' ? r.affectedRows : 0
        total += n
        if (!n) break
        rounds++
        await yieldIfNeeded()
      }
    }
    if (total > 0) {
      console.log(`[HTQL_550] htql_http_session: đã xoá ${total} dòng phiên cũ (purge theo batch).`)
    }
  } catch (e) {
    console.warn('[HTQL_550] htql_http_session purge:', e?.message || e)
  }
  return total
}

/**
 * Dọn mạnh bảng phiên HTTP khi đã phình quá lớn.
 * mode:
 * - 'truncate': xoá toàn bộ nhanh nhất (không ảnh hưởng dữ liệu nghiệp vụ).
 * - 'optimize': chỉ tối ưu bảng để thu hồi phân mảnh.
 */
export async function compactHtqlHttpSessionTable(pool, mode = 'truncate') {
  const m = String(mode || 'truncate').trim().toLowerCase()
  if (m === 'optimize') {
    await pool.query('OPTIMIZE TABLE htql_http_session')
    return { mode: 'optimize', deleted: 0 }
  }
  const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM htql_http_session')
  await pool.query('TRUNCATE TABLE htql_http_session')
  await pool.query('ANALYZE TABLE htql_http_session')
  return { mode: 'truncate', deleted: Number(c) || 0 }
}

/**
 * Gộp phiên theo `X-HTQL-Client-Id` (một hàng / thiết bị) — tránh phình bảng khi cookie `htql_sess`
 * không gửi lại được (mỗi request tạo session_token mới).
 * Bảng rất lớn: chỉ tự dedupe khi < 250k dòng; ngược lại ghi cảnh báo (dedupe tay + tạo index).
 */
async function ensureHtqlHttpSessionClientKeyUnique(pool) {
  const idxName = 'ux_htql_http_session_client'
  try {
    const [ix] = await pool.query(
      `SELECT 1 AS ok FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = 'htql_http_session' AND index_name = ? LIMIT 1`,
      [idxName],
    )
    if (ix.length) return
  } catch {
    return
  }

  await pool
    .query(
      `UPDATE htql_http_session SET client_key = NULL
       WHERE client_key = '' OR LOWER(TRIM(client_key)) IN ('unknown', '-')`,
    )
    .catch(() => {})

  let total = 0
  try {
    const [[{ c }]] = await pool.query(`SELECT COUNT(*) AS c FROM htql_http_session`)
    total = Number(c) || 0
  } catch {
    return
  }

  const tryDedupe = async () => {
    await pool.query(`
      DELETE h1 FROM htql_http_session h1
      INNER JOIN htql_http_session h2
        ON h1.client_key = h2.client_key
        AND h1.client_key IS NOT NULL
        AND h1.client_key != ''
        AND LOWER(h1.client_key) NOT IN ('unknown', '-')
        AND (
          h2.last_seen_at > h1.last_seen_at
          OR (h2.last_seen_at = h1.last_seen_at AND h2.session_token > h1.session_token)
        )
    `)
  }

  try {
    await pool.query(`CREATE UNIQUE INDEX ${idxName} ON htql_http_session (client_key)`)
    return
  } catch (e) {
    const msg = String(e && e.message ? e.message : e)
    if (!/Duplicate|1062|ER_DUP_ENTRY/i.test(msg) && !/duplicate key/i.test(msg)) {
      console.warn(`[HTQL_550] ${idxName}:`, msg)
      return
    }
  }

  if (total >= 250_000) {
    console.warn(
      `[HTQL_550] htql_http_session có ~${total} dòng và trùng client_key — không tự dedupe (ngưỡng 250000). ` +
        `Chạy tay lệnh dedupe (DELETE JOIN giữ bản mới nhất theo last_seen_at) rồi: CREATE UNIQUE INDEX ${idxName} ON htql_http_session (client_key);`,
    )
    return
  }

  try {
    await tryDedupe()
    await pool.query(`CREATE UNIQUE INDEX ${idxName} ON htql_http_session (client_key)`)
  } catch (e2) {
    console.warn(`[HTQL_550] ${idxName} sau dedupe:`, e2.message || e2)
  }
}

export async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS don_vi_tinh (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      data JSON NOT NULL,
      version BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_dvt_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nha_cung_cap (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      data JSON NOT NULL,
      version BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_ncc_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS khach_hang (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      data JSON NOT NULL,
      version BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_kh_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS htql_doi_tac (
      partner_type ENUM('khach_hang', 'nha_cung_cap') NOT NULL,
      id INT NOT NULL,
      data JSON NOT NULL,
      version BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (partner_type, id),
      INDEX idx_htql_doi_tac_updated (updated_at),
      INDEX idx_htql_doi_tac_type (partner_type, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    INSERT INTO htql_doi_tac (partner_type, id, data, version, updated_at)
    SELECT 'khach_hang', id, data, version, updated_at
    FROM khach_hang
    ON DUPLICATE KEY UPDATE
      data = VALUES(data),
      version = GREATEST(htql_doi_tac.version, VALUES(version)),
      updated_at = GREATEST(htql_doi_tac.updated_at, VALUES(updated_at))
  `)
  await pool.query(`
    INSERT INTO htql_doi_tac (partner_type, id, data, version, updated_at)
    SELECT 'nha_cung_cap', id, data, version, updated_at
    FROM nha_cung_cap
    ON DUPLICATE KEY UPDATE
      data = VALUES(data),
      version = GREATEST(htql_doi_tac.version, VALUES(version)),
      updated_at = GREATEST(htql_doi_tac.updated_at, VALUES(updated_at))
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS htql_client_registry (
      ip VARCHAR(64) NOT NULL PRIMARY KEY,
      data JSON NOT NULL,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS htql_workstation (
      client_key VARCHAR(128) NOT NULL PRIMARY KEY,
      ip VARCHAR(64) NOT NULL,
      data JSON NOT NULL,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_ws_ip (ip)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS htql_kv_store (
      store_key VARCHAR(512) NOT NULL PRIMARY KEY,
      value_str LONGTEXT NOT NULL,
      version BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_kv_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      client_id VARCHAR(128) NOT NULL PRIMARY KEY,
      prefs_json JSON NOT NULL,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS htql_module_bundle (
      module_id VARCHAR(64) NOT NULL PRIMARY KEY,
      bundle_json JSON NOT NULL,
      version BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS htql_module_registry (
      module_id VARCHAR(64) NOT NULL PRIMARY KEY,
      table_name VARCHAR(64) NOT NULL,
      source ENUM('kv', 'bundle') NOT NULL DEFAULT 'kv',
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_mod_registry_table (table_name),
      INDEX idx_mod_registry_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS htql_module_data (
      module_id VARCHAR(64) NOT NULL,
      record_key VARCHAR(512) NOT NULL,
      value_str LONGTEXT NOT NULL,
      version BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (module_id, record_key),
      INDEX idx_mod_data_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS htql_system_state (
      singleton CHAR(1) NOT NULL PRIMARY KEY,
      system_version BIGINT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`INSERT IGNORE INTO htql_system_state (singleton, system_version) VALUES ('x', 0)`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS htql_sync_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      scope ENUM('kv', 'bundle') NOT NULL,
      ref_key VARCHAR(512) NULL,
      module_id VARCHAR(64) NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_htql_sync_log_id (id),
      INDEX idx_htql_sync_log_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS htql_sequence_ma (
      seq_key VARCHAR(64) NOT NULL PRIMARY KEY,
      last_num BIGINT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  /** Phiên HTTP (cookie htql_sess) — đồng bộ đa máy trạm / audit; gắn với X-HTQL-Client-Id khi có. */
  await pool.query(`
    CREATE TABLE IF NOT EXISTS htql_http_session (
      session_token VARCHAR(64) NOT NULL PRIMARY KEY,
      client_key VARCHAR(128) NULL,
      ip VARCHAR(64) NOT NULL DEFAULT '',
      user_agent VARCHAR(512) NOT NULL DEFAULT '',
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      last_seen_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_http_sess_last (last_seen_at),
      INDEX idx_http_sess_client (client_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS htql_record_edit_lock (
      module_id VARCHAR(64) NOT NULL,
      record_id VARCHAR(128) NOT NULL,
      lock_token VARCHAR(128) NOT NULL,
      client_key VARCHAR(128) NOT NULL DEFAULT '',
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (module_id, record_id),
      INDEX idx_htql_edit_lock_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS htql_paper_size (
      code VARCHAR(32) NOT NULL PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      width_m DECIMAL(10,4) NULL,
      height_m DECIMAL(10,4) NULL,
      width_mm INT NOT NULL,
      height_mm INT NOT NULL,
      aliases_json JSON NOT NULL,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_htql_paper_size_name (name),
      INDEX idx_htql_paper_size_size (width_mm, height_mm)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`ALTER TABLE htql_paper_size ADD COLUMN IF NOT EXISTS width_m DECIMAL(10,4) NULL`).catch(() => {})
  await pool.query(`ALTER TABLE htql_paper_size ADD COLUMN IF NOT EXISTS height_m DECIMAL(10,4) NULL`).catch(() => {})
  await pool.query(`
    UPDATE htql_paper_size
    SET
      width_m = CASE WHEN width_m IS NULL OR width_m <= 0 THEN ROUND(width_mm / 1000, 4) ELSE width_m END,
      height_m = CASE WHEN height_m IS NULL OR height_m <= 0 THEN ROUND(height_mm / 1000, 4) ELSE height_m END
  `).catch(() => {})
  for (const row of PAPER_SIZE_SEED) {
    const widthM = Number(row.widthM) || 0
    const heightM = Number(row.heightM) || 0
    const widthMm = Math.round(widthM * 1000)
    const heightMm = Math.round(heightM * 1000)
    await pool.query(
      `INSERT INTO htql_paper_size (code, name, width_m, height_m, width_mm, height_mm, aliases_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         width_m = VALUES(width_m),
         height_m = VALUES(height_m),
         width_mm = VALUES(width_mm),
         height_mm = VALUES(height_mm),
         aliases_json = VALUES(aliases_json),
         updated_at = CURRENT_TIMESTAMP(3)`,
      [
        String(row.code ?? ''),
        String(row.name ?? ''),
        widthM,
        heightM,
        widthMm,
        heightMm,
        JSON.stringify(Array.isArray(row.aliases) ? row.aliases : []),
      ],
    )
  }
  await ensureHtqlHttpSessionClientKeyUnique(pool)
}

/** Danh sách bảng do ensureSchema quản lý (để log / tài liệu). */
export const HTQL_ENSURED_TABLES = [
  'don_vi_tinh',
  'nha_cung_cap',
  'khach_hang',
  'htql_doi_tac',
  'htql_client_registry',
  'htql_workstation',
  'htql_kv_store',
  'user_preferences',
  'htql_module_bundle',
  'htql_module_registry',
  'htql_module_data',
  'htql_system_state',
  'htql_sync_log',
  'htql_sequence_ma',
  'htql_http_session',
  'htql_record_edit_lock',
  'htql_paper_size',
]
