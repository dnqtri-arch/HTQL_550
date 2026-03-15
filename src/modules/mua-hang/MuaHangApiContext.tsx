/**
 * Context API cho Đơn mua hàng / Đề xuất mua hàng — form và danh sách dùng chung.
 */

import { createContext, useContext, type ReactNode } from 'react'
import type { DonMuaHangRecord, DonMuaHangChiTiet, DonMuaHangCreatePayload, DonMuaHangFilter } from './donMuaHangApi'

export interface MuaHangApi {
  getAll: (filter: DonMuaHangFilter) => DonMuaHangRecord[]
  getChiTiet: (donId: string) => DonMuaHangChiTiet[]
  delete: (donId: string) => void
  getDefaultFilter: () => DonMuaHangFilter
  getDateRangeForKy: (ky: string) => { tu: string; den: string }
  KY_OPTIONS: readonly { value: string; label: string }[]
  post: (payload: DonMuaHangCreatePayload) => DonMuaHangRecord
  put: (donId: string, payload: DonMuaHangCreatePayload) => void
  soDonHangTiepTheo: () => string
  getDraft: () => (Record<string, string> & { _dvtOptions?: string[] })[] | null
  setDraft: (lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>) => void
  clearDraft: () => void
}

const MuaHangApiContext = createContext<MuaHangApi | null>(null)

export function MuaHangApiProvider({ api, children }: { api: MuaHangApi; children: ReactNode }) {
  return <MuaHangApiContext.Provider value={api}>{children}</MuaHangApiContext.Provider>
}

export function useMuaHangApi(): MuaHangApi {
  const ctx = useContext(MuaHangApiContext)
  if (!ctx) throw new Error('useMuaHangApi must be used within MuaHangApiProvider')
  return ctx
}
