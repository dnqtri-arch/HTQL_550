/**
 * Danh sách Nhập kho — hiển thị phiếu NVTHH trong tab "Nhập kho" của Kho hàng.
 * Cột: Mã phiếu | Nhà cung cấp | TG nhập | Nhận hàng từ | Tình trạng | Kho nhập/Tên CT | Giá trị | Ghi chú
 */

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  nhanVatTuHangHoaGetAll,
  getDefaultNhanVatTuHangHoaFilter,
  type NhanVatTuHangHoaRecord,
} from '../nhanVatTuHangHoa/nhanVatTuHangHoaApi'
import { loadKhoListFromStorage } from './khoStorage'
import { formatSoNguyen } from '../../../utils/numberFormat'

/* ── Màu tình trạng ── */
function mauTinhTrang(tt: string): { color: string; bg: string } {
  const t = (tt ?? '').trim()
  if (t === 'Đã nhập kho' || t === 'Đã nhận hàng') return { color: '#1B5E20', bg: '#E8F5E9' }
  if (t === 'Hủy bỏ') return { color: '#B71C1C', bg: '#FFEBEE' }
  if (t.includes('Mới') || t === 'Chờ duyệt') return { color: '#1565C0', bg: '#E3F2FD' }
  return { color: '#555', bg: '#F5F5F5' }
}

/* ── Format dd/mm/yyyy hh:mm ── */
function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (!m) return iso
  const base = `${m[3]}/${m[2]}/${m[1]}`
  return m[4] ? `${base} ${m[4]}:${m[5]}` : base
}

/* ── Tìm tên kho ── */
function tenKho(id: string, khoList: { id: string; label: string }[]): string {
  return khoList.find((k) => k.id === id)?.label ?? id
}

const tdSt: React.CSSProperties = {
  padding: '3px 7px', fontSize: 11, borderBottom: '0.5px solid var(--border)',
  borderRight: '0.5px solid var(--border)', color: 'var(--text-primary)',
  boxSizing: 'border-box', whiteSpace: 'nowrap',
}
const thSt: React.CSSProperties = {
  ...tdSt, position: 'sticky', top: 0, zIndex: 2,
  background: '#EEEEEE', fontWeight: 600,
}

export function NhapKhoList() {
  const [danhSach, setDanhSach] = useState<NhanVatTuHangHoaRecord[]>([])
  const [dangTai, setDangTai] = useState(false)
  const [khoList, setKhoList] = useState<{ id: string; label: string }[]>([])

  const taiDuLieu = () => {
    setDangTai(true)
    try {
      const all = nhanVatTuHangHoaGetAll({ ...getDefaultNhanVatTuHangHoaFilter(), tu: '', den: '' })
      setDanhSach(all.sort((a, b) => b.ngay_don_hang.localeCompare(a.ngay_don_hang)))
    } finally { setDangTai(false) }
  }

  useEffect(() => {
    setKhoList(loadKhoListFromStorage())
    taiDuLieu()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 300 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0 6px', flexShrink: 0 }}>
        <button type="button" onClick={taiDuLieu}
          style={{ height: 26, padding: '0 10px', fontSize: 11, borderRadius: 3, border: '0.5px solid var(--border-strong)', background: 'var(--bg-tab)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={12} className={dangTai ? 'htql-spin' : ''} />Tải lại
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
          {danhSach.length} phiếu
        </span>
      </div>

      {/* Bảng */}
      <div style={{ flex: 1, overflow: 'auto', border: '0.5px solid var(--border)', borderRadius: 4, minHeight: 0 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%', minWidth: 860 }}>
          <thead>
            <tr>
              {/* X7: cột theo yêu cầu */}
              <th style={{ ...thSt, width: 130 }}>Mã phiếu</th>
              <th style={{ ...thSt, width: 180 }}>Nhà cung cấp</th>
              <th style={{ ...thSt, width: 118, textAlign: 'center' }}>TG nhập</th>
              <th style={{ ...thSt, width: 110 }}>Nhận hàng từ</th>
              <th style={{ ...thSt, width: 110, textAlign: 'center' }}>Tình trạng</th>
              <th style={{ ...thSt, minWidth: 140 }}>Kho nhập / Công trình</th>
              <th style={{ ...thSt, width: 110, textAlign: 'right' }}>Giá trị</th>
              <th style={{ ...thSt, minWidth: 160 }}>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {dangTai && (
              <tr><td colSpan={8} style={{ ...tdSt, textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Đang tải...</td></tr>
            )}
            {!dangTai && danhSach.length === 0 && (
              <tr><td colSpan={8} style={{ ...tdSt, textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Chưa có phiếu nhập kho nào.</td></tr>
            )}
            {!dangTai && danhSach.map((r, i) => {
              const bg = i % 2 === 0 ? '#FFFFFF' : '#F5F5F5'
              const { color, bg: ttBg } = mauTinhTrang(r.tinh_trang)

              /* X8: TG nhập = ngay_don_hang dd/mm/yyyy (hh:mm nếu có) */
              const tgNhap = fmtDateTime(r.ngay_don_hang)

              /* X8: Nhận hàng từ — chỉ mã đối tượng (nguoi_giao_hang) */
              const nhanHangTu = r.nguoi_giao_hang ?? ''

              /* X8: Kho nhập / Tên công trình */
              const tenKhoNhap = r.kho_nhap_id ? tenKho(r.kho_nhap_id, khoList) : ''
              const diaDiem = [tenKhoNhap, r.ten_cong_trinh].filter(Boolean).join(' / ')

              /* X11: Giá trị căn phải, định dạng dấu chấm + "đ" */
              const giaTriFmt = r.gia_tri_don_hang > 0
                ? `${formatSoNguyen(r.gia_tri_don_hang)} đ`
                : <span style={{ color: 'var(--text-muted)' }}>—</span>

              /* X12: Ghi chú rút gọn, tooltip hiện đầy đủ */
              const ghiChu = r.dien_giai ?? ''

              return (
                <tr key={r.id} style={{ background: bg }}>
                  <td style={{ ...tdSt, fontWeight: 500 }}>{r.so_don_hang}</td>
                  <td style={{ ...tdSt, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{r.nha_cung_cap}</td>
                  {/* X8: dd/mm/yyyy hh:mm */}
                  <td style={{ ...tdSt, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{tgNhap}</td>
                  {/* X8: Mã đối tượng */}
                  <td style={{ ...tdSt }}>{nhanHangTu}</td>
                  {/* X11: Màu tình trạng */}
                  <td style={{ ...tdSt, textAlign: 'center' }}>
                    <span style={{ background: ttBg, color, borderRadius: 10, padding: '1px 8px', fontSize: 10, fontWeight: 600, display: 'inline-block', whiteSpace: 'nowrap' }}>
                      {r.tinh_trang}
                    </span>
                  </td>
                  {/* X8: Tên kho / Tên công trình */}
                  <td style={{ ...tdSt, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{diaDiem}</td>
                  {/* X11: Giá trị căn phải */}
                  <td style={{ ...tdSt, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{giaTriFmt}</td>
                  {/* X12: Ghi chú rút gọn, tooltip */}
                  <td style={{ ...tdSt, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ghiChu || undefined}>
                    {ghiChu || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '3px 0 0', flexShrink: 0 }}>
        Bảng tổng hợp phiếu Nhận VTHH — Double-click để mở chi tiết
      </div>
    </div>
  )
}
