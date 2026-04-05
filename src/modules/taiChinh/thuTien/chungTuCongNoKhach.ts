/**
 * Chứng từ Đơn hàng bán / Hợp đồng bán còn công nợ (còn lại > 0) theo tên khách — phục vụ phiếu thu.
 */
import { addDays } from 'date-fns'
import { baoGiaGetAll } from '../../crm/banHang/baoGia/baoGiaApi'
import { donHangBanGetAll } from '../../crm/banHang/donHangBan/donHangBanChungTuApi'
import { hopDongBanChungTuGetAll } from '../../crm/banHang/hopDongBan/hopDongBanChungTuApi'
import { phuLucHopDongBanChungTuGetAll } from '../../crm/banHang/phuLucHopDongBan/phuLucHopDongBanChungTuApi'
import { thuTienBangGetAll, thuTienBangGetChiTiet } from './thuTienBangApi'
import type { BaoGiaFilter } from '../../../types/baoGia'
import type { ThuTienBangChiTiet, ThuTienBangRecord } from '../../../types/thuTienBang'
import { daGhiSoPhieuThu } from './ghiSoTaiChinhApi'
import type { DonHangBanChungTuFilter, DonHangBanChungTuRecord } from '../../../types/donHangBanChungTu'
import type { HopDongBanChungTuFilter, HopDongBanChungTuRecord } from '../../../types/hopDongBanChungTu'
import type { PhuLucHopDongBanChungTuFilter, PhuLucHopDongBanChungTuRecord } from '../../../types/phuLucHopDongBanChungTu'

const FILTER_ALL_DHB: DonHangBanChungTuFilter = { ky: 'tat-ca', tu: '', den: '' }
const FILTER_ALL_HDB: HopDongBanChungTuFilter = { ky: 'tat-ca', tu: '', den: '' }
const FILTER_ALL_PLHDB: PhuLucHopDongBanChungTuFilter = { ky: 'tat-ca', tu: '', den: '' }
const FILTER_ALL_BG: BaoGiaFilter = { ky: 'tat-ca', tu: '', den: '' }

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

export function hanThanhToanTuDonHang(row: DonHangBanChungTuRecord): string {
  const ngayDon = parseIsoNgay(row.ngay_don_hang)
  const rawNo = String(row.so_ngay_duoc_no ?? '').replace(/\D/g, '')
  const days = rawNo === '' ? 0 : parseInt(rawNo, 10)
  const hanDate =
    ngayDon && Number.isFinite(days) && days >= 0 ? addDays(ngayDon, days) : ngayDon
  return hanDate ? formatDdMmYyyy(hanDate) : ''
}

