/**
 * Chứng từ Đơn hàng bán / Hợp đồng bán còn công nợ (còn lại > 0) theo tên khách — phục vụ phiếu thu.
 */
import { addDays } from 'date-fns'
import { donHangBanGetAll } from '../../crm/banHang/donHangBan/donHangBanChungTuApi'
import { hopDongBanChungTuGetAll } from '../../crm/banHang/hopDongBan/hopDongBanChungTuApi'
import { thuTienBangGetAll, thuTienBangGetChiTiet } from './thuTienBangApi'
import type { ThuTienBangChiTiet, ThuTienBangRecord } from '../../../types/thuTienBang'
import type { DonHangBanChungTuFilter, DonHangBanChungTuRecord } from '../../../types/donHangBanChungTu'
import type { HopDongBanChungTuFilter, HopDongBanChungTuRecord } from '../../../types/hopDongBanChungTu'

const FILTER_ALL_DHB: DonHangBanChungTuFilter = { ky: 'tat-ca', tu: '', den: '' }
const FILTER_ALL_HDB: HopDongBanChungTuFilter = { ky: 'tat-ca', tu: '', den: '' }

function normTen(s: string): string {
  return s.trim().toLowerCase()
}

function khachKhop(khRecord: string, khDisplay: string): boolean {
  return normTen(khRecord) === normTen(khDisplay)
}

function isPhieuThu(r: ThuTienBangRecord): boolean {
  return r.ly_do_thu_phieu === 'thu_khach_hang' || r.ly_do_thu_phieu === 'thu_khac'
}

function tienThuChoMaChungTu(ct: ThuTienBangChiTiet[], maChungTu: string): number {
  const m = maChungTu.trim()
  if (!m) return 0
  let s = 0
  for (const line of ct) {
    const ma = (line.ma_hang ?? '').trim()
    if (ma !== m) continue
    const tt = line.thanh_tien
    if (typeof tt === 'number' && Number.isFinite(tt)) {
      s += tt
      continue
    }
    const dg = typeof line.don_gia === 'number' ? line.don_gia : 0
    const sl = typeof line.so_luong === 'number' ? line.so_luong : 0
    s += dg * sl
  }
  return s
}

