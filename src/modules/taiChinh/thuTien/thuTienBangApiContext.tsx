import React, { createContext, useContext } from 'react'
import type {
  ThuTienBangChiTiet,
  ThuTienBangCreatePayload,
  ThuTienBangDraftLine,
  ThuTienBangFilter,
  ThuTienBangKyValue,
  ThuTienBangRecord,
} from '../../../types/thuTienBang'

export interface ThuTienBangApi {
  getAll: (filter: ThuTienBangFilter) => ThuTienBangRecord[]
  getChiTiet: (thuTienBangId: string) => ThuTienBangChiTiet[]
  delete: (thuTienBangId: string) => void
  getDefaultFilter: () => ThuTienBangFilter
  getDateRangeForKy: (ky: string) => { tu: string; den: string }
  KY_OPTIONS: readonly { value: ThuTienBangKyValue; label: string }[]
  post: (payload: ThuTienBangCreatePayload) => ThuTienBangRecord
  put: (thuTienBangId: string, payload: ThuTienBangCreatePayload) => void
  soDonHangTiepTheo: () => string
  getDraft: () => ThuTienBangDraftLine[] | null
  setDraft: (lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>) => void
  clearDraft: () => void
}

const ThuTienBangApiContext = createContext<ThuTienBangApi | null>(null)

export function ThuTienBangApiProvider({ api, children }: { api: ThuTienBangApi; children: React.ReactNode }) {
  return <ThuTienBangApiContext.Provider value={api}>{children}</ThuTienBangApiContext.Provider>
}

export function useThuTienBangApi(): ThuTienBangApi {
  const ctx = useContext(ThuTienBangApiContext)
  if (!ctx) throw new Error('useThuTienBangApi phải được dùng trong ThuTienBangApiProvider')
  return ctx
}
