/**
 * Hóa đơn bán — danh sách + form.
 * Kế thừa dữ liệu từ Đơn hàng bán hoặc Hợp đồng.
 * Công nợ: tính tự động con_lai = tong_thanh_toan - so_tien_da_thu.
 * Badge: Chưa TT (cam), TT 1 phần (xanh dương), Đã TT (xanh lá), Hủy bỏ (đỏ).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, Eye, X } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../components/common/DataGrid'
import { Modal } from '../../../components/common/Modal'
import { useToastOptional } from '../../../context/ToastContext'
import { matchSearchKeyword } from '../../../utils/stringUtils'
import { formatNumberDisplay, formatSoThapPhan } from '../../../utils/numberFormat'
import {
  formFooterButtonCancel,
  formFooterButtonSave,
  formFooterButtonSaveAndAdd,
} from '../../../constants/formFooterButtons'
import {
  hoaDonBanGetAll,
  hoaDonBanGetChiTiet,
  hoaDonBanDelete,
  hoaDonBanPost,
  hoaDonBanPut,
  hoaDonBanSoTiepTheo,
  getDefaultHoaDonBanFilter,
  KY_OPTIONS,
  type HoaDonBanRecord,
  type HoaDonBanChiTiet,
  type BanHangKyValue,
} from './hoaDonBanApi'
import { donHangBanGetAll, donHangBanGetChiTiet, getDefaultDonHangBanFilter } from '../donhangban/donHangBanApi'
import { hopDongBanGetAll, hopDongBanGetChiTiet, getDefaultHopDongBanFilter } from '../hopdong/hopDongBanApi'
import type { HoaDonBanCreatePayload, BanHangFilter, DonHangBanRecord, HopDongBanRecord } from '../../../types/banHang'
import styles from '../BanHang.module.css'

function Badge({ value }: { value: string }) {
  const cls =
    value === 'Đã thanh toán' ? styles.badgeDaThanhToan
    : value === 'Thanh toán 1 phần' ? styles.badgeThanhToan1Phan
    : value === 'Chưa thanh toán' ? styles.badgeChuaThanhToan
    : value === 'Hủy bỏ' ? styles.badgeDaHuy
    : styles.badgeDefault
  return <span className={cls}>{value}</span>
}

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

const TINH_TRANGS: HoaDonBanRecord['tinh_trang'][] = ['Chưa thanh toán', 'Thanh toán 1 phần', 'Đã thanh toán', 'Hủy bỏ']
const TODAY_ISO = new Date().toISOString().slice(0, 10)

// ─── Chọn nguồn (ĐHB hoặc HĐ) ───────────────────────────────────────────

function ChonNguonModal({ onClose, onChonDHB, onChonHDB }: {
  onClose: () => void
  onChonDHB: (r: DonHangBanRecord) => void
  onChonHDB: (r: HopDongBanRecord) => void
}) {
  const [tab, setTab] = useState<'dhb' | 'hdb'>('dhb')
  const [search, setSearch] = useState('')
  const dhbList = donHangBanGetAll({ ...getDefaultDonHangBanFilter(), tim_kiem: '' })
  const hdbList = hopDongBanGetAll({ ...getDefaultHopDongBanFilter(), tim_kiem: '' })
  const filteredDhb = search ? dhbList.filter((r) => matchSearchKeyword(`${r.so_don_hang} ${r.khach_hang}`, search)) : dhbList
  const filteredHdb = search ? hdbList.filter((r) => matchSearchKeyword(`${r.so_hop_dong} ${r.khach_hang}`, search)) : hdbList

  return (
    <Modal open onClose={onClose} title="Lập hóa đơn từ" size="md"
      footer={<button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button type="button" className={tab === 'dhb' ? styles.detailTabActive : styles.detailTab} onClick={() => setTab('dhb')}>Đơn hàng bán</button>
        <button type="button" className={tab === 'hdb' ? styles.detailTabActive : styles.detailTab} onClick={() => setTab('hdb')}>Hợp đồng</button>
      </div>
      <input className={styles.searchInput} placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', marginBottom: 8 }} autoFocus />
      <div style={{ maxHeight: 300, overflow: 'auto' }}>
        {tab === 'dhb' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead><tr>
              {['Số ĐHB', 'Ngày ĐH', 'Khách hàng', 'Tổng tiền', 'Trạng thái'].map((h) => (
                <th key={h} style={{ padding: '5px 8px', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border-strong)', textAlign: 'left', position: 'sticky', top: 0 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filteredDhb.map((r) => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => onChonDHB(r)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-selected-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>{r.so_don_hang}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNgay(r.ngay_don_hang)}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>{r.khach_hang}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(r.tong_thanh_toan, 0)}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>{r.tinh_trang}</td>
                </tr>
              ))}
              {filteredDhb.length === 0 && <tr><td colSpan={5} style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead><tr>
              {['Số HĐ', 'Ngày hiệu lực', 'Khách hàng', 'Hạn mức', 'Trạng thái'].map((h) => (
                <th key={h} style={{ padding: '5px 8px', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border-strong)', textAlign: 'left', position: 'sticky', top: 0 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filteredHdb.map((r) => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => onChonHDB(r)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-selected-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>{r.so_hop_dong}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNgay(r.ngay_hieu_luc)}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>{r.khach_hang}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(r.han_muc_gia_tri, 0)}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>{r.tinh_trang}</td>
                </tr>
              ))}
              {filteredHdb.length === 0 && <tr><td colSpan={5} style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  )
}

// ─── Form ────────────────────────────────────────────────────────────────

interface HoaDonBanFormProps {
  mode: 'add' | 'edit' | 'view'
  initialRecord?: HoaDonBanRecord
  initialChiTiet?: HoaDonBanChiTiet[]
  onClose: () => void
  onSaved: () => void
  onSavedAndAdd?: () => void
}

function HoaDonBanForm({ mode, initialRecord, initialChiTiet, onClose, onSaved, onSavedAndAdd }: HoaDonBanFormProps) {
  const toast = useToastOptional()
  const soRef = useRef<HTMLInputElement>(null)
  const [chonNguonOpen, setChonNguonOpen] = useState(false)

  const [soHoaDon, setSoHoaDon] = useState(initialRecord?.so_hoa_don ?? '')
  const [ngayHoaDon, setNgayHoaDon] = useState(initialRecord?.ngay_hoa_don ?? TODAY_ISO)
  const [khachHang, setKhachHang] = useState(initialRecord?.khach_hang ?? '')
  const [diaChi, setDiaChi] = useState(initialRecord?.dia_chi ?? '')
  const [maSoThue, setMaSoThue] = useState(initialRecord?.ma_so_thue ?? '')
  const [dienGiai, setDienGiai] = useState(initialRecord?.dien_giai ?? '')
  const [tinhTrang, setTinhTrang] = useState<HoaDonBanRecord['tinh_trang']>(initialRecord?.tinh_trang ?? 'Chưa thanh toán')
  const [nvBanHang, setNvBanHang] = useState(initialRecord?.nv_ban_hang ?? '')
  const [soTienDaThu, setSoTienDaThu] = useState(String(initialRecord?.so_tien_da_thu ?? '0'))
  const [donHangBanId, setDonHangBanId] = useState(initialRecord?.don_hang_ban_id ?? '')
  const [soDonHangGoc, setSoDonHangGoc] = useState(initialRecord?.so_don_hang_goc ?? '')
  const [hopDongBanId, setHopDongBanId] = useState(initialRecord?.hop_dong_ban_id ?? '')
  const [soHopDongGoc, setSoHopDongGoc] = useState(initialRecord?.so_hop_dong_goc ?? '')
  const [loi, setLoi] = useState('')
  const [chiTiet, setChiTiet] = useState<(Partial<HoaDonBanChiTiet> & { _key: string })[]>(
    initialChiTiet?.map((c) => ({ ...c, _key: c.id })) ?? []
  )

  useEffect(() => {
    if (mode === 'add' && !initialRecord) setSoHoaDon(hoaDonBanSoTiepTheo())
    setTimeout(() => soRef.current?.focus(), 60)
  }, [])

  const applyDonHangBan = (dhb: DonHangBanRecord) => {
    setChonNguonOpen(false)
    const ct = donHangBanGetChiTiet(dhb.id)
    setKhachHang(dhb.khach_hang); setDiaChi(dhb.dia_chi ?? ''); setMaSoThue(dhb.ma_so_thue ?? '')
    setDienGiai(dhb.dien_giai ?? ''); setDonHangBanId(dhb.id); setSoDonHangGoc(dhb.so_don_hang)
    setHopDongBanId(''); setSoHopDongGoc('')
    setChiTiet(ct.map((c) => ({ ...c, _key: c.id, hoa_don_ban_id: '' })))
    toast?.showToast(`Đã copy từ đơn hàng bán ${dhb.so_don_hang}.`, 'success')
  }

  const applyHopDong = (hdb: HopDongBanRecord) => {
    setChonNguonOpen(false)
    const ct = hopDongBanGetChiTiet(hdb.id)
    setKhachHang(hdb.khach_hang); setDienGiai(hdb.dien_giai ?? '')
    setHopDongBanId(hdb.id); setSoHopDongGoc(hdb.so_hop_dong)
    setDonHangBanId(''); setSoDonHangGoc('')
    setChiTiet(ct.map((c) => ({ ...c, _key: c.id, hoa_don_ban_id: '' })))
    toast?.showToast(`Đã copy từ hợp đồng ${hdb.so_hop_dong}.`, 'success')
  }

  const capNhatDong = (key: string, field: string, val: string | number | null) => {
    setChiTiet((prev) => prev.map((c) => {
      if (c._key !== key) return c
      const updated = { ...c, [field]: val }
      if (field === 'so_luong' || field === 'don_gia') {
        const sl = field === 'so_luong' ? Number(val) : Number(c.so_luong) || 0
        const dg = field === 'don_gia' ? Number(val) : Number(c.don_gia) || 0
        updated.thanh_tien = sl * dg
        if (c.pt_thue_gtgt != null) updated.tien_thue_gtgt = Math.round(updated.thanh_tien * Number(c.pt_thue_gtgt) / 100)
      }
      if (field === 'pt_thue_gtgt') {
        const pct = val == null || val === '' ? null : Number(val)
        updated.pt_thue_gtgt = pct
        updated.tien_thue_gtgt = pct == null ? null : Math.round((Number(c.thanh_tien) || 0) * pct / 100)
      }
      return updated
    }))
  }

  const tongTienHang = chiTiet.reduce((s, c) => s + (Number(c.thanh_tien) || 0), 0)
  const tongThueGtgt = chiTiet.reduce((s, c) => s + (Number(c.tien_thue_gtgt) || 0), 0)
  const tongThanhToan = tongTienHang + tongThueGtgt
  const soTienDaThuNum = Number(soTienDaThu.replace(/[.,\s]/g, '')) || 0
  const conLai = tongThanhToan - soTienDaThuNum

  const validate = () => {
    if (!soHoaDon.trim()) { setLoi('Số hóa đơn không được để trống.'); soRef.current?.focus(); return false }
    if (!khachHang.trim()) { setLoi('Khách hàng không được để trống.'); return false }
    setLoi(''); return true
  }

  const buildPayload = (): HoaDonBanCreatePayload => ({
    so_hoa_don: soHoaDon.trim(), ngay_hoa_don: ngayHoaDon,
    khach_hang: khachHang.trim(), dia_chi: diaChi.trim() || undefined, ma_so_thue: maSoThue.trim() || undefined,
    dien_giai: dienGiai.trim() || undefined,
    tong_tien_hang: tongTienHang, tong_thue_gtgt: tongThueGtgt, tong_thanh_toan: tongThanhToan,
    so_tien_da_thu: soTienDaThuNum, con_lai: conLai,
    tinh_trang: tinhTrang, nv_ban_hang: nvBanHang.trim() || undefined,
    don_hang_ban_id: donHangBanId || undefined, so_don_hang_goc: soDonHangGoc || undefined,
    hop_dong_ban_id: hopDongBanId || undefined, so_hop_dong_goc: soHopDongGoc || undefined,
    chi_tiet: chiTiet.map((c, i) => ({
      stt: i + 1, ma_hang: c.ma_hang ?? '', ten_hang: c.ten_hang ?? '', dvt: c.dvt ?? '',
      so_luong: Number(c.so_luong) || 0, don_gia: Number(c.don_gia) || 0, thanh_tien: Number(c.thanh_tien) || 0,
      pt_thue_gtgt: c.pt_thue_gtgt ?? null, tien_thue_gtgt: c.tien_thue_gtgt ?? null, ghi_chu: c.ghi_chu,
    })),
  })

  const handleLuu = () => {
    if (!validate()) return
    if (mode === 'edit' && initialRecord) {
      hoaDonBanPut(initialRecord.id, buildPayload()); toast?.showToast('Đã lưu hóa đơn.', 'success')
    } else {
      hoaDonBanPost(buildPayload()); toast?.showToast('Đã thêm hóa đơn.', 'success')
    }
    onSaved()
  }

  const handleLuuVaTiepTuc = () => {
    if (!validate()) return
    hoaDonBanPost(buildPayload()); toast?.showToast('Đã lưu. Tiếp tục thêm.', 'success')
    setSoHoaDon(hoaDonBanSoTiepTheo()); setKhachHang(''); setDiaChi(''); setMaSoThue('')
    setDienGiai(''); setTinhTrang('Chưa thanh toán'); setNvBanHang(''); setSoTienDaThu('0')
    setDonHangBanId(''); setSoDonHangGoc(''); setHopDongBanId(''); setSoHopDongGoc('')
    setChiTiet([]); setLoi(''); onSavedAndAdd?.()
  }

  const readOnly = mode === 'view'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.modalHeader}>
        <span className={styles.modalTitle}>
          {mode === 'add' ? 'Thêm Hóa đơn bán' : mode === 'edit' ? 'Sửa Hóa đơn bán' : 'Xem Hóa đơn bán'}
          {soDonHangGoc && <span className={styles.sourceBadge} style={{ marginLeft: 8 }}>Từ ĐHB: {soDonHangGoc}</span>}
          {soHopDongGoc && <span className={styles.sourceBadge} style={{ marginLeft: 8 }}>Từ HĐ: {soHopDongGoc}</span>}
        </span>
        {loi && <span style={{ fontSize: 11, color: '#dc2626', marginLeft: 12 }}>{loi}</span>}
        <button type="button" className={styles.modalCloseBtn} onClick={onClose}><X size={14} /></button>
      </div>

      <div className={styles.modalBody}>
        {!readOnly && (
          <div style={{ marginBottom: 10 }}>
            <button type="button" className={styles.toolbarBtn} onClick={() => setChonNguonOpen(true)}>
              <Plus size={12} /> Lập từ Đơn hàng / Hợp đồng
            </button>
          </div>
        )}

        <div className={styles.formSectionTitle}>Thông tin hóa đơn</div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Số hóa đơn</span>
          <div className={styles.formControl}><input ref={soRef} className={styles.formInput} value={soHoaDon} onChange={(e) => setSoHoaDon(e.target.value)} readOnly={readOnly} /></div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>Trạng thái</span>
          <div className={styles.formControl}>
            <select className={styles.formSelect} value={tinhTrang} onChange={(e) => setTinhTrang(e.target.value as HoaDonBanRecord['tinh_trang'])} disabled={readOnly}>
              {TINH_TRANGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Ngày hóa đơn</span>
          <div className={styles.formControl}><input type="date" className={styles.formInput} style={{ textAlign: 'right' }} value={ngayHoaDon} onChange={(e) => setNgayHoaDon(e.target.value)} readOnly={readOnly} /></div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>NV bán hàng</span>
          <div className={styles.formControl}><input className={styles.formInput} value={nvBanHang} onChange={(e) => setNvBanHang(e.target.value)} readOnly={readOnly} /></div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Khách hàng</span>
          <div className={styles.formControl} style={{ flex: 3 }}><input className={styles.formInput} value={khachHang} onChange={(e) => setKhachHang(e.target.value)} readOnly={readOnly} /></div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Địa chỉ</span>
          <div className={styles.formControl} style={{ flex: 3 }}><input className={styles.formInput} value={diaChi} onChange={(e) => setDiaChi(e.target.value)} readOnly={readOnly} /></div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Mã số thuế</span>
          <div className={styles.formControl}><input className={styles.formInput} value={maSoThue} onChange={(e) => setMaSoThue(e.target.value)} readOnly={readOnly} /></div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>Diễn giải</span>
          <div className={styles.formControl}><input className={styles.formInput} value={dienGiai} onChange={(e) => setDienGiai(e.target.value)} readOnly={readOnly} /></div>
        </div>

        <div className={styles.formSectionTitle} style={{ marginTop: 14 }}>Chi tiết hóa đơn</div>

        <div className={styles.tableScrollWrap} style={{ maxHeight: 200 }}>
          <table className={styles.chiTietTable}>
            <colgroup>
              <col style={{ width: 36 }} /><col style={{ width: 88 }} /><col style={{ width: 180 }} />
              <col style={{ width: 60 }} /><col style={{ width: 72 }} /><col style={{ width: 100 }} />
              <col style={{ width: 100 }} /><col style={{ width: 72 }} /><col style={{ width: 100 }} />
              <col style={{ width: 120 }} />{!readOnly && <col style={{ width: 28 }} />}
            </colgroup>
            <thead>
              <tr>
                <th className={styles.tdCenter}>STT</th><th>Mã VTHH</th><th>Tên VTHH</th><th>ĐVT</th>
                <th className={styles.thRight}>Số lượng</th><th className={styles.thRight}>Đơn giá</th>
                <th className={styles.thRight}>Thành tiền</th><th className={styles.thRight}>% GTGT</th>
                <th className={styles.thRight}>Tiền GTGT</th><th>Ghi chú</th>{!readOnly && <th />}
              </tr>
            </thead>
            <tbody>
              {chiTiet.map((c, idx) => (
                <tr key={c._key}>
                  <td className={styles.tdCenter} style={{ fontSize: 10, color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td><input className={styles.chiTietInput} value={c.ma_hang ?? ''} onChange={(e) => capNhatDong(c._key, 'ma_hang', e.target.value)} readOnly={readOnly} /></td>
                  <td><input className={styles.chiTietInput} value={c.ten_hang ?? ''} onChange={(e) => capNhatDong(c._key, 'ten_hang', e.target.value)} readOnly={readOnly} /></td>
                  <td><input className={styles.chiTietInput} value={c.dvt ?? ''} onChange={(e) => capNhatDong(c._key, 'dvt', e.target.value)} readOnly={readOnly} /></td>
                  <td><input className={styles.chiTietInput} style={{ textAlign: 'right' }} value={c.so_luong ?? ''} onChange={(e) => capNhatDong(c._key, 'so_luong', e.target.value)} readOnly={readOnly} /></td>
                  <td><input className={styles.chiTietInput} style={{ textAlign: 'right' }} value={c.don_gia ?? ''} onChange={(e) => capNhatDong(c._key, 'don_gia', e.target.value)} readOnly={readOnly} /></td>
                  <td className={styles.tdRight} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(Number(c.thanh_tien) || 0, 0)}</td>
                  <td><input className={styles.chiTietInput} style={{ textAlign: 'right' }} value={c.pt_thue_gtgt ?? ''} onChange={(e) => capNhatDong(c._key, 'pt_thue_gtgt', e.target.value === '' ? null : e.target.value)} readOnly={readOnly} /></td>
                  <td className={styles.tdRight} style={{ fontVariantNumeric: 'tabular-nums' }}>{c.tien_thue_gtgt != null ? formatNumberDisplay(Number(c.tien_thue_gtgt), 0) : ''}</td>
                  <td><input className={styles.chiTietInput} value={c.ghi_chu ?? ''} onChange={(e) => capNhatDong(c._key, 'ghi_chu', e.target.value)} readOnly={readOnly} /></td>
                  {!readOnly && <td className={styles.tdCenter}><button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '1px 3px', color: 'var(--text-muted)' }} onClick={() => setChiTiet((p) => p.filter((x) => x._key !== c._key))}><X size={11} /></button></td>}
                </tr>
              ))}
              {chiTiet.length === 0 && <tr><td colSpan={readOnly ? 10 : 11} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px 0', fontSize: 11 }}>Chưa có dòng.</td></tr>}
            </tbody>
          </table>
        </div>

        {!readOnly && (
          <div className={styles.chiTietAddRow}>
            <button type="button" className={styles.toolbarBtn} onClick={() => setChiTiet((p) => [...p, { _key: `new_${Date.now()}`, ma_hang: '', ten_hang: '', dvt: '', so_luong: 1, don_gia: 0, thanh_tien: 0, pt_thue_gtgt: null, tien_thue_gtgt: null, ghi_chu: '' }])}>
              <Plus size={12} /> Thêm dòng
            </button>
          </div>
        )}

        {/* Tổng hợp + Công nợ */}
        <div className={styles.formSectionTitle} style={{ marginTop: 14 }}>Thanh toán</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Tiền hàng:</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(tongTienHang, 0)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Tổng thanh toán:</span>
            <strong style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(tongThanhToan, 0)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Thuế GTGT:</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(tongThueGtgt, 0)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Đã thu:</span>
            {readOnly
              ? <strong style={{ color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(soTienDaThuNum, 0)}</strong>
              : <input className={styles.formInput} style={{ textAlign: 'right', maxWidth: 130, fontVariantNumeric: 'tabular-nums' }} value={soTienDaThu} onChange={(e) => setSoTienDaThu(e.target.value)} />
            }
          </div>
          <div />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Còn lại:</span>
            <strong style={{ color: conLai > 0 ? '#c2410c' : '#15803d', fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(conLai, 0)}</strong>
          </div>
        </div>
      </div>

      <div className={styles.modalFooter}>
        {!readOnly ? (
          <>
            <button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>
            <button type="button" style={formFooterButtonSave} onClick={handleLuu}>Lưu</button>
            {mode === 'add' && <button type="button" style={formFooterButtonSaveAndAdd} onClick={handleLuuVaTiepTuc}>Lưu và tiếp tục</button>}
          </>
        ) : (
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>Đóng</button>
        )}
      </div>

      {chonNguonOpen && (
        <ChonNguonModal onClose={() => setChonNguonOpen(false)} onChonDHB={applyDonHangBan} onChonHDB={applyHopDong} />
      )}
    </div>
  )
}

