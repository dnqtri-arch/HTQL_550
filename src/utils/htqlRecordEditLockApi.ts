import { htqlApiUrl } from '../config/htqlApiBase'
import { ensureDeviceId } from './htqlKvSync'

function clientHeaders(): Record<string, string> {
  return { 'X-HTQL-Client-Id': ensureDeviceId(), 'Content-Type': 'application/json' }
}

export async function htqlRecordEditLockAcquire(
  moduleId: string,
  recordId: string,
  lockToken: string,
): Promise<{ ok: true; stolen?: boolean } | { ok: false; reason: string }> {
  const r = await fetch(
    htqlApiUrl(
      `/api/htql-record-lock/${encodeURIComponent(moduleId)}/${encodeURIComponent(recordId)}/acquire`,
    ),
    {
      method: 'POST',
      headers: clientHeaders(),
      credentials: 'include',
      body: JSON.stringify({ lockToken }),
    },
  )
  const j = (await r.json().catch(() => ({}))) as { ok?: unknown; reason?: string; stolen?: boolean }
  if (r.ok && j && j.ok === true) return { ok: true, stolen: Boolean(j.stolen) }
  if (r.status === 409) return { ok: false, reason: j.reason || 'locked' }
  if (!r.ok) throw new Error(`htql-record-lock acquire ${r.status}`)
  return { ok: false, reason: 'unknown' }
}

export async function htqlRecordEditLockHeartbeat(
  moduleId: string,
  recordId: string,
  lockToken: string,
): Promise<boolean> {
  const r = await fetch(
    htqlApiUrl(
      `/api/htql-record-lock/${encodeURIComponent(moduleId)}/${encodeURIComponent(recordId)}/heartbeat`,
    ),
    {
      method: 'POST',
      headers: clientHeaders(),
      credentials: 'include',
      body: JSON.stringify({ lockToken }),
    },
  )
  return r.ok
}

export async function htqlRecordEditLockRelease(
  moduleId: string,
  recordId: string,
  lockToken: string,
): Promise<void> {
  await fetch(
    htqlApiUrl(
      `/api/htql-record-lock/${encodeURIComponent(moduleId)}/${encodeURIComponent(recordId)}/release`,
    ),
    {
      method: 'POST',
      headers: clientHeaders(),
      credentials: 'include',
      body: JSON.stringify({ lockToken }),
    },
  )
}