function parseIsoNgay(iso: string | undefined): Date | null {
  if (!iso?.trim()) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDdMmYyyy(d: Date): string {
  const day = d.getDate()
  const mo = d.getMonth() + 1
  const y = d.getFullYear()
  return `${String(day).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}`
}

function hanThanhToanTuDonHang(row: DonHangBanChungTuRecord): string {
  const ngayDon = parseIsoNgay(row.ngay_don_hang)
  const rawNo = String(row.so_ngay_duoc_no ?? '').replace(/\D/g, '')
  const days = rawNo === '' ? 0 : parseInt(rawNo, 10)
  const hanDate =
    ngayDon && Number.isFinite(days) && days >= 0 ? addDays(ngayDon, days) : ngayDon
  return hanDate ? formatDdMmYyyy(hanDate) : ''
}

function hanThanhToanTuHopDong(row: HopDongBanChungTuRecord): string {
  const ngayLap = parseIsoNgay(row.ngay_lap_hop_dong)
  const rawNo = String(row.so_ngay_duoc_no ?? '').replace(/\D/g, '')
  const days = rawNo === '' ? 0 : parseInt(rawNo, 10)
  const hanDate =
    ngayLap && Number.isFinite(days) && days >= 0 ? addDays(ngayLap, days) : ngayLap
  return hanDate ? formatDdMmYyyy(hanDate) : ''
}

export type ChungTuCongNoRow = {
  key: string
  loai: 'don_hang_ban' | 'hop_dong_ban'
  ma_chung_tu: string
  ngay_tao: string
  han_tt: string
  so_phai_thu: number
  so_da_thu: number
  con_lai: number
}

export type LayChungTuCongNoOptions = {
  /** Khi sửa phiếu thu: loại trừ bản ghi hiện tại khỏi tổng đã thu (tránh trừ hai lần). */
  excludeThuTienBangId?: string
}

/**
 * Danh sách ĐHB + HĐB của khách còn công nợ (còn lại > 0).
 */
export function layChungTuConNoTheoKhach(
  khachHangTen: string,
  options?: LayChungTuCongNoOptions,
): ChungTuCongNoRow[] {
  const t = khachHangTen.trim()
  if (!t) return []

  const allTtb = thuTienBangGetAll({ ky: 'tat-ca', tu: '', den: '' })
  const excludeId = options?.excludeThuTienBangId

  function daThuChoMa(ma: string): number {
    let sum = 0
    for (const r of allTtb) {
      if (!isPhieuThu(r)) continue
      if (excludeId && r.id === excludeId) continue
      if (!khachKhop(r.khach_hang ?? '', t)) continue
      const ct = thuTienBangGetChiTiet(r.id)
      sum += tienThuChoMaChungTu(ct, ma)
    }
    return sum
  }

  const out: ChungTuCongNoRow[] = []

  for (const row of donHangBanGetAll(FILTER_ALL_DHB)) {
    if (!khachKhop(row.khach_hang ?? '', t)) continue
    const phai = typeof row.tong_thanh_toan === 'number' && Number.isFinite(row.tong_thanh_toan) ? row.tong_thanh_toan : 0
    const ma = (row.so_don_hang ?? '').trim()
    if (!ma) continue
    const da = daThuChoMa(ma)
    const conLai = Math.max(0, phai - da)
    if (conLai <= 0) continue
    const ngayDon = parseIsoNgay(row.ngay_don_hang)
    out.push({
      key: `dhb:${row.id}`,
      loai: 'don_hang_ban',
      ma_chung_tu: ma,
      ngay_tao: ngayDon ? formatDdMmYyyy(ngayDon) : '',
      han_tt: hanThanhToanTuDonHang(row),
      so_phai_thu: phai,
      so_da_thu: da,
      con_lai: conLai,
    })
  }

  for (const row of hopDongBanChungTuGetAll(FILTER_ALL_HDB)) {
    if (!khachKhop(row.khach_hang ?? '', t)) continue
    const phai = typeof row.tong_thanh_toan === 'number' && Number.isFinite(row.tong_thanh_toan) ? row.tong_thanh_toan : 0
    const ma = (row.so_hop_dong ?? '').trim()
    if (!ma) continue
    const da = daThuChoMa(ma)
    const conLai = Math.max(0, phai - da)
    if (conLai <= 0) continue
    const ngayLap = parseIsoNgay(row.ngay_lap_hop_dong)
    out.push({
      key: `hdb:${row.id}`,
      loai: 'hop_dong_ban',
      ma_chung_tu: ma,
      ngay_tao: ngayLap ? formatDdMmYyyy(ngayLap) : '',
      han_tt: hanThanhToanTuHopDong(row),
      so_phai_thu: phai,
      so_da_thu: da,
      con_lai: conLai,
    })
  }

  out.sort((a, b) => {
    const ma = a.ma_chung_tu.localeCompare(b.ma_chung_tu, 'vi')
    if (ma !== 0) return ma
    return a.loai.localeCompare(b.loai)
  })

  return out
}

/** Đếm số phiếu thu đã ghi nhận cho cùng mã chứng từ + khách (không tính bản ghi đang sửa). */
export function demSoLanThuTruocDoChoMa(
  khachHangTen: string,
  maChungTu: string,
  excludeThuTienBangId?: string,
): number {
  const m = maChungTu.trim()
  const t = khachHangTen.trim()
  if (!m || !t) return 0
  const allTtb = thuTienBangGetAll({ ky: 'tat-ca', tu: '', den: '' })
  let n = 0
  for (const r of allTtb) {
    if (!isPhieuThu(r)) continue
    if (excludeThuTienBangId && r.id === excludeThuTienBangId) continue
    if (!khachKhop(r.khach_hang ?? '', t)) continue
    const ct = thuTienBangGetChiTiet(r.id)
    if (tienThuChoMaChungTu(ct, m) > 0) n++
  }
  return n
}

/** Đã thu / Còn lại theo phiếu thu đã lập (mã ĐHB = `so_don_hang`). */
export function tinhDaThuVaConLaiChoDonHangBan(row: DonHangBanChungTuRecord): { da_thu: number; con_lai: number } {
  const phai =
    typeof row.tong_thanh_toan === 'number' && Number.isFinite(row.tong_thanh_toan) ? row.tong_thanh_toan : 0
  const ma = (row.so_don_hang ?? '').trim()
  const kh = (row.khach_hang ?? '').trim()
  if (!ma || !kh) return { da_thu: 0, con_lai: phai }
  const allTtb = thuTienBangGetAll({ ky: 'tat-ca', tu: '', den: '' })
  let da = 0
  for (const r of allTtb) {
    if (!isPhieuThu(r)) continue
    if (!khachKhop(r.khach_hang ?? '', kh)) continue
    const ct = thuTienBangGetChiTiet(r.id)
    da += tienThuChoMaChungTu(ct, ma)
  }
  const conLai = Math.max(0, phai - da)
  return { da_thu: da, con_lai: conLai }
}
