import { htqlApiUrl } from '../config/htqlApiBase'

export type HtqlThietKeAttachmentLike = {
  virtual_path?: string
  server_relative_path?: string
  name?: string
}

function normPath(s: string | undefined): string {
  return String(s ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
}

function shouldAttemptMoveFrom(fromRel: string): boolean {
  const f = normPath(fromRel)
  return f.startsWith('_pending_dktk/') || f.startsWith('kh_unknown/')
}

/** POST /api/htql-files-move — chỉ thiết kế (SSD `thietke`). */
export async function htqlMoveThietKeOnServer(fromRel: string, toRel: string): Promise<void> {
  const url = htqlApiUrl('/api/htql-files-move')
  const r = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'thiet_ke', fromRel: normPath(fromRel), toRel: normPath(toRel) }),
  })
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

/**
 * Sau `chuanHoaDuongDanDinhKem*`: nếu file đã có trên server dưới `_pending_dktk/` hoặc `kh_unknown/`
 * và `virtual_path` mới trỏ tới thư mục KH thật → rename vật lý trên ổ, cập nhật `server_relative_path`.
 */
export async function htqlReconcileThietKeServerPaths<T extends HtqlThietKeAttachmentLike>(
  before: T[],
  after: T[]
): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < after.length; i++) {
    const prev = i < before.length ? before[i] : undefined
    const next = { ...after[i]! } as T
    const from = normPath(prev?.server_relative_path)
    const to = normPath(next.virtual_path)
    if (from && to && from !== to && shouldAttemptMoveFrom(from)) {
      try {
        await htqlMoveThietKeOnServer(from, to)
        ;(next as HtqlThietKeAttachmentLike).server_relative_path = to
      } catch {
        /* giữ nguyên server_relative_path cũ */
      }
    }
    out.push(next)
  }
  return out
}
