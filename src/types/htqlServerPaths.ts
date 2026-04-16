/** Phản hồi /api/htql-meta (mở rộng đường dẫn lưu trữ trên máy chủ). Các path có thể thiếu — dùng deriveHtqlMetaPaths. */
export type HtqlMetaPaths = {
  /** Gốc cài trên Ubuntu (vd /opt/htql550) */
  installRoot?: string
  /** SSD 2TB — đính kèm / thiết kế (HTQL_ROOT_SSD) */
  ssdRoot?: string
  /** Dữ liệu JSON / HTQL_DATA_DIR */
  pathDuLieu?: string
  /** File hóa đơn, chứng từ đính kèm */
  pathHoaDonChungTu?: string
  /** File thiết kế */
  pathThietKe?: string
  /** Ảnh VTHH (tab Đặc tính) — mặc định cùng cây HTQL_ROOT_SSD (vd /ssd_2tb/htql_550/vthh) */
  pathVthhHinhAnh?: string
  /** Cơ sở dữ liệu (SQLite / thư mục DB trên máy chủ) */
  pathCoSoDuLieu?: string
  /** Backup dữ liệu ứng dụng + dump DB */
  pathBackupDuLieu?: string
  /** Backup đồng bộ cộng dồn chứng từ / thiết kế */
  pathBackupCtTk?: string
  /** Thư mục gói zip cập nhật server (bản sao trên SSD) */
  pathUpdateServer?: string
  /** Thư mục gói cài client .exe/.dmg + manifest */
  pathUpdateClient?: string
  /** Hostname máy chủ (Node os.hostname) */
  serverHostName?: string
  storageBackend?: 'mysql' | 'json'
  mysqlDatabase?: string
  mysqlHost?: string
  mysqlPort?: string
  /** Server bật HTQL_DEMO_MODE — nên dùng DB MySQL riêng cho thử nghiệm */
  demoMode?: boolean
  /** Giải thích: chứng từ nghiệp vụ đồng bộ qua htql_kv_store */
  kvStoreBusinessDataNote?: string
  /** `mysql` | `cookie_only` — phiên HTTP có ghi bảng htql_http_session hay chỉ cookie */
  httpSessionStorage?: 'mysql' | 'cookie_only'
}

/** Sau khi chuẩn hóa derive, đủ trường đường dẫn để hiển thị. */
export type HtqlMetaResponse = HtqlMetaPaths & {
  name: string
  version: string
  webAppVersion: string
  /** @deprecated Dùng pathDuLieu — giữ tương thích */
  dataDir?: string
}

/** Snapshot lưu máy trạm (htql-server-paths.json). */
export type HtqlServerPathsSnapshot = {
  savedAt: string
  apiBase: string
  connected: boolean
  /** LAN = mạng nội bộ (RFC1918); Online = WAN / IP công khai */
  connectionMode?: 'LAN' | 'Online'
  server: {
    name: string
    version: string
    webAppVersion: string
  }
  paths: {
    duLieu: string
    hoaDonChungTu: string
    thietKe: string
    coSoDuLieu?: string
    backupDuLieu?: string
    backupCtTk?: string
  }
}
