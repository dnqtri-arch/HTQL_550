import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './app'
import { initHtqlApiBase, getHtqlApiOrigin, getHtqlConnectionMode } from './config/htqlApiBase'
import { bootstrapHtqlKvSync, ensureDeviceId, flushHtqlKvPendingSync, htqlKvPollNow } from './utils/htqlKvSync'
import {
  bootstrapHtqlModuleBundleSyncPoll,
  htqlModuleBundleVersionsPollNow,
} from './utils/htqlModuleBundleSyncPoll'
import './styles/global.css'
import './styles/MisaStyle.css'

const hn = (import.meta.env.VITE_HTQL_CLIENT_HOSTNAME as string | undefined) || ''

function clientVersionForHeaders(): string {
  return (
    (import.meta.env.VITE_HTQL_550_VERSION as string | undefined)?.trim() ||
    (import.meta.env.VITE_APP_VERSION as string | undefined)?.trim() ||
    ''
  )
}

function connectionZoneHeader(): string {
  const m = getHtqlConnectionMode()
  if (m === 'Online') return 'wan'
  return 'lan'
}

if (typeof window !== 'undefined') {
  try {
    ensureDeviceId()
  } catch {
    // ignore
  }
}

/** Gửi cùng header cho fetch và axios — máy chủ ghi nhận máy trạm (htql_workstation / registry). */
function applyHtqlWorkstationHeaders(target: Headers | Record<string, string>) {
  const set = (name: string, value: string) => {
    if (target instanceof Headers) target.set(name, value)
    else target[name] = value
  }
  const ver = clientVersionForHeaders()
  set('X-HTQL-Client-Version', ver || '')
  try {
    set('X-HTQL-Client-Id', ensureDeviceId())
  } catch {
    set('X-HTQL-Client-Id', 'unknown')
  }
  set('X-HTQL-Client-Online', typeof navigator !== 'undefined' && navigator.onLine ? '1' : '0')
  set('X-HTQL-Connection-Zone', connectionZoneHeader())
  if (hn) set('X-HTQL-Client-Hostname', hn)
}

if (typeof window !== 'undefined') {
  const origFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const addHeaders = (h: Headers) => applyHtqlWorkstationHeaders(h)
    if (typeof input === 'string' || input instanceof URL) {
      const h = new Headers(init?.headers)
      addHeaders(h)
      return origFetch(input, {
        ...init,
        headers: h,
        credentials: init?.credentials ?? 'include',
      })
    }
    const req = input as Request
    const h = new Headers(req.headers)
    addHeaders(h)
    return origFetch(new Request(req, { headers: h, credentials: req.credentials ?? 'include' }))
  }

  axios.defaults.withCredentials = true

  axios.interceptors.request.use((config) => {
    config.withCredentials = true
    const h = config.headers
    if (h && typeof (h as { set?: (a: string, b: string) => void }).set === 'function') {
      const hdr = h as { set: (a: string, b: string) => void }
      const ver = clientVersionForHeaders()
      hdr.set('X-HTQL-Client-Version', ver || '')
      try {
        hdr.set('X-HTQL-Client-Id', ensureDeviceId())
      } catch {
        hdr.set('X-HTQL-Client-Id', 'unknown')
      }
      hdr.set('X-HTQL-Client-Online', typeof navigator !== 'undefined' && navigator.onLine ? '1' : '0')
      hdr.set('X-HTQL-Connection-Zone', connectionZoneHeader())
      if (hn) hdr.set('X-HTQL-Client-Hostname', hn)
    } else {
      const o = (h || {}) as Record<string, string>
      applyHtqlWorkstationHeaders(o)
      config.headers = o as typeof config.headers
    }
    return config
  })
}

void initHtqlApiBase().then(async () => {
  const origin = getHtqlApiOrigin()
  if (origin && typeof window !== 'undefined' && window.htqlDesktop?.notifyResolvedApiBase) {
    try {
      await window.htqlDesktop.notifyResolvedApiBase(origin)
    } catch {
      /* main có thể chưa sẵn sàng — timer trong main.cjs vẫn thử lại */
    }
  }
  await bootstrapHtqlKvSync()
  bootstrapHtqlModuleBundleSyncPoll()
  if (typeof window !== 'undefined') {
    ;(window as unknown as { __htqlFlushKvSync?: () => Promise<void> }).__htqlFlushKvSync = () =>
      flushHtqlKvPendingSync()
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        htqlKvPollNow()
        void htqlModuleBundleVersionsPollNow()
      }
    })
    window.addEventListener('online', () => htqlKvPollNow())
    window.addEventListener('pagehide', () => {
      void flushHtqlKvPendingSync()
    })
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
