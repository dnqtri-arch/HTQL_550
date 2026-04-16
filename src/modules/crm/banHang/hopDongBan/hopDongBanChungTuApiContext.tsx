import React, { createContext, useContext } from 'react'
import type {
  HopDongBanChungTuChiTiet,
  HopDongBanChungTuCreatePayload,
  HopDongBanChungTuDraftLine,
  HopDongBanChungTuFilter,
  HopDongBanChungTuKyValue,
  HopDongBanChungTuRecord,
} from '../../../../types/hopDongBanChungTu'

export interface HopDongBanChungTuApi {
  getAll: (filter: HopDongBanChungTuFilter) => HopDongBanChungTuRecord[]
  getChiTiet: (donHangBanId: string) => HopDongBanChungTuChiTiet[]
  delete: (donHangBanId: string) => void
  getDefaultFilter: () => HopDongBanChungTuFilter
  getDateRangeForKy: (ky: string) => { tu: string; den: string }
  KY_OPTIONS: readonly { value: HopDongBanChungTuKyValue; label: string }[]
  post: (payload: HopDongBanChungTuCreatePayload) => Promise<HopDongBanChungTuRecord>
  put: (donHangBanId: string, payload: HopDongBanChungTuCreatePayload) => void
  soHopDongTiepTheo: () => string
  getDraft: () => HopDongBanChungTuDraftLine[] | null
  setDraft: (lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>) => void
  clearDraft: () => void
}

const HopDongBanChungTuApiContext = createContext<HopDongBanChungTuApi | null>(null)

export function HopDongBanChungTuApiProvider({ api, children }: { api: HopDongBanChungTuApi; children: React.ReactNode }) {
  return <HopDongBanChungTuApiContext.Provider value={api}>{children}</HopDongBanChungTuApiContext.Provider>
}

export function useHopDongBanChungTuApi(): HopDongBanChungTuApi {
  const ctx = useContext(HopDongBanChungTuApiContext)
  if (!ctx) throw new Error('useHopDongBanChungTuApi phải được dùng trong HopDongBanChungTuApiProvider')
  return ctx
}
