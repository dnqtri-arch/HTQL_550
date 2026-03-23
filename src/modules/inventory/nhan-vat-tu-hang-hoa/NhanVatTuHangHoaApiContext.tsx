/**
 * Context API cho Nhận vật tư hàng hóa (NVTHH) — form và danh sách trong module nhan-vat-tu-hang-hoa.
 */

import { createContext, useContext, type ReactNode } from 'react'
import type {
  NhanVatTuHangHoaRecord,
  NhanVatTuHangHoaChiTiet,
  NhanVatTuHangHoaCreatePayload,
  NhanVatTuHangHoaFilter,
} from './nhanVatTuHangHoaApi'

export interface NhanVatTuHangHoaApi {
  getAll: (filter: NhanVatTuHangHoaFilter) => NhanVatTuHangHoaRecord[]
  getChiTiet: (donId: string) => NhanVatTuHangHoaChiTiet[]
  delete: (donId: string) => void
  getDefaultFilter: () => NhanVatTuHangHoaFilter
  getDateRangeForKy: (ky: string) => { tu: string; den: string }
  KY_OPTIONS: readonly { value: string; label: string }[]
  post: (payload: NhanVatTuHangHoaCreatePayload) => NhanVatTuHangHoaRecord
  put: (donId: string, payload: NhanVatTuHangHoaCreatePayload) => void
  soDonHangTiepTheo: () => string
  getDraft: () => (Record<string, string> & { _dvtOptions?: string[] })[] | null
  setDraft: (lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>) => void
  clearDraft: () => void
}

const NhanVatTuHangHoaApiContext = createContext<NhanVatTuHangHoaApi | null>(null)

export function NhanVatTuHangHoaApiProvider({ api, children }: { api: NhanVatTuHangHoaApi; children: ReactNode }) {
  return <NhanVatTuHangHoaApiContext.Provider value={api}>{children}</NhanVatTuHangHoaApiContext.Provider>
}

export function useNhanVatTuHangHoaApi(): NhanVatTuHangHoaApi {
  const ctx = useContext(NhanVatTuHangHoaApiContext)
  if (!ctx) throw new Error('useNhanVatTuHangHoaApi must be used within NhanVatTuHangHoaApiProvider')
  return ctx
}
