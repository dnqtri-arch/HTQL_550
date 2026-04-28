-- =============================================================================
-- Bảo trì bảng htql_http_session — giảm số dòng & dung lượng InnoDB (~GB khi phình)
-- =============================================================================
--
-- Bảng này chỉ lưu bản ghi phiên HTTP (cookie htql_sess + tùy chọn audit).
-- Dữ liệu nghiệp vụ (báo giá, KV, module bundle, …) nằm ở bảng KHÁC.
-- Xóa dòng trong htql_http_session KHÔNG xóa chứng từ / dữ liệu đã ghi MySQL thật.
--
-- Trước khi chạy: backup DB hoặc ít nhất bảng này:
--   mysqldump -u... -p... your_db htql_http_session > htql_http_session_backup.sql
--
-- Trên server API nên có: HTQL_HTTP_SESSION_ANONYMOUS_DB=0 (mặc định code) để
-- không tạo thêm hàng client_key NULL; purge khi khởi động: ensureSchema (xem .env).
--
-- =============================================================================
-- A) Thống kê (chạy trước)
-- =============================================================================

-- SELECT COUNT(*) AS total FROM htql_http_session;
-- SELECT COUNT(*) AS anon FROM htql_http_session WHERE client_key IS NULL;
-- SELECT COUNT(*) AS with_client FROM htql_http_session WHERE client_key IS NOT NULL;
-- SELECT MIN(last_seen_at) AS oldest, MAX(last_seen_at) AS newest FROM htql_http_session;

-- =============================================================================
-- B) Xóa theo lứa tuổi (an toàn — giữ phiên còn “gần đây”)
-- Đổi INTERVAL … DAY theo nhu cầu (7 / 30 / 60 / 90).
-- =============================================================================

-- B1) Phiên ẩn danh (client_key NULL) — thường chiếm phần lớn ~9M dòng:
--     Chạy LẶP lệnh này nhiều lần cho đến khi affected rows = 0 (hoặc dùng vòng lặp shell).
/*
DELETE FROM htql_http_session
WHERE client_key IS NULL
  AND last_seen_at < DATE_SUB(NOW(3), INTERVAL 7 DAY)
LIMIT 50000;
*/

-- B2) Mọi phiên (kể cả có client_key) quá cũ:
/*
DELETE FROM htql_http_session
WHERE last_seen_at < DATE_SUB(NOW(3), INTERVAL 60 DAY)
LIMIT 50000;
*/

-- =============================================================================
-- C) Xóa mạnh toàn bộ phiên ẩn danh (không cần giữ lịch sử bot/crawler)
-- Chỉ dùng khi chấp nhận mất toàn bộ dòng client_key NULL (cookie ẩn danh).
-- Chạy lặp cho đến hết (mỗi lần tối đa LIMIT).
-- =============================================================================

/*
DELETE FROM htql_http_session WHERE client_key IS NULL LIMIT 100000;
*/

-- =============================================================================
-- D) Không cần bảng này cho audit: tắt ghi DB + dọn sạch
-- 1) Trên Ubuntu: trong server/.env đặt HTQL_HTTP_SESSION_DB=0 rồi pm2 restart API.
-- 2) Cookie htql_sess vẫn hoạt động; chỉ không INSERT/UPDATE vào MySQL.
-- 3) Sau đó có thể:
-- =============================================================================

-- TRUNCATE TABLE htql_http_session;

-- (Hoặc giữ bảng rỗng bằng DELETE lặp nếu không muốn TRUNCATE.)

-- =============================================================================
-- E) Sau khi xóa hàng triệu dòng — thu hồi không gian & cập nhật thống kê
-- Chạy ngoài giờ cao điểm (InnoDB có thể khóa ngắn).
-- =============================================================================

-- OPTIMIZE TABLE htql_http_session;
-- ANALYZE TABLE htql_http_session;

-- =============================================================================
-- F) Trùng client_key (hiếm khi cần) — xem ensureSchema.js dedupe + index UNIQUE
-- =============================================================================

-- =============================================================================
-- G) Purge qua API (sau khi deploy bản có route) — không cần mật khẩu MySQL trên cron host
-- Chỉ localhost nếu chưa đặt HTQL_MAINTENANCE_TOKEN trong server/.env
--   curl -sS -X POST "http://127.0.0.1:3001/api/htql-maintenance/purge-http-sessions?rounds=1200"
-- Dọn mạnh (xóa toàn bộ session): 
--   curl -sS -X POST "http://127.0.0.1:3001/api/htql-maintenance/compact-http-sessions?mode=truncate"
-- Chỉ optimize:
--   curl -sS -X POST "http://127.0.0.1:3001/api/htql-maintenance/compact-http-sessions?mode=optimize"
-- =============================================================================
