/**
 * Context API cho Hợp đồng mua — form và danh sách trong module donhangmua.
 */

import { createContext, useContext, type ReactNode } from 'react'
import type { HopDongMuaRecord, HopDongMuaChiTiet, HopDongMuaCreatePayload, HopDongMuaFilter } from './hopDongMuaApi'

export interface HopDongMuaApi {
  getAll: (filter: HopDongMuaFilter) => HopDongMuaRecord[]
  getChiTiet: (donId: string) => HopDongMuaChiTiet[]
  delete: (donId: string) => void
  getDefaultFilter: () => HopDongMuaFilter
  getDateRangeForKy: (ky: string) => { tu: string; den: string }
  KY_OPTIONS: readonly { value: string; label: string }[]
  post: (payload: HopDongMuaCreatePayload) => HopDongMuaRecord
  put: (donId: string, payload: HopDongMuaCreatePayload) => void
  soDonHangTiepTheo: () => string
  getDraft: () => (Record<string, string> & { _dvtOptions?: string[] })[] | null
  setDraft: (lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>) => void
  clearDraft: () => void
}

const HopDongMuaApiContext = createContext<HopDongMuaApi | null>(null)

export function HopDongMuaApiProvider({ api, children }: { api: HopDongMuaApi; children: ReactNode }) {
  return <HopDongMuaApiContext.Provider value={api}>{children}</HopDongMuaApiContext.Provider>
}

export function useHopDongMuaApi(): HopDongMuaApi {
  const ctx = useContext(HopDongMuaApiContext)
  if (!ctx) throw new Error('useHopDongMuaApi must be used within HopDongMuaApiProvider')
  return ctx
}
