import { htqlApiUrl } from '../config/htqlApiBase'

/** Bộ lọc / tuỳ chọn UI theo máy trạm — MySQL `user_preferences` (header `X-HTQL-Client-Id` + cookie `htql_sess`). */
export async function userPreferencesGet(): Promise<Record<string, unknown>> {
  try {
    const r = await fetch(htqlApiUrl('/api/user-preferences'), { credentials: 'include' })
    if (!r.ok) return {}
    const j = (await r.json()) as { prefs?: unknown }
    const p = j.prefs
    return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export async function userPreferencesPut(patch: Record<string, unknown>): Promise<void> {
  const r = await fetch(htqlApiUrl('/api/user-preferences'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ prefs: patch }),
  })
  if (!r.ok) throw new Error(`user-preferences PUT ${r.status}`)
}
