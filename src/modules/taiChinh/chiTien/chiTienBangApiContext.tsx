import React, { createContext, useContext } from 'react'
import type {
  ChiTienBangChiTiet,
  ChiTienBangCreatePayload,
  ChiTienBangDraftLine,
  ChiTienBangFilter,
  ChiTienBangKyValue,
  ChiTienBangRecord,
} from '../../../types/chiTienBang'

export interface ChiTienBangApi {
  getAll: (filter: ChiTienBangFilter) => ChiTienBangRecord[]
  getChiTiet: (ChiTienBangId: string) => ChiTienBangChiTiet[]
  delete: (ChiTienBangId: string) => void
  getDefaultFilter: () => ChiTienBangFilter
  getDateRangeForKy: (ky: string) => { tu: string; den: string }
  KY_OPTIONS: readonly { value: ChiTienBangKyValue; label: string }[]
  post: (payload: ChiTienBangCreatePayload) => Promise<ChiTienBangRecord>
  put: (ChiTienBangId: string, payload: ChiTienBangCreatePayload) => void
  soDonHangTiepTheo: () => string
  getDraft: () => ChiTienBangDraftLine[] | null
  setDraft: (lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>) => void
  clearDraft: () => void
}

const ChiTienBangApiContext = createContext<ChiTienBangApi | null>(null)

export function ChiTienBangApiProvider({ api, children }: { api: ChiTienBangApi; children: React.ReactNode }) {
  return <ChiTienBangApiContext.Provider value={api}>{children}</ChiTienBangApiContext.Provider>
}

export function useChiTienBangApi(): ChiTienBangApi {
  const ctx = useContext(ChiTienBangApiContext)
  if (!ctx) throw new Error('useChiTienBangApi phải được dùng trong ChiTienBangApiProvider')
  return ctx
}
