-- HTQL_550 - Post-deploy MySQL verification checklist
-- Usage:
--   mysql -h127.0.0.1 -P3306 -u<user> -p <database> < deploy/mysql-post-deploy-checklist.sql
-- Focus:
--   - table size / growth
--   - sync throughput
--   - bundle vs kv balance

SELECT NOW() AS checked_at, DATABASE() AS db_name;

-- 1) Core table footprint (data + index)
SELECT
  table_name,
  table_rows AS row_estimate,
  ROUND((data_length + index_length) / 1024 / 1024, 2) AS total_mb,
  ROUND(data_length / 1024 / 1024, 2) AS data_mb,
  ROUND(index_length / 1024 / 1024, 2) AS index_mb,
  create_time,
  update_time
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'htql_module_bundle',
    'htql_module_data',
    'htql_kv_store',
    'htql_sync_log',
    'htql_http_session',
    'htql_workstation',
    'khach_hang',
    'nha_cung_cap',
    'don_vi_tinh'
  )
ORDER BY (data_length + index_length) DESC;

-- 2) Registry coverage for major + small modules
SELECT module_id, table_name, source, updated_at
FROM htql_module_registry
WHERE module_id IN (
  'bao_gia',
  'don_hang_ban_chung_tu',
  'hop_dong_ban_chung_tu',
  'don_hang_mua',
  'hop_dong_mua',
  'vat_tu_hang_hoa',
  'vthh_loai_custom',
  'vthh_nhom_custom',
  'vthh_thue_vat_custom',
  'don_vi_tinh',
  'khach_hang',
  'nha_cung_cap'
)
ORDER BY module_id;

-- 3) Bundle payload size by module (large modules expected here)
SELECT
  module_id,
  version,
  ROUND(OCTET_LENGTH(bundle_json) / 1024 / 1024, 2) AS bundle_mb,
  updated_at
FROM htql_module_bundle
ORDER BY OCTET_LENGTH(bundle_json) DESC
LIMIT 30;

-- 4) KV hot keys and payload size
SELECT
  store_key,
  version,
  ROUND(OCTET_LENGTH(value_str) / 1024, 2) AS value_kb,
  updated_at
FROM htql_kv_store
ORDER BY OCTET_LENGTH(value_str) DESC
LIMIT 40;

-- 5) module_data distribution (small modules should stay light)
SELECT
  module_id,
  COUNT(*) AS records,
  ROUND(SUM(OCTET_LENGTH(value_str)) / 1024 / 1024, 2) AS total_value_mb,
  MAX(updated_at) AS last_update
FROM htql_module_data
GROUP BY module_id
ORDER BY total_value_mb DESC, records DESC
LIMIT 40;

-- 6) sync log throughput (today + 7 days)
SELECT
  DATE(created_at) AS day,
  scope,
  COUNT(*) AS entries
FROM htql_sync_log
WHERE created_at >= NOW() - INTERVAL 7 DAY
GROUP BY DATE(created_at), scope
ORDER BY day DESC, scope;

-- 7) delta pressure snapshot (last 60 minutes)
SELECT
  scope,
  COUNT(*) AS entries_last_60m
FROM htql_sync_log
WHERE created_at >= NOW() - INTERVAL 60 MINUTE
GROUP BY scope
ORDER BY entries_last_60m DESC;

-- 8) active workstation/session health
SELECT COUNT(*) AS workstation_count FROM htql_workstation;

SELECT
  COUNT(*) AS session_rows,
  SUM(CASE WHEN last_seen_at >= NOW() - INTERVAL 10 MINUTE THEN 1 ELSE 0 END) AS active_10m,
  SUM(CASE WHEN last_seen_at >= NOW() - INTERVAL 60 MINUTE THEN 1 ELSE 0 END) AS active_60m
FROM htql_http_session;

-- 9) Warning flags for operational review
SELECT
  CASE WHEN (
    SELECT COUNT(*)
    FROM htql_sync_log
    WHERE created_at >= NOW() - INTERVAL 60 MINUTE
  ) > 500000
  THEN 'WARN: htql_sync_log high write rate in last 60m'
  ELSE 'OK: htql_sync_log write rate'
  END AS sync_log_rate_status;

SELECT
  CASE WHEN (
    SELECT ROUND((data_length + index_length) / 1024 / 1024, 2)
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'htql_http_session'
  ) > 1024
  THEN 'WARN: htql_http_session > 1 GB, consider compact/truncate maintenance'
  ELSE 'OK: htql_http_session size'
  END AS http_session_size_status;
