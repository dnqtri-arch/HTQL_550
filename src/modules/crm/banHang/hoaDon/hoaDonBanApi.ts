/**
 * API Hóa đơn bán — htqlEntityStorage mock, prefix HDB.
 * Có thể kế thừa từ Đơn hàng bán hoặc Hợp đồng.
 * Quản lý công nợ: tự động tính so_tien_da_thu và con_lai.
 */

import type {
  HoaDonBanRecord,
  HoaDonBanChiTiet,
  HoaDonBanCreatePayload,
  PhieuThuKhachHangRecord,
  BanHangFilter,
  BanHangKyValue,
  DonHangBanRecord,
  DonHangBanChiTiet,
} from '../../../../types/banHang'
import type { HopDongBanChungTuRecord, HopDongBanChungTuChiTiet } from '../../../../types/hopDongBanChungTu'
import { maFormatHeThong, getCurrentYear } from '../../../../utils/maFormat'
import { allocateMaHeThongFromServer, hintMaxSerialForYearPrefix } from '../../../../utils/htqlSequenceApi'
import { htqlEntityStorage } from '@/utils/htqlEntityStorage'

export type { HoaDonBanRecord, HoaDonBanChiTiet, HoaDonBanCreatePayload, BanHangKyValue, PhieuThuKhachHangRecord }

const STORAGE_KEY_HOA_DON = 'htql_hoa_don_ban_list'
const STORAGE_KEY_CHI_TIET = 'htql_hoa_don_ban_chi_tiet'
const STORAGE_KEY_PHIEU_THU = 'htql_phieu_thu_khach_hang'

const MOCK_HD: HoaDonBanRecord[] = [
  {
    id: 'hd1',
    so_hoa_don: '2026/HDB/1',
    ngay_hoa_don: '2026-03-21',
    khach_hang: 'Công ty CP Xây dựng XYZ',
    dien_giai: 'Hóa đơn vật liệu xây dựng Q1',
    tong_tien_hang: 85000000,
    tong_thue_gtgt: 8500000,
    tong_thanh_toan: 93500000,
    so_tien_da_thu: 50000000,
    con_lai: 43500000,
    tinh_trang: 'Thanh toán 1 phần',
    don_hang_ban_id: 'dhb1',
    so_don_hang_goc: '2026/DHB/1',
    nv_ban_hang: 'Trần Thị B',
  },
]

const MOCK_CT: HoaDonBanChiTiet[] = [
  {
    id: 'hdct1',
    hoa_don_ban_id: 'hd1',
    ma_hang: 'VT00002',
    ten_hang: 'Xi măng Hoàng Thạch',
    dvt: 'Tấn',
    so_luong: 100,
    don_gia: 850000,
    thanh_tien: 85000000,
    pt_thue_gtgt: 10,
    tien_thue_gtgt: 8500000,
  },
]

const MOCK_PHIEU_THU: PhieuThuKhachHangRecord[] = [
  {
    id: 'pt1',
    so_phieu: '2026/PT/1',
    ngay_thu: '2026-03-22',
    khach_hang: 'Công ty CP Xây dựng XYZ',
    so_tien: 50000000,
    dien_giai: 'Thu tiền đợt 1',
    hoa_don_ban_id: 'hd1',
    so_hoa_don_lien_quan: '2026/HDB/1',
  },
]

function loadFromStorage(): {
  hoaDon: HoaDonBanRecord[]
  chiTiet: HoaDonBanChiTiet[]
  phieuThu: PhieuThuKhachHangRecord[]
} {
  try {
    const rawHd = typeof htqlEntityStorage !== 'undefined' ? htqlEntityStorage.getItem(STORAGE_KEY_HOA_DON) : null
    const rawCt = typeof htqlEntityStorage !== 'undefined' ? htqlEntityStorage.getItem(STORAGE_KEY_CHI_TIET) : null
    const rawPt = typeof htqlEntityStorage !== 'undefined' ? htqlEntityStorage.getItem(STORAGE_KEY_PHIEU_THU) : null
    const hoaDon = rawHd ? JSON.parse(rawHd) : null
    const chiTiet = rawCt ? JSON.parse(rawCt) : null
    const phieuThu = rawPt ? JSON.parse(rawPt) : null
    if (Array.isArray(hoaDon) && Array.isArray(chiTiet)) {
      return { hoaDon, chiTiet, phieuThu: Array.isArray(phieuThu) ? phieuThu : [...MOCK_PHIEU_THU] }
    }
  } catch { /* ignore */ }
  return { hoaDon: [...MOCK_HD], chiTiet: [...MOCK_CT], phieuThu: [...MOCK_PHIEU_THU] }
}

let _hoaDonList: HoaDonBanRecord[] = []
let _chiTietList: HoaDonBanChiTiet[] = []
let _phieuThuList: PhieuThuKhachHangRecord[] = []

