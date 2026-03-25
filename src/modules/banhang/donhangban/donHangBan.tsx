/**
 * Đơn hàng bán — danh sách + form.
 * Phân nhánh: "Lập từ báo giá" — tự động copy 100% chi tiết + khách hàng.
 * Nút "Lập phiếu xuất kho" tích hợp liên kết module xuatkho.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, Eye, Mail, MessageCircle, Package, X } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../components/common/dataGrid'
import { Modal } from '../../../components/common/modal'
import { useToastOptional } from '../../../context/toastContext'
import { matchSearchKeyword } from '../../../utils/stringUtils'
import { formatNumberDisplay, formatSoThapPhan } from '../../../utils/numberFormat'
import {
  formFooterButtonCancel,
  formFooterButtonSave,
  formFooterButtonSaveAndAdd,
} from '../../../constants/formFooterButtons'
import {
  donHangBanGetAll,
  donHangBanGetChiTiet,
  donHangBanDelete,
  donHangBanPost,
  donHangBanPut,
  donHangBanSoTiepTheo,
  getDefaultDonHangBanFilter,
  KY_OPTIONS,
  type DonHangBanRecord,
  type DonHangBanChiTiet,
  type BanHangKyValue,
} from './donHangBanApi'
import {
  baoGiaGetAll,
  baoGiaGetChiTiet,
  getDefaultBaoGiaFilter,
  type BaoGiaRecord,
} from '../baogia/baoGiaApi'
import type { DonHangBanCreatePayload, BanHangFilter } from '../../../types/banHang'
import styles from '../BanHang.module.css'

function Badge({ value }: { value: string }) {
  const cls =
    value === 'Đã xuất kho' ? styles.badgeDaXuatKho
    : value === 'Đang thực hiện' ? styles.badgeDangThucHien
    : value === 'Hủy bỏ' ? styles.badgeDaHuy
    : value === 'Chưa thực hiện' ? styles.badgeChuaThucHien
    : styles.badgeDefault
  return <span className={cls}>{value}</span>
}

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

const TINH_TRANGS: DonHangBanRecord['tinh_trang'][] = ['Chưa thực hiện', 'Đang thực hiện', 'Đã xuất kho', 'Hủy bỏ']
const TODAY_ISO = new Date().toISOString().slice(0, 10)

// ─── Chọn báo giá (modal) ────────────────────────────────────────────────

function ChonBaoGiaModal({ onClose, onChon }: { onClose: () => void; onChon: (bg: BaoGiaRecord) => void }) {
  const [list] = useState<BaoGiaRecord[]>(() => baoGiaGetAll({ ...getDefaultBaoGiaFilter(), tim_kiem: '' }))
  const [search, setSearch] = useState('')
  const filtered = search.trim()
    ? list.filter((r) => matchSearchKeyword(`${r.so_bao_gia} ${r.khach_hang}`, search))
    : list
  return (
    <Modal open onClose={onClose} title="Chọn Báo giá" size="md"
      footer={<button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>}
    >
      <input
        className={styles.searchInput}
        placeholder="Tìm mã BG, khách hàng..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 8, width: '100%' }}
        autoFocus
      />
      <div style={{ maxHeight: 320, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              {['Số BG', 'Ngày BG', 'Khách hàng', 'Tổng tiền', 'Trạng thái'].map((h) => (
                <th key={h} style={{ padding: '5px 8px', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border-strong)', textAlign: 'left', position: 'sticky', top: 0 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ cursor: 'pointer' }}
                onClick={() => onChon(r)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-selected-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>{r.so_bao_gia}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNgay(r.ngay_bao_gia)}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>{r.khach_hang}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(r.tong_thanh_toan, 0)}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>{r.tinh_trang}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)' }}>Không có báo giá phù hợp.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

// ─── Form ────────────────────────────────────────────────────────────────

interface DonHangBanFormProps {
  mode: 'add' | 'edit' | 'view'
  initialRecord?: DonHangBanRecord
  initialChiTiet?: DonHangBanChiTiet[]
  prefillTuBaoGia?: { baoGia: BaoGiaRecord; chiTiet: DonHangBanChiTiet[] }
  onClose: () => void
  onSaved: () => void
  onSavedAndAdd?: () => void
}

function DonHangBanForm({ mode, initialRecord, initialChiTiet, prefillTuBaoGia, onClose, onSaved, onSavedAndAdd }: DonHangBanFormProps) {
  const toast = useToastOptional()
  const soRef = useRef<HTMLInputElement>(null)
  const [chonBaoGiaOpen, setChonBaoGiaOpen] = useState(false)

  const [soDon, setSoDon] = useState(initialRecord?.so_don_hang ?? '')
  const [ngayDon, setNgayDon] = useState(initialRecord?.ngay_don_hang ?? TODAY_ISO)
  const [ngayGiaoHang, setNgayGiaoHang] = useState(initialRecord?.ngay_giao_hang ?? '')
  const [khachHang, setKhachHang] = useState(initialRecord?.khach_hang ?? '')
  const [diaChi, setDiaChi] = useState(initialRecord?.dia_chi ?? '')
  const [maSoThue, setMaSoThue] = useState(initialRecord?.ma_so_thue ?? '')
  const [dienGiai, setDienGiai] = useState(initialRecord?.dien_giai ?? '')
  const [tinhTrang, setTinhTrang] = useState<DonHangBanRecord['tinh_trang']>(initialRecord?.tinh_trang ?? 'Chưa thực hiện')
  const [nvBanHang, setNvBanHang] = useState(initialRecord?.nv_ban_hang ?? '')
  const [baoGiaId, setBaoGiaId] = useState(initialRecord?.bao_gia_id ?? '')
  const [soBaoGiaGoc, setSoBaoGiaGoc] = useState(initialRecord?.so_bao_gia_goc ?? '')
  const [loi, setLoi] = useState('')
  const [chiTiet, setChiTiet] = useState<(Partial<DonHangBanChiTiet> & { _key: string })[]>(
    prefillTuBaoGia
      ? prefillTuBaoGia.chiTiet.map((c) => ({ ...c, _key: c.id }))
      : initialChiTiet?.map((c) => ({ ...c, _key: c.id })) ?? []
  )

  useEffect(() => {
    if (mode === 'add' && !initialRecord && !prefillTuBaoGia) {
      setSoDon(donHangBanSoTiepTheo())
    }
    if (prefillTuBaoGia) {
      setKhachHang(prefillTuBaoGia.baoGia.khach_hang)
      setBaoGiaId(prefillTuBaoGia.baoGia.id)
      setSoBaoGiaGoc(prefillTuBaoGia.baoGia.so_bao_gia)
      setDienGiai(prefillTuBaoGia.baoGia.dien_giai ?? '')
    }
    setTimeout(() => soRef.current?.focus(), 60)
  }, [])

  const applyBaoGia = (bg: BaoGiaRecord) => {
    setChonBaoGiaOpen(false)
    const ct = baoGiaGetChiTiet(bg.id)
    setBaoGiaId(bg.id)
    setSoBaoGiaGoc(bg.so_bao_gia)
    setKhachHang(bg.khach_hang)
    setDienGiai(bg.dien_giai ?? '')
    setChiTiet(ct.map((c) => ({ ...c, _key: c.id, don_hang_ban_id: '' })))
    toast?.showToast(`Đã copy dữ liệu từ báo giá ${bg.so_bao_gia}.`, 'success')
  }

  const tongTienHang = chiTiet.reduce((s, c) => s + (Number(c.thanh_tien) || 0), 0)
  const tongThueGtgt = chiTiet.reduce((s, c) => s + (Number(c.tien_thue_gtgt) || 0), 0)
  const tongThanhToan = tongTienHang + tongThueGtgt

  const capNhatDong = (key: string, field: string, val: string | number | null) => {
    setChiTiet((prev) =>
      prev.map((c) => {
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
      })
    )
  }

  const validate = () => {
    if (!soDon.trim()) { setLoi('Số đơn không được để trống.'); soRef.current?.focus(); return false }
    if (!khachHang.trim()) { setLoi('Khách hàng không được để trống.'); return false }
    setLoi(''); return true
  }

  const buildPayload = (): DonHangBanCreatePayload => ({
    so_don_hang: soDon.trim(),
    ngay_don_hang: ngayDon,
    ngay_giao_hang: ngayGiaoHang || null,
    khach_hang: khachHang.trim(),
    dia_chi: diaChi.trim() || undefined,
    ma_so_thue: maSoThue.trim() || undefined,
    dien_giai: dienGiai.trim() || undefined,
    tong_tien_hang: tongTienHang,
    tong_thue_gtgt: tongThueGtgt,
    tong_thanh_toan: tongThanhToan,
    tinh_trang: tinhTrang,
    nv_ban_hang: nvBanHang.trim() || undefined,
    bao_gia_id: baoGiaId || undefined,
    so_bao_gia_goc: soBaoGiaGoc || undefined,
    chi_tiet: chiTiet.map((c, i) => ({
      stt: i + 1, ma_hang: c.ma_hang ?? '', ten_hang: c.ten_hang ?? '', dvt: c.dvt ?? '',
      so_luong: Number(c.so_luong) || 0, don_gia: Number(c.don_gia) || 0,
      thanh_tien: Number(c.thanh_tien) || 0,
      pt_thue_gtgt: c.pt_thue_gtgt ?? null, tien_thue_gtgt: c.tien_thue_gtgt ?? null, ghi_chu: c.ghi_chu,
    })),
  })

  const handleLuu = () => {
    if (!validate()) return
    if (mode === 'edit' && initialRecord) {
      donHangBanPut(initialRecord.id, buildPayload())
      toast?.showToast('Đã lưu đơn hàng bán.', 'success')
    } else {
      donHangBanPost(buildPayload())
      toast?.showToast('Đã thêm đơn hàng bán.', 'success')
    }
    onSaved()
  }

  const handleLuuVaTiepTuc = () => {
    if (!validate()) return
    donHangBanPost(buildPayload())
    toast?.showToast('Đã lưu. Tiếp tục thêm mới.', 'success')
    setSoDon(donHangBanSoTiepTheo()); setKhachHang(''); setDiaChi(''); setMaSoThue('')
    setDienGiai(''); setTinhTrang('Chưa thực hiện'); setNvBanHang(''); setBaoGiaId('')
    setSoBaoGiaGoc(''); setChiTiet([]); setLoi('')
    onSavedAndAdd?.()
  }

  const readOnly = mode === 'view'
  const xuatKhoDisabled = tinhTrang !== 'Đang thực hiện'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.modalHeader}>
        <span className={styles.modalTitle}>
          {mode === 'add' ? 'Thêm Đơn hàng bán' : mode === 'edit' ? 'Sửa Đơn hàng bán' : 'Xem Đơn hàng bán'}
          {soBaoGiaGoc && (
            <span className={styles.sourceBadge} style={{ marginLeft: 8 }}>Từ BG: {soBaoGiaGoc}</span>
          )}
        </span>
        {loi && <span style={{ fontSize: 11, color: '#dc2626', marginLeft: 12 }}>{loi}</span>}
        <button type="button" className={styles.modalCloseBtn} onClick={onClose}><X size={14} /></button>
      </div>

      <div className={styles.modalBody}>
        {!readOnly && (
          <div style={{ marginBottom: 10 }}>
            <button type="button" className={styles.toolbarBtn} onClick={() => setChonBaoGiaOpen(true)}>
              <Plus size={12} /> Lập từ Báo giá
            </button>
            {soBaoGiaGoc && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>Đã copy từ: {soBaoGiaGoc}</span>}
          </div>
        )}

        <div className={styles.formSectionTitle}>Thông tin chung</div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Số đơn hàng</span>
          <div className={styles.formControl}>
            <input ref={soRef} className={styles.formInput} value={soDon} onChange={(e) => setSoDon(e.target.value)} readOnly={readOnly} />
          </div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>Trạng thái</span>
          <div className={styles.formControl}>
            <select className={styles.formSelect} value={tinhTrang} onChange={(e) => setTinhTrang(e.target.value as DonHangBanRecord['tinh_trang'])} disabled={readOnly}>
              {TINH_TRANGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Ngày đặt hàng</span>
          <div className={styles.formControl}>
            <input type="date" className={styles.formInput} style={{ textAlign: 'right' }} value={ngayDon} onChange={(e) => setNgayDon(e.target.value)} readOnly={readOnly} />
          </div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>Ngày giao hàng</span>
          <div className={styles.formControl}>
            <input type="date" className={styles.formInput} style={{ textAlign: 'right' }} value={ngayGiaoHang} onChange={(e) => setNgayGiaoHang(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Khách hàng</span>
          <div className={styles.formControl} style={{ flex: 3 }}>
            <input className={styles.formInput} value={khachHang} onChange={(e) => setKhachHang(e.target.value)} readOnly={readOnly} placeholder="Tên khách hàng" />
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Địa chỉ</span>
          <div className={styles.formControl} style={{ flex: 3 }}>
            <input className={styles.formInput} value={diaChi} onChange={(e) => setDiaChi(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Mã số thuế</span>
          <div className={styles.formControl}>
            <input className={styles.formInput} value={maSoThue} onChange={(e) => setMaSoThue(e.target.value)} readOnly={readOnly} />
          </div>
          <span className={styles.formLabel} style={{ minWidth: 80 }}>NV bán hàng</span>
          <div className={styles.formControl}>
            <input className={styles.formInput} value={nvBanHang} onChange={(e) => setNvBanHang(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        <div className={styles.formRow}>
          <span className={styles.formLabel}>Diễn giải</span>
          <div className={styles.formControl} style={{ flex: 3 }}>
            <input className={styles.formInput} value={dienGiai} onChange={(e) => setDienGiai(e.target.value)} readOnly={readOnly} />
          </div>
        </div>

        <div className={styles.formSectionTitle} style={{ marginTop: 14 }}>Chi tiết vật tư hàng hóa</div>

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
                <th className={styles.tdCenter}>STT</th>
                <th>Mã VTHH</th><th>Tên VTHH</th><th>ĐVT</th>
                <th className={styles.thRight}>Số lượng</th><th className={styles.thRight}>Đơn giá</th>
                <th className={styles.thRight}>Thành tiền</th><th className={styles.thRight}>% GTGT</th>
                <th className={styles.thRight}>Tiền GTGT</th><th>Ghi chú</th>
                {!readOnly && <th />}
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
              {chiTiet.length === 0 && (
                <tr><td colSpan={readOnly ? 10 : 11} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px 0', fontSize: 11 }}>Chưa có dòng.</td></tr>
              )}
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

        <div style={{ display: 'flex', gap: 24, justifyContent: 'flex-end', marginTop: 10, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          <span>Tiền hàng: <strong>{formatNumberDisplay(tongTienHang, 0)}</strong></span>
          <span>Thuế GTGT: <strong>{formatNumberDisplay(tongThueGtgt, 0)}</strong></span>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Tổng thanh toán: <strong>{formatNumberDisplay(tongThanhToan, 0)}</strong></span>
        </div>

        {/* Nút Lập phiếu xuất kho */}
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className={styles.toolbarBtn}
            disabled={xuatKhoDisabled}
            title={xuatKhoDisabled ? 'Đơn hàng cần ở trạng thái Đang thực hiện để lập phiếu xuất kho' : 'Lập phiếu xuất kho liên kết với module Kho'}
            onClick={() => toast?.showToast('Đã khởi tạo phiếu xuất kho (liên kết module xuatkho).', 'success')}
          >
            <Package size={13} /> Lập phiếu xuất kho
          </button>
          {tinhTrang === 'Đã xuất kho' && (
            <span className={styles.xuatKhoBadge} style={{ marginLeft: 8 }}>Đã xuất kho</span>
          )}
        </div>
      </div>

      <div className={styles.modalFooter}>
        {!readOnly ? (
          <>
            <button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>
            <button type="button" style={formFooterButtonSave} onClick={handleLuu}>Lưu</button>
            {mode === 'add' && (
              <button type="button" style={formFooterButtonSaveAndAdd} onClick={handleLuuVaTiepTuc}>Lưu và tiếp tục</button>
            )}
          </>
        ) : (
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>Đóng</button>
        )}
      </div>

      {chonBaoGiaOpen && (
        <ChonBaoGiaModal onClose={() => setChonBaoGiaOpen(false)} onChon={applyBaoGia} />
      )}
    </div>
  )
}