// ─── Danh sách ───────────────────────────────────────────────────────────

const columns: DataGridColumn<HoaDonBanRecord>[] = [
  { key: 'so_hoa_don', label: 'Số HĐ', width: 100 },
  { key: 'ngay_hoa_don', label: 'Ngày HĐ', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string) },
  { key: 'khach_hang', label: 'Khách hàng', width: '22%' },
  { key: 'dien_giai', label: 'Diễn giải', width: '16%' },
  { key: 'so_don_hang_goc', label: 'Từ ĐHB', width: 90, renderCell: (v) => v ? <span className={styles.sourceBadge}>{String(v)}</span> : '' },
  { key: 'so_hop_dong_goc', label: 'Từ HĐ', width: 90, renderCell: (v) => v ? <span className={styles.sourceBadge}>{String(v)}</span> : '' },
  { key: 'tong_thanh_toan', label: 'Tổng tiền', width: 110, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'so_tien_da_thu', label: 'Đã thu', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'con_lai', label: 'Còn lại', width: 100, align: 'right', renderCell: (v) => <span style={{ color: Number(v) > 0 ? '#c2410c' : '#15803d', fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(Number(v), 0)}</span> },
  { key: 'tinh_trang', label: 'Trạng thái', width: 110, renderCell: (v) => <Badge value={String(v)} /> },
]

