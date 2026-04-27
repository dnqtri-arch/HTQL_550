/// <reference types="vite/client" />

type ConnectionState = { mode: 'offline' | 'lan' | 'wan'; host: string | null }

export type HtqlWorkstation = {
  id: string
  name: string
  host: string
  apiPort?: number
  webPort?: number
}

export type HtqlSettings = {
  ubuntuUser: string
  ubuntuPassword: string
  /** File .exe cài đặt client lần chọn gần nhất (gợi ý). */
  lastClientInstallerPath: string
  /** Đồng bộ với `/opt/htql550/server/.env` (HTQL_MYSQL_*) — đọc/ghi qua SSH. */
  mysqlHost?: string
  mysqlPort?: string
  mysqlDatabase?: string
  mysqlUser?: string
  mysqlPassword?: string
  workstations: HtqlWorkstation[]
}

export type HtqlRegistryClient = {
  clientKey?: string
  ip: string
  hostname?: string
  online?: boolean
  lastSeen: number
  clientVersion: string
  /** lan = API nội bộ; wan = Internet — từ header X-HTQL-Connection-Zone */
  connectionZone?: string
  lastPath?: string
}

type UploadProgress = { sent: number; total: number; pct: number; mbps: number }

type HttpJsonResult =
  | { ok: true; status?: number; json: unknown }
  | { ok: true; status?: number; text: string }
  | { ok: false; error: string }

declare global {
  const __APP_VERSION__: string

  interface Window {
    htqlControl: {
      getConnection: () => Promise<ConnectionState>
      onConnectionUpdate: (cb: (s: ConnectionState) => void) => () => void
      getSettings: () => Promise<HtqlSettings>
      setSettings: (data: Partial<HtqlSettings>) => Promise<HtqlSettings>
      minimize: () => Promise<void>
      toggleMaximize: () => Promise<void>
      close: () => Promise<void>
      openFile: (opts?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>
      openDirectory: () => Promise<string | null>
      uploadFile: (localPath: string, remotePath: string) => Promise<{ ok: boolean; error?: string }>
      onUploadProgress: (cb: (p: UploadProgress) => void) => () => void
      onSshLog: (cb: (s: string) => void) => () => void
      runServerUpdate: (payload: { extractedFolderName: string }) => Promise<{
        ok: boolean
        error?: string
        out?: string
        code?: number
      }>
      uploadClientInstaller: (localPath: string) => Promise<{ ok: boolean; error?: string; out?: string }>
      pm2Restart: () => Promise<{ ok: boolean; error?: string; out?: string }>
      pm2Logs: () => Promise<{ ok: boolean; error?: string; out?: string }>
      serverMetrics: () => Promise<{ ok: boolean; error?: string; text?: string; code?: number }>
      journalTail: () => Promise<{ ok: boolean; error?: string; text?: string }>
      fetchHtqlClientRegistry: () => Promise<HttpJsonResult>
      fetchHtqlMeta: () => Promise<HttpJsonResult>
      /** Thống kê bảng MySQL (GET /api/htql-mysql-tables). */
      fetchMysqlTables: () => Promise<HttpJsonResult>
      /** Danh sách module auto tạo bảng htql_mod_* (GET /api/htql-admin-module-tables). */
      fetchMysqlModuleTables: () => Promise<HttpJsonResult>
      /** Xem nhanh dữ liệu bảng MySQL (GET /api/htql-mysql-table-preview). */
      fetchMysqlTablePreview: (payload: { table: string; limit?: number }) => Promise<HttpJsonResult>
      /** Tóm tắt commit gần đây (để hiển thị popup trước khi cập nhật). */
      getRecentChanges: (payload?: { limit?: number }) => Promise<{ ok: boolean; lines: string[] }>
      /** Dọn bảng htql_http_session qua API nội bộ trên server (SSH curl localhost). */
      compactHttpSessions: (payload?: { mode?: 'truncate' | 'optimize'; target?: 'session' | 'logs' | 'all' }) => Promise<{
        ok: boolean
        error?: string
        out?: string
        json?: {
          ok?: boolean
          mode?: string
          target?: string
          session?: { mode?: string; deleted?: number }
          logs?: { deletedTotal?: number; details?: Array<{ table?: string; deleted?: number; mode?: string }> }
        }
      }>
      /** Đọc HTQL_MYSQL_* từ server/.env qua SSH (không qua HTTP). */
      pullMysqlEnv: () => Promise<
        | { ok: true; fields: Pick<HtqlSettings, 'mysqlHost' | 'mysqlPort' | 'mysqlDatabase' | 'mysqlUser' | 'mysqlPassword'> }
        | { ok: false; error: string }
      >
      /** Ghi HTQL_MYSQL_* lên server/.env + .mysql_password, pm2 restart --update-env. */
      pushMysqlEnv: (payload: {
        mysqlHost: string
        mysqlPort: string
        mysqlDatabase: string
        mysqlUser: string
        mysqlPassword: string
      }) => Promise<{ ok: boolean; error?: string; out?: string; code?: number }>
      serverHealth: () => Promise<{ ok: boolean; error?: string; text?: string }>
      probeWorkstation: (payload: {
        host: string
        apiPort?: number
        webPort?: number
      }) => Promise<{
        ok: boolean
        error?: string
        host?: string
        tcpApi?: { ok: boolean; error?: string }
        tcpWeb?: { ok: boolean; error?: string }
        httpMeta?: { ok: boolean; status?: number; json?: { version?: string }; text?: string; error?: string }
        apiUrl?: string
        webUrl?: string
      }>
      listServerArtifacts: () => Promise<{ ok: boolean; error?: string; files: string[] }>
      listClientArtifacts: () => Promise<{ ok: boolean; error?: string; files: string[] }>
      restoreServerFromZip: (fileName: string) => Promise<{ ok: boolean; error?: string; out?: string; code?: number }>
      restoreClientInstaller: (fileName: string) => Promise<{ ok: boolean; error?: string; out?: string }>
      listBackupSummary: () => Promise<{ ok: boolean; error?: string; text?: string }>
      getBackupCatalog: () => Promise<{
        ok: boolean
        error?: string
        meta?: Record<string, string>
        snapshots: Array<{ fileName: string; sizeBytes: number; mtime: string; type: string }>
        logBackup?: string
        logSync?: string
        cronHint?: string
      }>
      restoreBackupSnapshot: (fileName: string) => Promise<{ ok: boolean; error?: string; out?: string; code?: number }>
    }
  }
}

export {}