// ─── Danh sách ───────────────────────────────────────────────────────────

const columns: DataGridColumn<DonHangBanRecord>[] = [
  { key: 'so_don_hang', label: 'Số ĐHB', width: 100 },
  { key: 'ngay_don_hang', label: 'Ngày ĐH', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string) },
  { key: 'ngay_giao_hang', label: 'Ngày GH', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string | null) },
  { key: 'khach_hang', label: 'Khách hàng', width: '24%' },
  { key: 'dien_giai', label: 'Diễn giải', width: '18%' },
  { key: 'so_bao_gia_goc', label: 'Từ BG', width: 90, renderCell: (v) => v ? <span className={styles.sourceBadge}>{String(v)}</span> : '' },
  { key: 'tong_thanh_toan', label: 'Tổng tiền', width: 110, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'tinh_trang', label: 'Trạng thái', width: 110, renderCell: (v) => <Badge value={String(v)} /> },
  { key: 'nv_ban_hang', label: 'NV bán hàng', width: '10%' },
]

const columnsChiTiet: DataGridColumn<DonHangBanChiTiet>[] = [
  { key: 'stt', label: 'STT', width: 36, align: 'center', renderCell: (_v, _r, idx) => String((idx ?? 0) + 1) },
  { key: 'ma_hang', label: 'Mã VTHH', width: 88 },
  { key: 'ten_hang', label: 'Tên VTHH', width: 220 },
  { key: 'dvt', label: 'ĐVT', width: 60 },
  { key: 'so_luong', label: 'Số lượng', width: 68, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
  { key: 'don_gia', label: 'Đơn giá', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'thanh_tien', label: 'Thành tiền', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'pt_thue_gtgt', label: '% GTGT', width: 72, align: 'right', renderCell: (v) => v != null ? formatSoThapPhan(Number(v), 0) : '' },
  { key: 'tien_thue_gtgt', label: 'Tiền GTGT', width: 100, align: 'right', renderCell: (v) => v != null ? formatNumberDisplay(Number(v), 0) : '' },
  { key: 'ghi_chu', label: 'Ghi chú', width: 160 },
]

export function DonHangBan() {
  const toast = useToastOptional()
  const [filter, setFilter] = useState<BanHangFilter>(getDefaultDonHangBanFilter)
  const [danhSach, setDanhSach] = useState<DonHangBanRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chiTiet, setChiTiet] = useState<DonHangBanChiTiet[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit' | 'view'>('add')
  const [formRecord, setFormRecord] = useState<DonHangBanRecord | null>(null)
  const [xoaModal, setXoaModal] = useState<DonHangBanRecord | null>(null)
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; row: DonHangBanRecord | null }>({ open: false, x: 0, y: 0, row: null })
  const [formKey, setFormKey] = useState(0)

  const loadData = useCallback(() => setDanhSach(donHangBanGetAll(filter)), [filter])
  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (selectedId) setChiTiet(donHangBanGetChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId])

  const filtered = search.trim()
    ? danhSach.filter((r) => matchSearchKeyword(`${r.so_don_hang} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang} ${r.so_bao_gia_goc ?? ''}`, search))
    : danhSach

  useEffect(() => {
    const h = (_e: MouseEvent) => setContextMenu((m) => m.open ? { ...m, open: false } : m)
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])

  const tongTien = filtered.reduce((s, r) => s + r.tong_thanh_toan, 0)
  const selectedRow = selectedId ? danhSach.find((r) => r.id === selectedId) ?? null : null

  return (
    <div className={styles.root}>
      <div className={styles.toolbarWrap}>
        <button type="button" className={styles.toolbarBtn} onClick={() => { setFormRecord(null); setFormMode('add'); setFormKey((k) => k + 1); setShowForm(true) }}>
          <Plus size={13} /><span>Thêm</span>
        </button>
        <button type="button" className={styles.toolbarBtnDanger} disabled={!selectedId}
          onClick={() => selectedRow && setXoaModal(selectedRow)}>
          <Trash2 size={13} /><span>Xóa</span>
        </button>

        <div className={styles.filterWrap} style={{ marginLeft: 8 }}>
          <span className={styles.filterLabel}>Kỳ</span>
          <select className={styles.filterInput} value={filter.ky} onChange={(e) => setFilter((f) => ({ ...f, ky: e.target.value as BanHangKyValue }))}>
            {KY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <input type="text" className={styles.searchInput} placeholder="Tìm mã đơn, KH, diễn giải, BG..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className={styles.contentArea}>
        <div className={styles.gridWrap}>
          <DataGrid<DonHangBanRecord>
            columns={columns} data={filtered} keyField="id" stripedRows compact height="100%"
            selectedRowId={selectedId}
            onRowSelect={(r) => setSelectedId(r.id)}
            onRowDoubleClick={(r) => { setFormRecord(r); setFormMode('view'); setFormKey((k) => k + 1); setShowForm(true) }}
            onRowContextMenu={(row, e) => { e.preventDefault(); setSelectedId(row.id); setContextMenu({ open: true, x: e.clientX, y: e.clientY, row }) }}
            summary={[
              { label: 'Tổng thanh toán', value: formatNumberDisplay(tongTien, 0) },
              { label: 'Số dòng', value: `= ${filtered.length}` },
            ]}
          />
        </div>
        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>Chi tiết VTHH</button>
          </div>
          <div className={styles.detailTabPanel}>
            <DataGrid<DonHangBanChiTiet>
              columns={columnsChiTiet} data={chiTiet} keyField="id" stripedRows compact height="100%"
              summary={[{ label: 'Thành tiền', value: formatNumberDisplay(chiTiet.reduce((s, c) => s + c.thanh_tien, 0), 0) }]}
            />
          </div>
        </div>
      </div>

      {contextMenu.open && contextMenu.row && (
        <div className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
          <button type="button" className={styles.contextMenuItem} onClick={() => { setFormRecord(contextMenu.row!); setFormMode('view'); setFormKey((k) => k + 1); setShowForm(true); setContextMenu((m) => ({ ...m, open: false })) }}><Eye size={13} /> Xem</button>
          <button type="button" className={styles.contextMenuItem} onClick={() => { setFormRecord(contextMenu.row!); setFormMode('edit'); setFormKey((k) => k + 1); setShowForm(true); setContextMenu((m) => ({ ...m, open: false })) }}><Plus size={13} /> Sửa</button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem} onClick={() => { toast?.showToast('Đã gửi Email.', 'success'); setContextMenu((m) => ({ ...m, open: false })) }}><Mail size={13} /> Gửi Email</button>
          <button type="button" className={styles.contextMenuItem} onClick={() => { toast?.showToast('Đã gửi Zalo.', 'success'); setContextMenu((m) => ({ ...m, open: false })) }}><MessageCircle size={13} /> Gửi Zalo</button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem} style={{ color: '#dc2626' }} onClick={() => { setXoaModal(contextMenu.row!); setContextMenu((m) => ({ ...m, open: false })) }}><Trash2 size={13} /> Xóa</button>
        </div>
      )}

      <Modal open={xoaModal != null} onClose={() => setXoaModal(null)} title="Xác nhận xóa" size="sm"
        footer={<>
          <button type="button" className={styles.modalBtn} onClick={() => setXoaModal(null)}>Hủy bỏ</button>
          <button type="button" className={styles.modalBtnDanger} onClick={() => {
            if (!xoaModal) return
            donHangBanDelete(xoaModal.id)
            loadData()
            if (selectedId === xoaModal.id) setSelectedId(null)
            toast?.showToast(`Đã xóa ${xoaModal.so_don_hang}.`, 'info')
            setXoaModal(null)
          }}>Đồng ý xóa</button>
        </>}
      >
        {xoaModal && (
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)' }}>
            Xóa đơn hàng bán <strong>{xoaModal.so_don_hang}</strong> — <strong>{xoaModal.khach_hang}</strong>?<br />
            <span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span>
          </p>
        )}
      </Modal>

      {showForm && (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modalBoxLarge} style={{ height: '88vh' }} onClick={(e) => e.stopPropagation()}>
            <DonHangBanForm
              key={formKey}
              mode={formMode}
              initialRecord={formRecord ?? undefined}
              initialChiTiet={formRecord ? donHangBanGetChiTiet(formRecord.id) : undefined}
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