export function HoaDonBan() {
  const toast = useToastOptional()
  const [filter, setFilter] = useState<BanHangFilter>(getDefaultHoaDonBanFilter)
  const [danhSach, setDanhSach] = useState<HoaDonBanRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chiTiet, setChiTiet] = useState<HoaDonBanChiTiet[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit' | 'view'>('add')
  const [formRecord, setFormRecord] = useState<HoaDonBanRecord | null>(null)
  const [xoaModal, setXoaModal] = useState<HoaDonBanRecord | null>(null)
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; row: HoaDonBanRecord | null }>({ open: false, x: 0, y: 0, row: null })
  const [formKey, setFormKey] = useState(0)

  const loadData = useCallback(() => setDanhSach(hoaDonBanGetAll(filter)), [filter])
  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (selectedId) setChiTiet(hoaDonBanGetChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId])

  const filtered = search.trim()
    ? danhSach.filter((r) => matchSearchKeyword(`${r.so_hoa_don} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang}`, search))
    : danhSach

  useEffect(() => {
    const h = () => setContextMenu((m) => m.open ? { ...m, open: false } : m)
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])

  const tongTien = filtered.reduce((s, r) => s + r.tong_thanh_toan, 0)
  const tongConLai = filtered.reduce((s, r) => s + r.con_lai, 0)
  const selectedRow = selectedId ? danhSach.find((r) => r.id === selectedId) ?? null : null

  return (
    <div className={styles.root}>
      <div className={styles.toolbarWrap}>
        <button type="button" className={styles.toolbarBtn} onClick={() => { setFormRecord(null); setFormMode('add'); setFormKey((k) => k + 1); setShowForm(true) }}>
          <Plus size={13} /><span>Thêm</span>
        </button>
        <button type="button" className={styles.toolbarBtnDanger} disabled={!selectedId} onClick={() => selectedRow && setXoaModal(selectedRow)}>
          <Trash2 size={13} /><span>Xóa</span>
        </button>
        <div className={styles.filterWrap} style={{ marginLeft: 8 }}>
          <span className={styles.filterLabel}>Kỳ</span>
          <select className={styles.filterInput} value={filter.ky} onChange={(e) => setFilter((f) => ({ ...f, ky: e.target.value as BanHangKyValue }))}>
            {KY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <input type="text" className={styles.searchInput} placeholder="Tìm số HĐ, khách hàng..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className={styles.contentArea}>
        <div className={styles.gridWrap}>
          <DataGrid<HoaDonBanRecord>
            columns={columns} data={filtered} keyField="id" stripedRows compact height="100%"
            selectedRowId={selectedId}
            onRowSelect={(r) => setSelectedId(r.id)}
            onRowDoubleClick={(r) => { setFormRecord(r); setFormMode('view'); setFormKey((k) => k + 1); setShowForm(true) }}
            onRowContextMenu={(row, e) => { e.preventDefault(); setSelectedId(row.id); setContextMenu({ open: true, x: e.clientX, y: e.clientY, row }) }}
            summary={[
              { label: 'Tổng tiền', value: formatNumberDisplay(tongTien, 0) },
              { label: 'Còn lại', value: formatNumberDisplay(tongConLai, 0) },
              { label: 'Số dòng', value: `= ${filtered.length}` },
            ]}
          />
        </div>
        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>Chi tiết VTHH</button>
          </div>
          <div className={styles.detailTabPanel}>
            <DataGrid<HoaDonBanChiTiet> columns={[
              { key: 'stt', label: 'STT', width: 36, align: 'center', renderCell: (_v, _r, idx) => String((idx ?? 0) + 1) },
              { key: 'ma_hang', label: 'Mã VTHH', width: 88 },
              { key: 'ten_hang', label: 'Tên VTHH', width: 220 },
              { key: 'dvt', label: 'ĐVT', width: 60 },
              { key: 'so_luong', label: 'Số lượng', width: 68, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
              { key: 'don_gia', label: 'Đơn giá', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
              { key: 'thanh_tien', label: 'Thành tiền', width: 110, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
            ]} data={chiTiet} keyField="id" stripedRows compact height="100%" />
          </div>
        </div>
      </div>

      {contextMenu.open && contextMenu.row && (
        <div className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
          <button type="button" className={styles.contextMenuItem} onClick={() => { setFormRecord(contextMenu.row!); setFormMode('view'); setFormKey((k) => k + 1); setShowForm(true); setContextMenu((m) => ({ ...m, open: false })) }}><Eye size={13} /> Xem</button>
          <button type="button" className={styles.contextMenuItem} onClick={() => { setFormRecord(contextMenu.row!); setFormMode('edit'); setFormKey((k) => k + 1); setShowForm(true); setContextMenu((m) => ({ ...m, open: false })) }}><Plus size={13} /> Sửa</button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem} style={{ color: '#dc2626' }} onClick={() => { setXoaModal(contextMenu.row!); setContextMenu((m) => ({ ...m, open: false })) }}><Trash2 size={13} /> Xóa</button>
        </div>
      )}

      <Modal open={xoaModal != null} onClose={() => setXoaModal(null)} title="Xác nhận xóa" size="sm"
        footer={<><button type="button" className={styles.modalBtn} onClick={() => setXoaModal(null)}>Hủy bỏ</button>
          <button type="button" className={styles.modalBtnDanger} onClick={() => {
            if (!xoaModal) return
            hoaDonBanDelete(xoaModal.id); loadData()
            if (selectedId === xoaModal.id) setSelectedId(null)
            toast?.showToast(`Đã xóa hóa đơn ${xoaModal.so_hoa_don}.`, 'info')
            setXoaModal(null)
          }}>Đồng ý xóa</button></>}
      >
        {xoaModal && <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)' }}>Xóa hóa đơn <strong>{xoaModal.so_hoa_don}</strong>?<br /><span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span></p>}
      </Modal>

      {showForm && (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modalBoxLarge} style={{ height: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <HoaDonBanForm
              key={formKey} mode={formMode}
              initialRecord={formRecord ?? undefined}
              initialChiTiet={formRecord ? hoaDonBanGetChiTiet(formRecord.id) : undefined}
              onClose={() => setShowForm(false)}
              onSaved={() => { setShowForm(false); loadData() }}
              onSavedAndAdd={() => { loadData(); setFormKey((k) => k + 1) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