export function hanThanhToanTuHopDong(row: HopDongBanChungTuRecord): string {
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

  /** Tổng tiền đã lập trên phiếu thu (mọi trạng thái ghi sổ). */
  function tongLapChoMa(ma: string): number {
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

  /** Chỉ tiền đã ghi sổ (sổ kế toán). */
  function tienGhiSoChoMa(ma: string): number {
    let sum = 0
    for (const r of allTtb) {
      if (!isPhieuThu(r)) continue
      if (excludeId && r.id === excludeId) continue
      if (!khachKhop(r.khach_hang ?? '', t)) continue
      if (!daGhiSoPhieuThu(r.id)) continue
      const ct = thuTienBangGetChiTiet(r.id)
      sum += tienThuChoMaChungTu(ct, ma)
    }
    return sum
  }

  const out: ChungTuCongNoRow[] = []
  const validBaoGiaIds = new Set(baoGiaGetAll(FILTER_ALL_BG).map((r) => r.id))

  for (const row of donHangBanGetAll(FILTER_ALL_DHB)) {
    if ((row.tinh_trang ?? '').trim() === 'Hủy bỏ') continue
    if (!khachKhop(row.khach_hang ?? '', t)) continue
    const bid = (row.bao_gia_id ?? '').trim()
    if (bid && !validBaoGiaIds.has(bid)) continue
    const phai = typeof row.tong_thanh_toan === 'number' && Number.isFinite(row.tong_thanh_toan) ? row.tong_thanh_toan : 0
    const ma = (row.so_don_hang ?? '').trim()
    if (!ma) continue
    const tongLap = tongLapChoMa(ma)
    const daGhiSo = tienGhiSoChoMa(ma)
    const conLaiThemPhieu = Math.max(0, phai - tongLap)
    if (conLaiThemPhieu <= 0) continue
    const ngayDon = parseIsoNgay(row.ngay_don_hang)
    out.push({
      key: `dhb:${row.id}`,
      loai: 'don_hang_ban',
      ma_chung_tu: ma,
      ngay_tao: ngayDon ? formatDdMmYyyy(ngayDon) : '',
      han_tt: hanThanhToanTuDonHang(row),
      so_phai_thu: phai,
      so_da_thu: daGhiSo,
      con_lai: Math.max(0, phai - daGhiSo),
    })
  }

  for (const row of hopDongBanChungTuGetAll(FILTER_ALL_HDB)) {
    if ((row.tinh_trang ?? '').trim() === 'Hủy bỏ') continue
    if (!khachKhop(row.khach_hang ?? '', t)) continue
    const bidH = (row.bao_gia_id ?? '').trim()
    if (bidH && !validBaoGiaIds.has(bidH)) continue
    const phai = typeof row.tong_thanh_toan === 'number' && Number.isFinite(row.tong_thanh_toan) ? row.tong_thanh_toan : 0
    const ma = (row.so_hop_dong ?? '').trim()
    if (!ma) continue
    const tongLapH = tongLapChoMa(ma)
    const daGhiSoH = tienGhiSoChoMa(ma)
    const conLaiThemPhieuH = Math.max(0, phai - tongLapH)
    if (conLaiThemPhieuH <= 0) continue
    const ngayLap = parseIsoNgay(row.ngay_lap_hop_dong)
    out.push({
      key: `hdb:${row.id}`,
      loai: 'hop_dong_ban',
      ma_chung_tu: ma,
      ngay_tao: ngayLap ? formatDdMmYyyy(ngayLap) : '',
      han_tt: hanThanhToanTuHopDong(row),
      so_phai_thu: phai,
      so_da_thu: daGhiSoH,
      con_lai: Math.max(0, phai - daGhiSoH),
    })
  }

  for (const row of phuLucHopDongBanChungTuGetAll(FILTER_ALL_PLHDB)) {
    if ((row.tinh_trang ?? '').trim() === 'Hủy bỏ') continue
    if (!khachKhop(row.khach_hang ?? '', t)) continue
    const bidPl = (row.bao_gia_id ?? '').trim()
    if (bidPl && !validBaoGiaIds.has(bidPl)) continue
    const phaiPl = typeof row.tong_thanh_toan === 'number' && Number.isFinite(row.tong_thanh_toan) ? row.tong_thanh_toan : 0
    const maPl = (row.so_hop_dong ?? '').trim()
    if (!maPl) continue
    const tongLapPl = tongLapChoMa(maPl)
    const daGhiSoPl = tienGhiSoChoMa(maPl)
    const conLaiThemPhieuPl = Math.max(0, phaiPl - tongLapPl)
    if (conLaiThemPhieuPl <= 0) continue
    const ngayLapPl = parseIsoNgay(row.ngay_lap_hop_dong)
    out.push({
      key: `plhdb:${row.id}`,
      loai: 'hop_dong_ban',
      ma_chung_tu: maPl,
      ngay_tao: ngayLapPl ? formatDdMmYyyy(ngayLapPl) : '',
      han_tt: hanThanhToanTuHopDong(row as unknown as HopDongBanChungTuRecord),
      so_phai_thu: phaiPl,
      so_da_thu: daGhiSoPl,
      con_lai: Math.max(0, phaiPl - daGhiSoPl),
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

/**
 * Đã thu (chỉ phiếu **đã ghi sổ**), còn lại theo sổ (`phai - đã thu ghi sổ`),
 * và `tong_da_lap` = tổng đã lập trên mọi phiếu (giới hạn lập thêm, chưa ghi sổ vẫn tính).
 */
export function tinhDaThuVaConLaiChoDonHangBan(row: DonHangBanChungTuRecord): {
  da_thu: number
  con_lai: number
  tong_da_lap: number
} {
  const phai =
    typeof row.tong_thanh_toan === 'number' && Number.isFinite(row.tong_thanh_toan) ? row.tong_thanh_toan : 0
  const ma = (row.so_don_hang ?? '').trim()
  const kh = (row.khach_hang ?? '').trim()
  if (!ma || !kh) return { da_thu: 0, con_lai: phai, tong_da_lap: 0 }
  const allTtb = thuTienBangGetAll({ ky: 'tat-ca', tu: '', den: '' })
  let tongLap = 0
  let daGhiSo = 0
  for (const r of allTtb) {
    if (!isPhieuThu(r)) continue
    if (!khachKhop(r.khach_hang ?? '', kh)) continue
    const ct = thuTienBangGetChiTiet(r.id)
    const t = tienThuChoMaChungTu(ct, ma)
    tongLap += t
    if (daGhiSoPhieuThu(r.id)) daGhiSo += t
  }
  const conLai = Math.max(0, phai - daGhiSo)
  return { da_thu: daGhiSo, con_lai: conLai, tong_da_lap: tongLap }
}

/** Cùng logic `tinhDaThuVaConLaiChoDonHangBan` nhưng mã chứng từ là `so_hop_dong` (HĐ bán). */
export function tinhDaThuVaConLaiChoHopDongBan(row: HopDongBanChungTuRecord): {
  da_thu: number
  con_lai: number
  tong_da_lap: number
} {
  const phai =
    typeof row.tong_thanh_toan === 'number' && Number.isFinite(row.tong_thanh_toan) ? row.tong_thanh_toan : 0
  const ma = (row.so_hop_dong ?? '').trim()
  const kh = (row.khach_hang ?? '').trim()
  if (!ma || !kh) return { da_thu: 0, con_lai: phai, tong_da_lap: 0 }
  const allTtb = thuTienBangGetAll({ ky: 'tat-ca', tu: '', den: '' })
  let tongLap = 0
  let daGhiSo = 0
  for (const r of allTtb) {
    if (!isPhieuThu(r)) continue
    if (!khachKhop(r.khach_hang ?? '', kh)) continue
    const ct = thuTienBangGetChiTiet(r.id)
    const t = tienThuChoMaChungTu(ct, ma)
    tongLap += t
    if (daGhiSoPhieuThu(r.id)) daGhiSo += t
  }
  const conLai = Math.max(0, phai - daGhiSo)
  return { da_thu: daGhiSo, con_lai: conLai, tong_da_lap: tongLap }
}

/** Cùng logic HĐ bán chứng từ — bản ghi Phụ lục HĐ bán (cấu trúc giống HĐ). */
export function tinhDaThuVaConLaiChoPhuLucHopDongBan(row: PhuLucHopDongBanChungTuRecord): {
  da_thu: number
  con_lai: number
  tong_da_lap: number
} {
  return tinhDaThuVaConLaiChoHopDongBan(row as unknown as HopDongBanChungTuRecord)
}
