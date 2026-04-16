/**
 * Tổng phát sinh thu (+) / chi (−) theo id bản ghi module Tài khoản (phiếu thu / phiếu chi).
 * Chỉ gồm phiếu đã **ghi sổ** (hủy ghi sổ → không tính).
 */
import type { ThuTienBangRecord } from '../../../types/thuTienBang'
import type { ChiTienBangRecord } from '../../../types/chiTienBang'
import { thuTienBangGetAll } from '../thuTien/thuTienBangApi'
import { chiTienBangGetAll } from '../chiTien/chiTienBangApi'
import { daGhiSoPhieuThu } from '../thuTien/ghiSoTaiChinhApi'
import { daGhiSoPhieuChi } from '../chiTien/ghiSoChiTienApi'
import { taiKhoanGetAll, taiKhoanLaTkNganHang, taiKhoanLaTienMat } from './taiKhoanApi'

const KY_ALL = { ky: 'tat-ca' as const, tu: '', den: '' }

function resolveThuPhieuTkId(r: ThuTienBangRecord): string | undefined {
  const id = r.phieu_tai_khoan_id?.trim()
  if (id) return id
  if (r.thu_qua_ngan_hang) {
    const nhs = taiKhoanGetAll().filter((t) => taiKhoanLaTkNganHang(t))
    if (nhs.length === 1) return nhs[0].id
  }
  if (r.thu_tien_mat && !r.thu_qua_ngan_hang) {
    const tms = taiKhoanGetAll().filter((t) => taiKhoanLaTienMat(t))
    if (tms.length === 1) return tms[0].id
  }
  return undefined
}

function resolveChiPhieuTkId(r: ChiTienBangRecord): string | undefined {
  const id = r.phieu_tai_khoan_id?.trim()
  if (id) return id
  if (r.chi_qua_ngan_hang) {
    const nhs = taiKhoanGetAll().filter((t) => taiKhoanLaTkNganHang(t))
    if (nhs.length === 1) return nhs[0].id
  }
  if (r.chi_tien_mat && !r.chi_qua_ngan_hang) {
    const tms = taiKhoanGetAll().filter((t) => taiKhoanLaTienMat(t))
    if (tms.length === 1) return tms[0].id
  }
  return undefined
}

/** Map id TK → tổng phát sinh trong kỳ (thu − chi), không gồm số dư đầu kỳ; chỉ phiếu đã ghi sổ. */
export function phieuTaiKhoanTongPhatSinhTheoId(): Map<string, number> {
  const m = new Map<string, number>()
  const add = (tkId: string, delta: number) => {
    if (!tkId) return
    m.set(tkId, (m.get(tkId) ?? 0) + delta)
  }

  for (const r of thuTienBangGetAll(KY_ALL)) {
    if ((r.tinh_trang ?? '').trim() === 'Hủy bỏ') continue
    if (!r.ly_do_thu_phieu) continue
    if (!daGhiSoPhieuThu(r.id)) continue
    const tkId = resolveThuPhieuTkId(r)
    if (!tkId) continue
    add(tkId, Math.round(Number(r.tong_thanh_toan) || 0))
  }

  for (const r of chiTienBangGetAll(KY_ALL)) {
    if ((r.tinh_trang ?? '').trim() === 'Hủy bỏ') continue
    if (!r.ly_do_chi_phieu) continue
    if (!daGhiSoPhieuChi(r.id)) continue
    const tkId = resolveChiPhieuTkId(r)
    if (!tkId) continue
    add(tkId, -Math.round(Number(r.tong_thanh_toan) || 0))
  }

  return m
}
