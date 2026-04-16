import { getHtqlApiOrigin, htqlApiUrl } from '../config/htqlApiBase'

export type HtqlUploadKind = 'thiet_ke' | 'chung_tu' | 'vthh_hinh'

/**
 * Có thể gọi POST /api/htql-upload (file lên SSD).
 * - Base tuyệt đối (LAN/WAN/Electron discovery): dùng trực tiếp.
 * - `resolvedBase` rỗng: vẫn gọi được qua **URL tương đối** `/api/...` (Vite dev proxy → 3001,
 *   hoặc Nginx cùng host). Trước đây chỉ nhìn `getHtqlApiOrigin()` → dev luôn tắt upload.
 * - `file://` không có origin: không upload (fallback data URL).
 */
export function htqlCanUploadToServer(): boolean {
  if (getHtqlApiOrigin()?.trim()) return true
  if (typeof window === 'undefined') return false
  const p = window.location?.protocol
  return p === 'http:' || p === 'https:'
}

export function htqlFileDownloadUrl(kind: HtqlUploadKind, relativePath: string): string {
  const q = `kind=${encodeURIComponent(kind)}&rel=${encodeURIComponent(relativePath)}`
  return htqlApiUrl(`/api/htql-files?${q}`)
}

/** Xóa file trên SSD (đính kèm / ảnh VTHH) khi gỡ khỏi form hoặc xóa chứng từ. */
export async function htqlDeleteFileOnServer(kind: HtqlUploadKind, relativePath: string): Promise<void> {
  const q = new URLSearchParams({
    kind,
    rel: relativePath,
  })
  const url = htqlApiUrl(`/api/htql-files?${q.toString()}`)
  const r = await fetch(url, { method: 'DELETE', credentials: 'include' })
  if (!r.ok) {
    let msg = `HTTP ${r.status}`
    try {
      const j = (await r.json()) as { error?: string }
      if (j?.error) msg = String(j.error)
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
}

export async function htqlUploadFileToServer(
  file: Blob | File,
  opts: { kind: HtqlUploadKind; relativeDir: string; filename: string },
): Promise<{ relativePath: string; kind: HtqlUploadKind; size: number }> {
  const fd = new FormData()
  fd.append('file', file, opts.filename)
  const q = new URLSearchParams({
    kind: opts.kind,
    relativeDir: opts.relativeDir,
    filename: opts.filename,
  })
  const url = htqlApiUrl(`/api/htql-upload?${q.toString()}`)
  const r = await fetch(url, { method: 'POST', body: fd })
  if (!r.ok) {
    let msg = `HTTP ${r.status}`
    try {
      const j = await r.json()
      if (j?.error) msg = String(j.error)
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  const j = (await r.json()) as {
    ok?: boolean
    relativePath?: string
    kind?: string
    size?: number
  }
  if (!j.relativePath) throw new Error('Phản hồi upload thiếu relativePath')
  let kindNorm: HtqlUploadKind = 'chung_tu'
  if (j.kind === 'thiet_ke') kindNorm = 'thiet_ke'
  else if (j.kind === 'vthh_hinh') kindNorm = 'vthh_hinh'
  return {
    relativePath: j.relativePath,
    kind: kindNorm,
    size: Number(j.size) || file.size,
  }
}