function init() {
  if (_hoaDonList.length === 0 && _chiTietList.length === 0) {
    const loaded = loadFromStorage()
    _hoaDonList = loaded.hoaDon
    _chiTietList = loaded.chiTiet
    _phieuThuList = loaded.phieuThu
  }
}
init()

export function hoaDonBanReloadFromStorage(): void {
  const loaded = loadFromStorage()
  _hoaDonList = loaded.hoaDon
  _chiTietList = loaded.chiTiet
  _phieuThuList = loaded.phieuThu
}

function save() {
  try {
    if (typeof htqlEntityStorage !== 'undefined') {
      htqlEntityStorage.setItem(STORAGE_KEY_HOA_DON, JSON.stringify(_hoaDonList))
      htqlEntityStorage.setItem(STORAGE_KEY_CHI_TIET, JSON.stringify(_chiTietList))
      htqlEntityStorage.setItem(STORAGE_KEY_PHIEU_THU, JSON.stringify(_phieuThuList))
    }
  } catch { /* ignore */ }
}

export const KY_OPTIONS: { value: BanHangKyValue; label: string }[] = [
  { value: 'thang_nay', label: 'Tháng này' },
  { value: 'thang_truoc', label: 'Tháng trước' },
  { value: 'quy_nay', label: 'Quý này' },
  { value: 'quy_truoc', label: 'Quý trước' },
  { value: 'nam_nay', label: 'Năm nay' },
  { value: 'tat_ca', label: 'Tất cả' },
]

export function getDateRangeForKy(ky: BanHangKyValue): { tu: string; den: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (ky === 'thang_nay') return { tu: `${y}-${pad(m + 1)}-01`, den: iso(new Date(y, m + 1, 0)) }
  if (ky === 'thang_truoc') {
    const pm = m === 0 ? 11 : m - 1
    const py = m === 0 ? y - 1 : y
    return { tu: `${py}-${pad(pm + 1)}-01`, den: iso(new Date(py, pm + 1, 0)) }
  }
  if (ky === 'quy_nay') {
    const q = Math.floor(m / 3)
    return { tu: `${y}-${pad(q * 3 + 1)}-01`, den: iso(new Date(y, q * 3 + 3, 0)) }
  }
  if (ky === 'quy_truoc') {
    const q = Math.floor(m / 3)
    const pq = q === 0 ? 3 : q - 1
    const py = q === 0 ? y - 1 : y
    return { tu: `${py}-${pad(pq * 3 + 1)}-01`, den: iso(new Date(py, pq * 3 + 3, 0)) }
  }
  if (ky === 'nam_nay') return { tu: `${y}-01-01`, den: `${y}-12-31` }
  return { tu: '', den: '' }
}

export function getDefaultHoaDonBanFilter(): BanHangFilter {
  return { ky: 'tat_ca', tu: '', den: '', tim_kiem: '' }
}

