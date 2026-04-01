import React, { createContext, useContext } from 'react'
import type {
  DonHangBanChungTuChiTiet,
  DonHangBanChungTuCreatePayload,
  DonHangBanChungTuDraftLine,
  DonHangBanChungTuFilter,
  DonHangBanChungTuKyValue,
  DonHangBanChungTuRecord,
} from '../../../../types/donHangBanChungTu'

export interface DonHangBanChungTuApi {
  getAll: (filter: DonHangBanChungTuFilter) => DonHangBanChungTuRecord[]
  getChiTiet: (donHangBanId: string) => DonHangBanChungTuChiTiet[]
  delete: (donHangBanId: string) => void
  getDefaultFilter: () => DonHangBanChungTuFilter
  getDateRangeForKy: (ky: string) => { tu: string; den: string }
  KY_OPTIONS: readonly { value: DonHangBanChungTuKyValue; label: string }[]
  post: (payload: DonHangBanChungTuCreatePayload) => DonHangBanChungTuRecord
  put: (donHangBanId: string, payload: DonHangBanChungTuCreatePayload) => void
  soDonHangTiepTheo: () => string
  getDraft: () => DonHangBanChungTuDraftLine[] | null
  setDraft: (lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>) => void
  clearDraft: () => void
}

const DonHangBanChungTuApiContext = createContext<DonHangBanChungTuApi | null>(null)

export function DonHangBanChungTuApiProvider({ api, children }: { api: DonHangBanChungTuApi; children: React.ReactNode }) {
  return <DonHangBanChungTuApiContext.Provider value={api}>{children}</DonHangBanChungTuApiContext.Provider>
}

export function useDonHangBanChungTuApi(): DonHangBanChungTuApi {
  const ctx = useContext(DonHangBanChungTuApiContext)
  if (!ctx) throw new Error('useDonHangBanChungTuApi phải được dùng trong DonHangBanChungTuApiProvider')
  return ctx
}
