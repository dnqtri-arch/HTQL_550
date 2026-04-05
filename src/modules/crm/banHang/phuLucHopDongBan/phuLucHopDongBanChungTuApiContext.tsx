import React, { createContext, useContext } from 'react'
import type {
  PhuLucHopDongBanChungTuChiTiet,
  PhuLucHopDongBanChungTuCreatePayload,
  PhuLucHopDongBanChungTuDraftLine,
  PhuLucHopDongBanChungTuFilter,
  PhuLucHopDongBanChungTuKyValue,
  PhuLucHopDongBanChungTuRecord,
} from '../../../../types/phuLucHopDongBanChungTu'

export interface PhuLucHopDongBanChungTuApi {
  getAll: (filter: PhuLucHopDongBanChungTuFilter) => PhuLucHopDongBanChungTuRecord[]
  getChiTiet: (donHangBanId: string) => PhuLucHopDongBanChungTuChiTiet[]
  delete: (donHangBanId: string) => void
  getDefaultFilter: () => PhuLucHopDongBanChungTuFilter
  getDateRangeForKy: (ky: string) => { tu: string; den: string }
  KY_OPTIONS: readonly { value: PhuLucHopDongBanChungTuKyValue; label: string }[]
  post: (payload: PhuLucHopDongBanChungTuCreatePayload) => PhuLucHopDongBanChungTuRecord
  put: (donHangBanId: string, payload: PhuLucHopDongBanChungTuCreatePayload) => void
  soHopDongTiepTheo: () => string
  getDraft: () => PhuLucHopDongBanChungTuDraftLine[] | null
  setDraft: (lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>) => void
  clearDraft: () => void
}

const PhuLucHopDongBanChungTuApiContext = createContext<PhuLucHopDongBanChungTuApi | null>(null)

export function PhuLucHopDongBanChungTuApiProvider({ api, children }: { api: PhuLucHopDongBanChungTuApi; children: React.ReactNode }) {
  return <PhuLucHopDongBanChungTuApiContext.Provider value={api}>{children}</PhuLucHopDongBanChungTuApiContext.Provider>
}

export function usePhuLucHopDongBanChungTuApi(): PhuLucHopDongBanChungTuApi {
  const ctx = useContext(PhuLucHopDongBanChungTuApiContext)
  if (!ctx) throw new Error('usePhuLucHopDongBanChungTuApi phải được dùng trong PhuLucHopDongBanChungTuApiProvider')
  return ctx
}
