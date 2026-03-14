/**
 * API và types cho Đơn mua hàng (header + chi tiết dòng).
 * Dữ liệu mẫu; sau có thể nối backend.
 */

export interface DonMuaHangRecord {
  id: string
  tinh_trang: string
  ngay_don_hang: string // ISO date
  so_don_hang: string
  ngay_giao_hang: string | null
  nha_cung_cap: string
  dien_giai: string
  gia_tri_don_hang: number
  so_chung_tu_cukcuk: string
}

export interface DonMuaHangChiTiet {
  id: string
  don_mua_hang_id: string
  ma_hang: string
  ten_hang: string
  ma_quy_cach: string
  dvt: string
  chieu_dai: number
  chieu_rong: number
  chieu_cao: number
  ban_kinh: number
  luong: number
  so_luong: number
  so_luong_nhan: number
  don_gia: number
  thanh_tien: number
  pt_thue_gtgt: number | null
  tien_thue_gtgt: number | null
  lenh_san_xuat: string
}

/** Dữ liệu mẫu đơn mua hàng */
const MOCK_DON: DonMuaHangRecord[] = [
  {
    id: 'dmh1',
    tinh_trang: 'Chưa thực hiện',
    ngay_don_hang: '2026-03-10',
    so_don_hang: 'DMH00001',
    ngay_giao_hang: null,
    nha_cung_cap: 'CÔNG TY TNHH QUẢNG CÁO VAX',
    dien_giai: '',
    gia_tri_don_hang: 4000000,
    so_chung_tu_cukcuk: '',
  },
  {
    id: 'dmh2',
    tinh_trang: 'Đang thực hiện',
    ngay_don_hang: '2026-03-12',
    so_don_hang: 'DMH00002',
    ngay_giao_hang: '2026-03-20',
    nha_cung_cap: 'CÔNG TY CP NGUYÊN VẬT LIỆU ABC',
    dien_giai: 'Đơn hàng vật tư quý 1',
    gia_tri_don_hang: 15000000,
    so_chung_tu_cukcuk: 'CUKCUK-2026-001',
  },
  {
    id: 'dmh3',
    tinh_trang: 'Chưa thực hiện',
    ngay_don_hang: '2026-03-15',
    so_don_hang: 'DMH00003',
    ngay_giao_hang: null,
    nha_cung_cap: 'CÔNG TY TNHH DỊCH VỤ XYZ',
    dien_giai: '',
    gia_tri_don_hang: 8500000,
    so_chung_tu_cukcuk: '',
  },
]

/** Chi tiết theo đơn */
const MOCK_CHI_TIET: DonMuaHangChiTiet[] = [
  {
    id: 'ct1',
    don_mua_hang_id: 'dmh1',
    ma_hang: 'VT00001',
    ten_hang: 'decal trang sus',
    ma_quy_cach: '',
    dvt: 'Cây',
    chieu_dai: 0,
    chieu_rong: 0,
    chieu_cao: 0,
    ban_kinh: 0,
    luong: 0,
    so_luong: 5,
    so_luong_nhan: 0,
    don_gia: 800000,
    thanh_tien: 4000000,
    pt_thue_gtgt: null,
    tien_thue_gtgt: null,
    lenh_san_xuat: '',
  },
]

/** Lấy từ/đến theo kỳ: "dau-thang-hien-tai" | "tuan-nay" | "thang-nay" | "quy-nay" | "nam-nay" */
export function getDateRangeForKy(ky: string): { tu: string; den: string } {
  const now = new Date()
  const den = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let tu: Date
  switch (ky) {
    case 'tuan-nay': {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      tu = new Date(den)
      tu.setDate(tu.getDate() - diff)
      break
    }
    case 'thang-nay':
      tu = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quy-nay': {
      const q = Math.floor(now.getMonth() / 3) + 1
      tu = new Date(now.getFullYear(), (q - 1) * 3, 1)
      break
    }
    case 'nam-nay':
      tu = new Date(now.getFullYear(), 0, 1)
      break
    default:
      // Đầu tháng đến hiện tại
      tu = new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return {
    tu: formatLocalDate(tu),
    den: formatLocalDate(den),
  }
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const KY_OPTIONS = [
  { value: 'dau-thang-hien-tai', label: 'Đầu tháng đơn hiện tại' },
  { value: 'tuan-nay', label: 'Tuần này' },
  { value: 'thang-nay', label: 'Tháng này' },
  { value: 'quy-nay', label: 'Quý này' },
  { value: 'nam-nay', label: 'Năm nay' },
] as const

export type KyValue = (typeof KY_OPTIONS)[number]['value']

export interface DonMuaHangFilter {
  ky: KyValue
  tu: string // yyyy-mm-dd
  den: string
}

export function donMuaHangGetAll(filter: DonMuaHangFilter): DonMuaHangRecord[] {
  const { tu, den } = filter
  return MOCK_DON.filter((d) => {
    const ngay = d.ngay_don_hang
    return ngay >= tu && ngay <= den
  })
}

export function donMuaHangGetChiTiet(donId: string): DonMuaHangChiTiet[] {
  return MOCK_CHI_TIET.filter((c) => c.don_mua_hang_id === donId)
}

export function getDefaultDonMuaHangFilter(): DonMuaHangFilter {
  const { tu, den } = getDateRangeForKy('dau-thang-hien-tai')
  return { ky: 'dau-thang-hien-tai', tu, den }
}
