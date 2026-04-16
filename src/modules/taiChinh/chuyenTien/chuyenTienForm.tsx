/**
 * Form phiếu chuyển tiền nội bộ (không lưới chi tiết).
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Paperclip,
  Printer,
  Mail,
  ChevronDown,
  Power,
} from 'lucide-react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { vi } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import { htqlDatePickerPopperTop } from '../../../constants/datePickerPlacement'
import { DatePickerReadOnlyTriggerInput } from '../../../components/datePickerReadOnlyTriggerInput'
import { DatePickerCustomHeader } from '../../../components/datePickerCustomHeader'
import { formFooterButtonCancel, formFooterButtonSave } from '../../../constants/formFooterButtons'
import { LOOKUP_CONTROL_HEIGHT } from '../../../constants/lookupControlStyles'
import { formatSoTien, parseFloatVN } from '../../../utils/numberFormat'
import { htqlFocusAndScrollIntoView } from '../../../utils/formValidationFocus'
import { useToastOptional } from '../../../context/toastContext'
import type { ChuyenTienBangRecord } from '../../../types/chuyenTienBang'
import type { ChuyenTienBangAttachmentItem } from '../../../types/chuyenTienBang'
import {
  chuyenTienBangPost,
  chuyenTienBangPut,
  chuyenTienBangSoTiepTheo,
} from './chuyenTienBangApi'
import { taiKhoanGetAll, taiKhoanLaTkNganHang, taiKhoanLaTienMat } from '../taiKhoan/taiKhoanApi'
import type { TaiKhoanRecord } from '../../../types/taiKhoan'
import {
  ChiTienBangDinhKemModal,
  partMccForPath,
} from '../chiTien/chiTienBangDinhKemModal'
import { daGhiSoPhieuThu } from '../thuTien/ghiSoTaiChinhApi'
import ChiTienStyles from '../chiTien/banHangDetailMirror.module.css'
import { LY_DO_CHUYEN_RUT_TIEN_MAT } from '../../../constants/ngamDinhTaiKhoan'
import {
  loaiThuChiQueryKey,
  loaiThuChiQueryFn,
  loaiThuChiChuyenTienLyDoOptions,
} from '../loaiThuChi/loaiThuChiApi'
import { hopLeCapTkChuyenTien } from './chuyenTienTkHopLe'

registerLocale('vi', vi)

const SUBMENU_HOVER_DELAY_MS = 200

function isoToDate(iso: string | null): Date | null {
  if (!iso || !iso.trim()) return null
  const d = new Date(iso.trim())
  return Number.isNaN(d.getTime()) ? null : d
}

function toIsoDate(d: Date | null): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function tkLabel(tk: TaiKhoanRecord): string {
  const stk = (tk.so_tai_khoan ?? '').trim()
  const nh = (tk.ten_ngan_hang ?? '').trim()
  if (stk && nh) return `${stk} — ${nh}`
  return stk || nh || tk.id
}

function chonLyDoBanDau(initial: ChuyenTienBangRecord | null): string {
  const opts = loaiThuChiChuyenTienLyDoOptions([])
  const raw = (initial?.ly_do_chuyen ?? '').trim()
  if (raw && opts.includes(raw)) return raw
  return opts[0] ?? LY_DO_CHUYEN_RUT_TIEN_MAT
}

export type ChuyenTienFormMode = 'add' | 'edit' | 'view'

export interface ChuyenTienFormProps {
  mode: ChuyenTienFormMode
  initial: ChuyenTienBangRecord | null
  onClose: () => void
  onSaved: () => void
  onHeaderMouseDown?: (e: React.MouseEvent) => void
  headerDragStyle?: React.CSSProperties
}

export function ChuyenTienForm({
  mode,
  initial,
  onClose,
  onSaved,
  onHeaderMouseDown,
  headerDragStyle,
}: ChuyenTienFormProps) {
  const toast = useToastOptional()
  const readOnly =
    mode === 'view' ||
    Boolean(initial?.phieu_thu_tu_chuyen_id && daGhiSoPhieuThu(initial.phieu_thu_tu_chuyen_id))

  const [soPhieu, setSoPhieu] = useState(() =>
    mode === 'add' ? chuyenTienBangSoTiepTheo() : (initial?.so_chuyen_tien_bang ?? ''),
  )
  const [ngayChuyen, setNgayChuyen] = useState(() => {
    const n = (initial?.ngay_chuyen ?? '').trim()
    if (n) return n
    return toIsoDate(new Date())
  })
  const [lyDo, setLyDo] = useState(() => chonLyDoBanDau(initial))
  const [tkNguonId, setTkNguonId] = useState(() => (initial?.tk_nguon_id ?? '').trim())
  const [tkDenId, setTkDenId] = useState(() => (initial?.tk_den_id ?? '').trim())
  const [soTienStr, setSoTienStr] = useState(() => formatSoTien(String(Math.round(initial?.so_tien ?? 0))))
  const [attachments, setAttachments] = useState<ChuyenTienBangAttachmentItem[] | undefined>(
    initial?.attachments ? [...initial.attachments] : undefined,
  )
  const [dinhKemOpen, setDinhKemOpen] = useState(false)
  const anchorDinhKemRef = useRef<HTMLButtonElement>(null)
  const [dropdownEmail, setDropdownEmail] = useState(false)
  const emailSubmenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refEmail = useRef<HTMLDivElement>(null)

  const [loi, setLoi] = useState<string | null>(null)
  const [dangLuu, setDangLuu] = useState(false)
  const refTkNguon = useRef<HTMLSelectElement>(null)
  const refTkDen = useRef<HTMLSelectElement>(null)
  const refLyDo = useRef<HTMLSelectElement>(null)
  const refSoTien = useRef<HTMLInputElement>(null)

  const { data: loaiThuChiQueryData } = useQuery({
    queryKey: loaiThuChiQueryKey,
    queryFn: loaiThuChiQueryFn,
  })
  const loaiThuChiRows = loaiThuChiQueryData?.rows ?? []

  const lyDoChuyenOptions = useMemo(
    () => loaiThuChiChuyenTienLyDoOptions(loaiThuChiRows),
    [loaiThuChiRows],
  )

  useEffect(() => {
    if (readOnly) return
    if (lyDoChuyenOptions.length === 0) return
    if (!lyDoChuyenOptions.includes(lyDo)) {
      setLyDo(lyDoChuyenOptions[0] ?? LY_DO_CHUYEN_RUT_TIEN_MAT)
    }
  }, [readOnly, lyDoChuyenOptions, lyDo])

  const { tkNguonOptions, tkDenOptions } = useMemo(() => {
    const tkAll = taiKhoanGetAll()
    const rut = lyDo === LY_DO_CHUYEN_RUT_TIEN_MAT
    const nguon = tkAll.filter((tk) => {
      if (tk.id === tkDenId) return false
      if (rut) return taiKhoanLaTkNganHang(tk)
      return taiKhoanLaTienMat(tk)
    })
    const den = tkAll.filter((tk) => {
      if (tk.id === tkNguonId) return false
      if (rut) return taiKhoanLaTienMat(tk)
      return taiKhoanLaTkNganHang(tk)
    })
    return { tkNguonOptions: nguon, tkDenOptions: den }
  }, [lyDo, tkNguonId, tkDenId])

  useEffect(() => {
    if (readOnly) return
    if (tkNguonId && !tkNguonOptions.some((t) => t.id === tkNguonId)) setTkNguonId('')
    if (tkDenId && !tkDenOptions.some((t) => t.id === tkDenId)) setTkDenId('')
  }, [readOnly, lyDo, tkNguonOptions, tkDenOptions, tkNguonId, tkDenId])

  useEffect(() => {
    if (mode !== 'add') return
    setSoPhieu(chuyenTienBangSoTiepTheo())
  }, [mode])

  const toolbarBtnCol: React.CSSProperties = {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    padding: '6px 10px',
    fontSize: 10,
    lineHeight: 1.15,
    textAlign: 'center',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 4,
    cursor: readOnly ? 'default' : 'pointer',
    fontFamily: 'inherit',
    color: 'var(--text-primary)',
    minWidth: 72,
  }

  const labelStyle: React.CSSProperties = {
    minWidth: 118,
    width: 118,
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    paddingTop: 5,
    textAlign: 'left',
  }
  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: '4px 8px',
    fontSize: 11,
    border: '1px solid var(--border)',
    borderRadius: 4,
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
  }

  const validate = useCallback((): boolean => {
    setLoi(null)
    if (!ngayChuyen.trim()) {
      setLoi('Chọn ngày chuyển tiền.')
      return false
    }
    if (!lyDo.trim()) {
      setLoi('Chọn lý do chuyển tiền.')
      setTimeout(() => htqlFocusAndScrollIntoView(refLyDo.current), 0)
      return false
    }
    if (!tkNguonId.trim() || !tkDenId.trim()) {
      setLoi('Chọn đủ tài khoản nguồn và tài khoản đến.')
      setTimeout(() => {
        if (!tkNguonId.trim()) htqlFocusAndScrollIntoView(refTkNguon.current)
        else htqlFocusAndScrollIntoView(refTkDen.current)
      }, 0)
      return false
    }
    if (tkNguonId.trim() === tkDenId.trim()) {
      setLoi('Tài khoản nguồn và đích phải khác nhau.')
      setTimeout(() => htqlFocusAndScrollIntoView(refTkDen.current), 0)
      return false
    }
    const dsTk = taiKhoanGetAll()
    const nguon = dsTk.find((t) => t.id === tkNguonId)
    const den = dsTk.find((t) => t.id === tkDenId)
    if (!nguon || !den) {
      setLoi('Không tìm thấy tài khoản đã chọn.')
      return false
    }
    if (!hopLeCapTkChuyenTien(lyDo, nguon, den)) {
      setLoi('Cặp tài khoản không khớp lý do chuyển (NH ↔ tiền mặt).')
      return false
    }
    const t = Math.round(parseFloatVN(soTienStr))
    if (!Number.isFinite(t) || t <= 0) {
      setLoi('Số tiền chuyển phải lớn hơn 0.')
      setTimeout(() => htqlFocusAndScrollIntoView(refSoTien.current), 0)
      return false
    }
    const du = nguon.so_du_hien_tai
    if (du !== undefined && Number.isFinite(du) && t > Math.round(du)) {
      setLoi('Số tiền chuyển không được lớn hơn số dư tài khoản nguồn.')
      setTimeout(() => htqlFocusAndScrollIntoView(refSoTien.current), 0)
      return false
    }
    return true
  }, [ngayChuyen, lyDo, tkNguonId, tkDenId, soTienStr])

  const handleLuu = async () => {
    if (readOnly) return
    if (!validate()) return
    setDangLuu(true)
    try {
      const soTien = Math.round(parseFloatVN(soTienStr))
      const payload = {
        tinh_trang: initial?.tinh_trang ?? 'Chưa thực hiện',
        so_chuyen_tien_bang: soPhieu.trim(),
        ngay_chuyen: ngayChuyen.trim(),
        ly_do_chuyen: lyDo.trim(),
        tk_nguon_id: tkNguonId.trim(),
        tk_den_id: tkDenId.trim(),
        so_tien: soTien,
        attachments,
        phieu_thu_tu_chuyen_id: initial?.phieu_thu_tu_chuyen_id,
        phieu_chi_tu_chuyen_id: initial?.phieu_chi_tu_chuyen_id,
      }
      if (mode === 'add') {
        await chuyenTienBangPost(payload)
        toast?.showToast('Đã lưu phiếu chuyển tiền.', 'success')
      } else if (initial?.id) {
        chuyenTienBangPut(initial.id, payload)
        toast?.showToast('Đã cập nhật phiếu chuyển tiền.', 'success')
      }
      onSaved()
      onClose()
    } finally {
      setDangLuu(false)
    }
  }

  return (
    <>
      <div
        className={ChiTienStyles.modalHeader}
        onMouseDown={onHeaderMouseDown}
        style={{ ...headerDragStyle, cursor: onHeaderMouseDown ? 'grab' : undefined }}
      >
        <span className={ChiTienStyles.modalTitle}>
          Phiếu chuyển tiền
          {readOnly ? ' — Xem' : mode === 'edit' ? ' — Sửa' : ''}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <button
          type="button"
          ref={anchorDinhKemRef}
          style={toolbarBtnCol}
          disabled={readOnly}
          onClick={() => !readOnly && setDinhKemOpen(true)}
        >
          <Paperclip size={16} strokeWidth={1.75} />
          <span>Đính kèm chứng từ</span>
        </button>
        <button type="button" style={toolbarBtnCol} onClick={() => toast?.showToast('Chức năng in đang phát triển.', 'info')}>
          <Printer size={16} strokeWidth={1.75} />
          <span>In</span>
        </button>
        <div
          ref={refEmail}
          style={{ position: 'relative' }}
          onMouseEnter={() => {
            if (emailSubmenuTimeoutRef.current) {
              clearTimeout(emailSubmenuTimeoutRef.current)
              emailSubmenuTimeoutRef.current = null
            }
            emailSubmenuTimeoutRef.current = setTimeout(() => setDropdownEmail(true), SUBMENU_HOVER_DELAY_MS)
          }}
          onMouseLeave={() => {
            if (emailSubmenuTimeoutRef.current) {
              clearTimeout(emailSubmenuTimeoutRef.current)
              emailSubmenuTimeoutRef.current = null
            }
            setDropdownEmail(false)
          }}
        >
          <button type="button" style={toolbarBtnCol}>
            <Mail size={16} strokeWidth={1.75} />
            <span>
              Gửi email,
              <br />
              Zalo <ChevronDown size={10} style={{ verticalAlign: 'middle' }} />
            </span>
          </button>
          {dropdownEmail && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 0,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 4100,
                minWidth: 120,
              }}
            >
              <button
                type="button"
                style={{ ...toolbarBtnCol, width: '100%', flexDirection: 'row', justifyContent: 'flex-start', border: 'none', minWidth: 0 }}
                onClick={() => {
                  toast?.showToast('Gửi email đang phát triển.', 'info')
                  setDropdownEmail(false)
                }}
              >
                Email
              </button>
              <button
                type="button"
                style={{ ...toolbarBtnCol, width: '100%', flexDirection: 'row', justifyContent: 'flex-start', border: 'none', minWidth: 0 }}
                onClick={() => {
                  toast?.showToast('Gửi Zalo đang phát triển.', 'info')
                  setDropdownEmail(false)
                }}
              >
                Zalo
              </button>
            </div>
          )}
        </div>
        <button type="button" style={{ ...toolbarBtnCol, marginLeft: 'auto', color: 'var(--accent)' }} onClick={onClose} disabled={dangLuu}>
          <Power size={16} strokeWidth={1.75} />
          <span>Đóng</span>
        </button>
      </div>
      {loi && (
        <div
          style={{
            padding: '6px 12px',
            fontSize: 11,
            color: 'var(--accent)',
            background: 'rgba(255, 87, 34, 0.08)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {loi}
        </div>
      )}
      <div style={{ padding: '10px 14px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, width: '100%', minWidth: 0, flexWrap: 'wrap' }}>
          <label style={{ ...labelStyle, paddingTop: 0, alignSelf: 'center' }}>Mã phiếu</label>
          <input
            style={{ ...inputStyle, flex: '1 1 140px', maxWidth: 200, opacity: readOnly ? 0.85 : 1 }}
            value={soPhieu}
            readOnly
            disabled
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, width: '100%', minWidth: 0, flexWrap: 'wrap' }}>
          <label style={{ ...labelStyle, paddingTop: 0, alignSelf: 'center' }}>Ngày chuyển tiền</label>
          <div style={{ flex: '0 1 200px', minWidth: 160 }}>
            <DatePicker
              {...htqlDatePickerPopperTop}
              selected={isoToDate(ngayChuyen)}
              onChange={(d: Date | null) => setNgayChuyen(toIsoDate(d))}
              dateFormat="dd/MM/yyyy"
              locale="vi"
              shouldCloseOnSelect
              calendarClassName="htql-datepicker-ngay"
              renderCustomHeader={(p) => <DatePickerCustomHeader {...p} />}
              disabled={readOnly}
              customInput={
                <DatePickerReadOnlyTriggerInput
                  style={{ ...inputStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', width: '100%' }}
                />
              }
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, width: '100%', minWidth: 0 }}>
          <label style={labelStyle}>Lý do chuyển tiền</label>
          <select
            ref={refLyDo}
            style={{ ...inputStyle, height: LOOKUP_CONTROL_HEIGHT }}
            value={lyDo}
            onChange={(e) => setLyDo(e.target.value)}
            disabled={readOnly}
          >
            {lyDoChuyenOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, width: '100%', minWidth: 0 }}>
          <label style={labelStyle}>Tài khoản nguồn</label>
          <select
            ref={refTkNguon}
            style={{ ...inputStyle, height: LOOKUP_CONTROL_HEIGHT }}
            value={tkNguonId}
            onChange={(e) => setTkNguonId(e.target.value)}
            disabled={readOnly}
          >
            <option value="">— Chọn TK —</option>
            {tkNguonOptions.map((tk) => (
              <option key={tk.id} value={tk.id}>
                {tkLabel(tk)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, width: '100%', minWidth: 0 }}>
          <label style={labelStyle}>Tài khoản đến</label>
          <select
            ref={refTkDen}
            style={{ ...inputStyle, height: LOOKUP_CONTROL_HEIGHT }}
            value={tkDenId}
            onChange={(e) => setTkDenId(e.target.value)}
            disabled={readOnly}
          >
            <option value="">— Chọn TK —</option>
            {tkDenOptions.map((tk) => (
              <option key={tk.id} value={tk.id}>
                {tkLabel(tk)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, width: '100%', minWidth: 0 }}>
          <label style={labelStyle}>Số tiền chuyển</label>
          <input
            ref={refSoTien}
            style={{
              ...inputStyle,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
            value={soTienStr}
            onChange={(e) => setSoTienStr(formatSoTien(e.target.value))}
            readOnly={readOnly}
            disabled={readOnly}
            inputMode="decimal"
            lang="vi"
          />
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 6,
          padding: '8px 12px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-tab)',
        }}
      >
        <button type="button" style={formFooterButtonCancel} onClick={onClose} disabled={dangLuu}>
          Hủy bỏ
        </button>
        {!readOnly && (
          <button type="button" style={formFooterButtonSave} onClick={() => void handleLuu()} disabled={dangLuu}>
            Lưu
          </button>
        )}
      </div>

      <ChiTienBangDinhKemModal
        open={dinhKemOpen}
        onClose={() => setDinhKemOpen(false)}
        anchorRef={anchorDinhKemRef}
        attachments={(attachments ?? []) as import('../../../types/chiTienBang').ChiTienBangAttachmentItem[]}
        onChange={(next) => setAttachments(next as ChuyenTienBangAttachmentItem[])}
        readOnly={readOnly}
        soChiTienBang={soPhieu.trim() || 'CT'}
        maKhPathPart={partMccForPath('noi_bo')}
        ngayGiaoHang={null}
        ngayChiTienBang={isoToDate(ngayChuyen)}
      />
    </>
  )
}