export function hoaDonBanGetAll(filter: BanHangFilter): HoaDonBanRecord[] {
  init()
  const { tu, den, tim_kiem } = filter
  return _hoaDonList.filter((r) => {
    if (tu && r.ngay_hoa_don < tu) return false
    if (den && r.ngay_hoa_don > den) return false
    if (tim_kiem) {
      const kw = tim_kiem.toLowerCase()
      const hay = `${r.so_hoa_don} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang} ${r.so_don_hang_goc ?? ''} ${r.so_hop_dong_goc ?? ''}`.toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
}

export function hoaDonBanGetChiTiet(id: string): HoaDonBanChiTiet[] {
  init()
  return _chiTietList.filter((c) => c.hoa_don_ban_id === id)
}

export function hoaDonBanDelete(id: string): void {
  init()
  _hoaDonList = _hoaDonList.filter((r) => r.id !== id)
  _chiTietList = _chiTietList.filter((c) => c.hoa_don_ban_id !== id)
  save()
}

function genId(): string {
  return `hd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function hoaDonBanSoTiepTheo(): string {
  init()
  const year = getCurrentYear()
  const nums = _hoaDonList
    .map((r) => {
      const m = r.so_hoa_don.match(/^(\d{4})\/HDB\/(\d+)$/)
      return m && parseInt(m[1], 10) === year ? parseInt(m[2], 10) : 0
    })
    .filter(Boolean)
  const max = nums.length ? Math.max(...nums) : 0
  return maFormatHeThong('HDB', max + 1)
}

/** Tính lại trạng thái dựa trên số tiền đã thu */
function calcTinhTrang(tongThanhToan: number, soTienDaThu: number): HoaDonBanRecord['tinh_trang'] {
  if (soTienDaThu <= 0) return 'Chưa thanh toán'
  if (soTienDaThu >= tongThanhToan) return 'Đã thanh toán'
  return 'Thanh toán 1 phần'
}

export async function hoaDonBanPost(payload: HoaDonBanCreatePayload): Promise<HoaDonBanRecord> {
  init()
  const year = getCurrentYear()
  const hint = hintMaxSerialForYearPrefix(
    year,
    'HDB',
    _hoaDonList.map((r) => r.so_hoa_don),
  )
  const soHoaDon = await allocateMaHeThongFromServer({
    seqKey: 'HDB_BAN_HD',
    modulePrefix: 'HDB',
    hintMaxSerial: hint,
    year,
  })
  const id = genId()
  const conLai = payload.tong_thanh_toan - payload.so_tien_da_thu
  const record: HoaDonBanRecord = {
    id,
    so_hoa_don: soHoaDon,
    ngay_hoa_don: payload.ngay_hoa_don,
    khach_hang: payload.khach_hang,
    dia_chi: payload.dia_chi,
    ma_so_thue: payload.ma_so_thue,
    dien_giai: payload.dien_giai,
    tong_tien_hang: payload.tong_tien_hang,
    tong_thue_gtgt: payload.tong_thue_gtgt,
    tong_thanh_toan: payload.tong_thanh_toan,
    so_tien_da_thu: payload.so_tien_da_thu,
    con_lai: conLai,
    tinh_trang: payload.tinh_trang === 'Hủy bỏ' ? 'Hủy bỏ' : calcTinhTrang(payload.tong_thanh_toan, payload.so_tien_da_thu),
    ghi_chu: payload.ghi_chu,
    nv_ban_hang: payload.nv_ban_hang,
    don_hang_ban_id: payload.don_hang_ban_id,
    so_don_hang_goc: payload.so_don_hang_goc,
    hop_dong_ban_id: payload.hop_dong_ban_id,
    so_hop_dong_goc: payload.so_hop_dong_goc,
  }
  _hoaDonList.unshift(record)
  const ctNew = payload.chi_tiet.map((c, i) => ({
    ...c,
    id: `hdct_${id}_${i}`,
    hoa_don_ban_id: id,
    stt: i + 1,
  }))
  _chiTietList = [..._chiTietList, ...ctNew]
  save()
  return record
}

export function hoaDonBanPut(id: string, payload: HoaDonBanCreatePayload): HoaDonBanRecord {
  init()
  const idx = _hoaDonList.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Hóa đơn bán không tìm thấy: ' + id)
  const conLai = payload.tong_thanh_toan - payload.so_tien_da_thu
  const updated: HoaDonBanRecord = {
    id,
    so_hoa_don: payload.so_hoa_don,
    ngay_hoa_don: payload.ngay_hoa_don,
    khach_hang: payload.khach_hang,
    dia_chi: payload.dia_chi,
    ma_so_thue: payload.ma_so_thue,
    dien_giai: payload.dien_giai,
    tong_tien_hang: payload.tong_tien_hang,
    tong_thue_gtgt: payload.tong_thue_gtgt,
    tong_thanh_toan: payload.tong_thanh_toan,
    so_tien_da_thu: payload.so_tien_da_thu,
    con_lai: conLai,
    tinh_trang: payload.tinh_trang === 'Hủy bỏ' ? 'Hủy bỏ' : calcTinhTrang(payload.tong_thanh_toan, payload.so_tien_da_thu),
    ghi_chu: payload.ghi_chu,
    nv_ban_hang: payload.nv_ban_hang,
    don_hang_ban_id: payload.don_hang_ban_id,
    so_don_hang_goc: payload.so_don_hang_goc,
    hop_dong_ban_id: payload.hop_dong_ban_id,
    so_hop_dong_goc: payload.so_hop_dong_goc,
  }
  _hoaDonList[idx] = updated
  _chiTietList = _chiTietList.filter((c) => c.hoa_don_ban_id !== id)
  const newCt = payload.chi_tiet.map((c, i) => ({
    ...c,
    id: `hdct_${id}_${i}_${Date.now()}`,
    hoa_don_ban_id: id,
    stt: i + 1,
  }))
  _chiTietList = [..._chiTietList, ...newCt]
  save()
  return updated
}

/** Tạo hóa đơn từ Đơn hàng bán */
export function hoaDonBanTuDonHangBan(
  dhb: DonHangBanRecord,
  ct: DonHangBanChiTiet[],
  soHd: string,
  ngayHd: string,
): HoaDonBanCreatePayload {
  return {
    so_hoa_don: soHd,
    ngay_hoa_don: ngayHd,
    khach_hang: dhb.khach_hang,
    dia_chi: dhb.dia_chi,
    ma_so_thue: dhb.ma_so_thue,
    dien_giai: dhb.dien_giai,
    tong_tien_hang: dhb.tong_tien_hang,
    tong_thue_gtgt: dhb.tong_thue_gtgt,
    tong_thanh_toan: dhb.tong_thanh_toan,
    so_tien_da_thu: 0,
    con_lai: dhb.tong_thanh_toan,
    tinh_trang: 'Chưa thanh toán',
    nv_ban_hang: dhb.nv_ban_hang,
    don_hang_ban_id: dhb.id,
    so_don_hang_goc: dhb.so_don_hang,
    chi_tiet: ct.map((c) => ({
      stt: c.stt,
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      dvt: c.dvt,
      so_luong: c.so_luong,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      ghi_chu: c.ghi_chu,
    })),
  }
}

/** Tạo hóa đơn từ Hợp đồng bán */
export function hoaDonBanTuHopDongBan(
  hdb: HopDongBanChungTuRecord,
  ct: HopDongBanChungTuChiTiet[],
  soHd: string,
  ngayHd: string,
): HoaDonBanCreatePayload {
  const tongTienHang = ct.reduce((s, c) => s + c.thanh_tien, 0)
  const tongThueGtgt = ct.reduce((s, c) => s + (c.tien_thue_gtgt ?? 0), 0)
  return {
    so_hoa_don: soHd,
    ngay_hoa_don: ngayHd,
    khach_hang: hdb.khach_hang,
    dien_giai: hdb.dien_giai,
    tong_tien_hang: tongTienHang,
    tong_thue_gtgt: tongThueGtgt,
    tong_thanh_toan: tongTienHang + tongThueGtgt,
    so_tien_da_thu: 0,
    con_lai: tongTienHang + tongThueGtgt,
    tinh_trang: 'Chưa thanh toán',
    nv_ban_hang: hdb.nv_ban_hang,
    hop_dong_ban_id: hdb.id,
    so_hop_dong_goc: hdb.so_hop_dong,
    chi_tiet: ct.map((c) => ({
      stt: c.stt,
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      dvt: c.dvt,
      so_luong: c.so_luong,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      ghi_chu: c.ghi_chu,
    })),
  }
}

// ─── Phiếu thu ────────────────────────────────────────────────────────────

export function phieuThuGetAll(): PhieuThuKhachHangRecord[] {
  init()
  return _phieuThuList
}

export function phieuThuGetByHoaDon(hoaDonId: string): PhieuThuKhachHangRecord[] {
  init()
  return _phieuThuList.filter((p) => p.hoa_don_ban_id === hoaDonId)
}

export function phieuThuPost(payload: Omit<PhieuThuKhachHangRecord, 'id'>): PhieuThuKhachHangRecord {
  init()
  const id = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
  const record: PhieuThuKhachHangRecord = { id, ...payload }
  _phieuThuList.unshift(record)

  // Cập nhật so_tien_da_thu và con_lai trên hóa đơn liên quan
  if (payload.hoa_don_ban_id) {
    const hdIdx = _hoaDonList.findIndex((h) => h.id === payload.hoa_don_ban_id)
    if (hdIdx >= 0) {
      const thuTheoHd = _phieuThuList
        .filter((p) => p.hoa_don_ban_id === payload.hoa_don_ban_id)
        .reduce((s, p) => s + p.so_tien, 0)
      const hd = _hoaDonList[hdIdx]
      const conLai = hd.tong_thanh_toan - thuTheoHd
      _hoaDonList[hdIdx] = {
        ...hd,
        so_tien_da_thu: thuTheoHd,
        con_lai: conLai < 0 ? 0 : conLai,
        tinh_trang: calcTinhTrang(hd.tong_thanh_toan, thuTheoHd),
      }
    }
  }
  save()
  return record
}

export function phieuThuSoTiepTheo(): string {
  init()
  const year = getCurrentYear()
  const nums = _phieuThuList
    .map((r) => {
      const m = r.so_phieu.match(/^(\d{4})\/PT\/(\d+)$/)
      return m && parseInt(m[1], 10) === year ? parseInt(m[2], 10) : 0
    })
    .filter(Boolean)
  const max = nums.length ? Math.max(...nums) : 0
  return maFormatHeThong('PT', max + 1)
}

/** Tổng công nợ khách hàng: tổng hóa đơn chưa thanh toán + TT 1 phần */
export function congNoKhachHang(): Map<string, { tongNo: number; soHoaDon: number }> {
  init()
  const map = new Map<string, { tongNo: number; soHoaDon: number }>()
  for (const hd of _hoaDonList) {
    if (hd.tinh_trang === 'Hủy bỏ' || hd.tinh_trang === 'Đã thanh toán') continue
    const cur = map.get(hd.khach_hang) ?? { tongNo: 0, soHoaDon: 0 }
    map.set(hd.khach_hang, {
      tongNo: cur.tongNo + hd.con_lai,
      soHoaDon: cur.soHoaDon + 1,
    })
  }
  return map
}
