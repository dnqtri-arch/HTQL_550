/**
 * Đồng bộ đa máy cho module dùng `htql_module_bundle` (MySQL) — không ghi vào htql_kv_store,
 * nên poll GET /api/htql-kv không thấy thay đổi. Poll phiên bản bundle song song với KV.
 *
 * Khi thêm module mới: `htqlModuleBundlePut` + hàm `*FetchBundleAndApply` phải gọi **`htqlModuleBundleGet`**
 * (không tự fetch URL bundle) — ETag/F5 đã xử lý tập trung trong `htqlModuleBundleApi.ts`.
 * Bổ sung `moduleId` vào `tick` / `applyDeltaBundleModule` và sự kiện UI tương ứng.
 */
import { htqlModuleBundleVersionsGet } from './htqlModuleBundleApi'
import { HTQL_SYNC_DELTA_BUNDLE_EVENT } from './htqlSyncDeltaClient'
import { KV_POLL_INTERVAL_MS } from './htqlKvSync'
import { BAO_GIA_MODULE_ID, baoGiaFetchBundleAndApply, HTQL_BAO_GIA_RELOAD_EVENT } from '../modules/crm/banHang/baoGia/baoGiaApi'
import {
  DON_HANG_BAN_CHUNG_TU_MODULE_ID,
  donHangBanChungTuFetchBundleAndApply,
} from '../modules/crm/banHang/donHangBan/donHangBanChungTuApi'
import { HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT } from '../modules/crm/banHang/banHangTabEvent'

const lastSeen: Record<string, number> = {}
let timer: number | null = null
let inFlight = false
const BUNDLE_POLL_TIMEOUT_MS = 10000

function withTimeout<T>(promise: Promise<T>, timeoutMs: number = BUNDLE_POLL_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('bundle poll timeout')), timeoutMs)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

export async function htqlModuleBundleVersionsPollNow(): Promise<void> {
  await tick()
}

async function applyDeltaBundleModule(moduleId: string): Promise<void> {
  if (moduleId === BAO_GIA_MODULE_ID) {
    try {
      const v = await baoGiaFetchBundleAndApply()
      lastSeen[moduleId] = v
      window.dispatchEvent(new CustomEvent(HTQL_BAO_GIA_RELOAD_EVENT))
    } catch {
      /* retry poll sau */
    }
    return
  }
  if (moduleId === DON_HANG_BAN_CHUNG_TU_MODULE_ID) {
    try {
      const v = await donHangBanChungTuFetchBundleAndApply()
      lastSeen[moduleId] = v
      window.dispatchEvent(new CustomEvent(HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT))
    } catch {
      /* retry */
    }
    return
  }
  try {
    const remote = await withTimeout(htqlModuleBundleVersionsGet())
    lastSeen[moduleId] = Number(remote[moduleId]) || 0
  } catch {
    /* offline */
  }
}

function onDeltaBundleEv(ev: Event): void {
  const mid = (ev as CustomEvent<{ moduleId?: string }>).detail?.moduleId
  if (!mid || typeof mid !== 'string') return
  void applyDeltaBundleModule(mid)
}

async function tick(): Promise<void> {
  if (inFlight || typeof window === 'undefined') return
  inFlight = true
  try {
    const remote = await htqlModuleBundleVersionsGet()
    for (const [moduleId, ver] of Object.entries(remote)) {
      const n = Number(ver) || 0
      const prev = lastSeen[moduleId]
      if (prev !== undefined && n === prev) continue

      if (moduleId === BAO_GIA_MODULE_ID) {
        try {
          await baoGiaFetchBundleAndApply()
          lastSeen[moduleId] = n
          window.dispatchEvent(new CustomEvent(HTQL_BAO_GIA_RELOAD_EVENT))
        } catch {
          /* không ghi lastSeen — thử lại khi poll sau */
        }
      } else if (moduleId === DON_HANG_BAN_CHUNG_TU_MODULE_ID) {
        try {
          await donHangBanChungTuFetchBundleAndApply()
          lastSeen[moduleId] = n
          window.dispatchEvent(new CustomEvent(HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT))
        } catch {
          /* không ghi lastSeen */
        }
      } else {
        lastSeen[moduleId] = n
      }
    }
  } catch {
    /* offline */
  } finally {
    inFlight = false
  }
}

/** Gọi sau khi `bootstrapHtqlKvSync` thành công (cùng tần suất poll KV). */
export function bootstrapHtqlModuleBundleSyncPoll(): void {
  if (typeof window === 'undefined') return
  if (timer) return
  window.addEventListener(HTQL_SYNC_DELTA_BUNDLE_EVENT, onDeltaBundleEv)
  void tick()
  timer = window.setInterval(() => void tick(), KV_POLL_INTERVAL_MS)
}
