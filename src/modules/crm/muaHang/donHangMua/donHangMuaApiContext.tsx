/**
 * Context API cho Đơn hàng mua — form và danh sách trong module donhangmua.
 */

import { createContext, useContext, type ReactNode } from 'react'
import type { DonHangMuaRecord, DonHangMuaChiTiet, DonHangMuaCreatePayload, DonHangMuaFilter } from './donHangMuaApi'

export interface DonHangMuaApi {
  getAll: (filter: DonHangMuaFilter) => DonHangMuaRecord[]
  getChiTiet: (donId: string) => DonHangMuaChiTiet[]
  delete: (donId: string) => void
  getDefaultFilter: () => DonHangMuaFilter
  getDateRangeForKy: (ky: string) => { tu: string; den: string }
  KY_OPTIONS: readonly { value: string; label: string }[]
  post: (payload: DonHangMuaCreatePayload) => Promise<DonHangMuaRecord>
  put: (donId: string, payload: DonHangMuaCreatePayload) => void
  soDonHangTiepTheo: () => string
  getDraft: () => (Record<string, string> & { _dvtOptions?: string[] })[] | null
  setDraft: (lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>) => void
  clearDraft: () => void
}

const DonHangMuaApiContext = createContext<DonHangMuaApi | null>(null)

export function DonHangMuaApiProvider({ api, children }: { api: DonHangMuaApi; children: ReactNode }) {
  return <DonHangMuaApiContext.Provider value={api}>{children}</DonHangMuaApiContext.Provider>
}

export function useDonHangMuaApi(): DonHangMuaApi {
  const ctx = useContext(DonHangMuaApiContext)
  if (!ctx) throw new Error('useDonHangMuaApi must be used within DonHangMuaApiProvider')
  return ctx
}
