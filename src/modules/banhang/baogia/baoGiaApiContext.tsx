import React, { createContext, useContext } from 'react'
import type {
  BaoGiaChiTiet,
  BaoGiaCreatePayload,
  BaoGiaDraftLine,
  BaoGiaFilter,
  BaoGiaKyValue,
  BaoGiaRecord,
} from '../../../types/baoGia'

export interface BaoGiaApi {
  getAll: (filter: BaoGiaFilter) => BaoGiaRecord[]
  getChiTiet: (baoGiaId: string) => BaoGiaChiTiet[]
  delete: (baoGiaId: string) => void
  getDefaultFilter: () => BaoGiaFilter
  getDateRangeForKy: (ky: string) => { tu: string; den: string }
  KY_OPTIONS: readonly { value: BaoGiaKyValue; label: string }[]
  post: (payload: BaoGiaCreatePayload) => BaoGiaRecord
  put: (baoGiaId: string, payload: BaoGiaCreatePayload) => void
  soDonHangTiepTheo: () => string
  getDraft: () => BaoGiaDraftLine[] | null
  setDraft: (lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>) => void
  clearDraft: () => void
}

const BaoGiaApiContext = createContext<BaoGiaApi | null>(null)

export function BaoGiaApiProvider({ api, children }: { api: BaoGiaApi; children: React.ReactNode }) {
  return <BaoGiaApiContext.Provider value={api}>{children}</BaoGiaApiContext.Provider>
}

export function useBaoGiaApi(): BaoGiaApi {
  const ctx = useContext(BaoGiaApiContext)
  if (!ctx) throw new Error('useBaoGiaApi phải được dùng trong BaoGiaApiProvider')
  return ctx
}
