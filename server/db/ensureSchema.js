/**
 * Tạo / cập nhật schema MySQL cho API Node.
 *
 * — Chạy mỗi lần PM2 khởi động API (`donViTinhServer.js` → `ensureSchema`).
 * — Bảng mới cho phân hệ / module: thêm khối `CREATE TABLE IF NOT EXISTS` tại đây;
 *   deploy gói server mới → tự tạo bảng, không cần client «tạo bảng» (client chỉ gọi REST/htql-kv).
 * — Dữ liệu nghiệp vụ (DVT, NCC, KH): cột `data JSON` + `version` (đồng bộ đa máy trạm).
 */
export const HTQL_MYSQL_SCHEMA_VERSION = 20260419

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
}

/** Danh sách bảng do ensureSchema quản lý (để log / tài liệu). */
export const HTQL_ENSURED_TABLES = [
  'don_vi_tinh',
  'nha_cung_cap',
  'khach_hang',
  'htql_client_registry',
  'htql_workstation',
  'htql_kv_store',
  'user_preferences',
  'htql_module_bundle',
  'htql_system_state',
  'htql_sync_log',
  'htql_sequence_ma',
  'htql_http_session',
]
