/**
 * Context API cho module Đề xuất mua hàng — tách biệt với Đơn mua hàng.
 */

import { createContext, useContext, type ReactNode } from 'react'
import type {
  DeXuatMuaHangRecord,
  DeXuatMuaHangChiTiet,
  DeXuatMuaHangCreatePayload,
  DeXuatMuaHangFilter,
} from './deXuatMuaHangApi'

export interface DeXuatMuaHangApi {
  getAll: (filter: DeXuatMuaHangFilter) => DeXuatMuaHangRecord[]
  getChiTiet: (donId: string) => DeXuatMuaHangChiTiet[]
  delete: (donId: string) => void
  getDefaultFilter: () => DeXuatMuaHangFilter
  getDateRangeForKy: (ky: string) => { tu: string; den: string }
  KY_OPTIONS: readonly { value: string; label: string }[]
  post: (payload: DeXuatMuaHangCreatePayload) => DeXuatMuaHangRecord
  put: (donId: string, payload: DeXuatMuaHangCreatePayload) => void
  soDonHangTiepTheo: () => string
  getDraft: () => (Record<string, string> & { _dvtOptions?: string[] })[] | null
  setDraft: (lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>) => void
  clearDraft: () => void
}

const DeXuatMuaHangApiContext = createContext<DeXuatMuaHangApi | null>(null)

export function DeXuatMuaHangApiProvider({ api, children }: { api: DeXuatMuaHangApi; children: ReactNode }) {
  return <DeXuatMuaHangApiContext.Provider value={api}>{children}</DeXuatMuaHangApiContext.Provider>
}

export function useDeXuatMuaHangApi(): DeXuatMuaHangApi {
  const ctx = useContext(DeXuatMuaHangApiContext)
  if (!ctx) throw new Error('useDeXuatMuaHangApi must be used within DeXuatMuaHangApiProvider')
  return ctx
}
