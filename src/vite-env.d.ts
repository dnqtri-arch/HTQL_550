/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Phiên bản web (package.json gốc) — gửi kèm header cho máy chủ. */
  readonly VITE_APP_VERSION?: string
  readonly VITE_HTQL_550_MAP_API_KEY: string
  readonly VITE_HTQL_550_VERSION?: string
  readonly VITE_HTQL_API_MODE?: string
  readonly VITE_HTQL_IP_LAN?: string
  readonly VITE_HTQL_IP_PUBLIC?: string
  readonly VITE_HTQL_API_PORT?: string
  /** Dev: 1 = gọi API server LAN/WAN (192.168.1.68:3001) thay vì chỉ localhost */
  readonly VITE_HTQL_DEV_USE_REMOTE_API?: string
  /** Dev: proxy Vite /api → URL này (khi không dùng base tuyệt đối) */
  readonly VITE_HTTP_PROXY_API_TARGET?: string
  /** Dev: cổng Vite (mặc định 5174 trong vite.config.ts) */
  readonly VITE_DEV_PORT?: string
  /** Tùy chọn: tên máy gửi kèm header (bản đóng gói có thể inject) */
  readonly VITE_HTQL_CLIENT_HOSTNAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Electron máy trạm (preload). */
interface Window {
  htqlDesktop?: {
    platform: string
    isElectron: boolean
    getInstallDiscovery?: () => Promise<{
      discoveredHost: string | null
      apiPort?: number | null
      scannedAt?: string | null
    }>
    saveServerPathsSnapshot?: (
      payload: import('./types/htqlServerPaths').HtqlServerPathsSnapshot
    ) => Promise<{ ok: boolean; path?: string; error?: string }>
    loadServerPathsSnapshot?: () => Promise<import('./types/htqlServerPaths').HtqlServerPathsSnapshot | null>
    /** Gọi sau khi initHtqlApiBase đã chọn base — để Electron main kiểm tra /api/htql-client-update-manifest */
    notifyResolvedApiBase?: (apiBase: string) => Promise<{ ok: boolean; path?: string; error?: string }>
    runInstallerUpdateCheck?: () => Promise<{ ok: boolean; error?: string }>
    /** IPv4 máy trạm (footer). */
    getClientIpv4?: () => Promise<string>
    /** Tiến trình tải file cài đặt (NSIS) sau khi user xác nhận cập nhật — trả hàm hủy lắng nghe. */
    onInstallerDownloadProgress?: (
      cb: (p: {
        received: number
        total: number | null
        bytesPerSecond?: number
        done?: boolean
      }) => void,
    ) => () => void
  }
}
