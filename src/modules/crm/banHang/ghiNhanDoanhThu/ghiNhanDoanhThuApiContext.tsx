/**
 * Context API cho Nhận vật tư hàng hóa (NVTHH) — form và danh sách trong module GhiNhanDoanhThu.
 */

import { createContext, useContext, type ReactNode } from 'react'
import type {
  GhiNhanDoanhThuRecord,
  GhiNhanDoanhThuChiTiet,
  GhiNhanDoanhThuCreatePayload,
  GhiNhanDoanhThuFilter,
} from './ghiNhanDoanhThuApi'

export interface GhiNhanDoanhThuApi {
  getAll: (filter: GhiNhanDoanhThuFilter) => GhiNhanDoanhThuRecord[]
  getChiTiet: (donId: string) => GhiNhanDoanhThuChiTiet[]
  delete: (donId: string) => void
  getDefaultFilter: () => GhiNhanDoanhThuFilter
  getDateRangeForKy: (ky: string) => { tu: string; den: string }
  KY_OPTIONS: readonly { value: string; label: string }[]
  post: (payload: GhiNhanDoanhThuCreatePayload) => Promise<GhiNhanDoanhThuRecord>
  put: (donId: string, payload: GhiNhanDoanhThuCreatePayload) => void
  soDonHangTiepTheo: () => string
  getDraft: () => (Record<string, string> & { _dvtOptions?: string[] })[] | null
  setDraft: (lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>) => void
  clearDraft: () => void
}

const GhiNhanDoanhThuApiContext = createContext<GhiNhanDoanhThuApi | null>(null)

export function GhiNhanDoanhThuApiProvider({ api, children }: { api: GhiNhanDoanhThuApi; children: ReactNode }) {
  return <GhiNhanDoanhThuApiContext.Provider value={api}>{children}</GhiNhanDoanhThuApiContext.Provider>
}

export function useGhiNhanDoanhThuApi(): GhiNhanDoanhThuApi {
  const ctx = useContext(GhiNhanDoanhThuApiContext)
  if (!ctx) throw new Error('useGhiNhanDoanhThuApi must be used within GhiNhanDoanhThuApiProvider')
  return ctx
}
