/**
 * Form thêm/sửa module Tài khoản — ô tick NH/TM, ngầm định chọn nhiều (YC91).
 */
import { useState, useMemo, useRef, useEffect, type Dispatch, type SetStateAction } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { Modal } from '../../../components/common/modal'
import {
  formFooterButtonCancel,
  formFooterButtonSave,
  formFooterButtonSaveAndAdd,
} from '../../../constants/formFooterButtons'
import type { TaiKhoanRecord } from '../../../types/taiKhoan'
import type { BankItem } from '../../crm/shared/banksApi'
import {
  NGAM_DINH_TAI_KHOAN_OPTIONS,
  decodeNgamDinhKhiList,
  encodeNgamDinhKhiList,
} from '../../../constants/ngamDinhTaiKhoan'
import { formatSoTien, parseFloatVN } from '../../../utils/numberFormat'

const LABEL_W = 108

export type TaiKhoanFormProps = {
  open: boolean
  onClose: () => void
  formMode: 'add' | 'edit'
  form: Omit<TaiKhoanRecord, 'id'>
  setForm: Dispatch<SetStateAction<Omit<TaiKhoanRecord, 'id'>>>
  valErr: string
  bankList: BankItem[]
  onLuu: (tiepTuc: boolean) => void
}

export function TaiKhoanForm({
  open,
  onClose,
  formMode,
  form,
  setForm,
  valErr,
  bankList,
  onLuu,
}: TaiKhoanFormProps) {
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false)
  const [bankFilter, setBankFilter] = useState('')
  const bankWrapRef = useRef<HTMLDivElement>(null)
  const [ngamDropdownOpen, setNgamDropdownOpen] = useState(false)
  const ngamWrapRef = useRef<HTMLDivElement>(null)
  const [ngamPortalRect, setNgamPortalRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const [soDuStr, setSoDuStr] = useState('')

  const laTienMat = Boolean(form.la_tien_mat)

  useEffect(() => {
    if (!open) return
    const v = form.so_du_hien_tai
    if (v !== undefined && Number.isFinite(v)) setSoDuStr(formatSoTien(String(v)))
    else setSoDuStr('')
  }, [open, form.so_du_hien_tai])

  const getDisplayBankName = (name: string) => {
    const b = bankList.find((x) => x.name === name)
    return b ? (b.shortName ? `${b.shortName} - ${b.name}` : b.name) : name
  }

  const banksFiltered = useMemo(() => {
    const kw = bankFilter.trim().toLowerCase()
    if (!kw) return bankList
    return bankList.filter((b) => `${b.name} ${b.shortName ?? ''} ${b.code ?? ''}`.toLowerCase().includes(kw))
  }, [bankList, bankFilter])

  const banksForDropdown = useMemo(
    () => (bankFilter.trim() ? banksFiltered : bankList),
    [bankFilter, banksFiltered, bankList],
  )

  const legacyNgamTokens = useMemo(
    () =>
      decodeNgamDinhKhiList(form.ngam_dinh_khi).filter(
        (t) => !NGAM_DINH_TAI_KHOAN_OPTIONS.includes(t as (typeof NGAM_DINH_TAI_KHOAN_OPTIONS)[number]),
      ),
    [form.ngam_dinh_khi],
  )

  const selectedNgamUnified = useMemo(
    () =>
      decodeNgamDinhKhiList(form.ngam_dinh_khi).filter((t) =>
        NGAM_DINH_TAI_KHOAN_OPTIONS.includes(t as (typeof NGAM_DINH_TAI_KHOAN_OPTIONS)[number]),
      ),
    [form.ngam_dinh_khi],
  )

  function toggleNgamOption(opt: (typeof NGAM_DINH_TAI_KHOAN_OPTIONS)[number]) {
    const set = new Set(selectedNgamUnified)
    if (set.has(opt)) set.delete(opt)
    else set.add(opt)
    const ordered = NGAM_DINH_TAI_KHOAN_OPTIONS.filter((o) => set.has(o))
    const merged = [...legacyNgamTokens, ...ordered]
    setForm((f) => ({ ...f, ngam_dinh_khi: encodeNgamDinhKhiList(merged) }))
  }

  /** YC92: luôn hiển thị đủ tên các dòng đã chọn trên ô trigger (không rút gọn «N mục»). */
  function ngamHienThiTomTat(): string {
    const all = decodeNgamDinhKhiList(form.ngam_dinh_khi)
    if (all.length === 0) return '— Chọn —'
    return all.join(', ')
  }

  useEffect(() => {
    if (!bankDropdownOpen) return
    const onDown = (e: MouseEvent) => {
      if (bankWrapRef.current?.contains(e.target as Node)) return
      setBankDropdownOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [bankDropdownOpen])

  useEffect(() => {
    if (!ngamDropdownOpen) {
      setNgamPortalRect(null)
      return
    }
    const el = ngamWrapRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      setNgamPortalRect({ top: r.bottom + 2, left: r.left, width: r.width })
    }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (ngamWrapRef.current?.contains(t)) return
      const portal = document.querySelector('[data-htql-tk-ngam-portal]')
      if (portal?.contains(t)) return
      setNgamDropdownOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [ngamDropdownOpen])

  useEffect(() => {
    if (!open) {
      setBankDropdownOpen(false)
      setBankFilter('')
      setNgamDropdownOpen(false)
    }
  }, [open])

  const inputBase: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    border: '1px solid var(--border-strong)',
    borderRadius: 2,
    padding: '2px 6px',
    fontSize: 11,
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formMode === 'add' ? 'Thêm Tài khoản' : 'Sửa Tài khoản'}
      footer={null}
      size="lg"
    >
      <div style={{ padding: '12px 16px 0', fontSize: 11, width: 'min(820px, 92vw)', maxWidth: 920, boxSizing: 'border-box' }}>
        {valErr ? (
          <div style={{ color: '#dc2626', marginBottom: 8, fontWeight: 600 }}>{valErr}</div>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(form.la_tai_khoan_ngan_hang)}
                onChange={(e) => setForm((f) => ({ ...f, la_tai_khoan_ngan_hang: e.target.checked }))}
              />
              <span>Tài khoản ngân hàng</span>
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={laTienMat}
                onChange={(e) => setForm((f) => ({ ...f, la_tien_mat: e.target.checked }))}
              />
              <span>Tiền mặt</span>
            </label>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: LABEL_W, textAlign: 'left' }}>Thuộc CTY/CN</span>
            <select
              className="misa-input-solo"
              style={{ ...inputBase, height: 24 }}
              value={form.thuoc_cty_cn}
              onChange={(e) => setForm((f) => ({ ...f, thuoc_cty_cn: e.target.value }))}
            >
              <option value="">—</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: LABEL_W, textAlign: 'left' }}>
              Số tài khoản <span style={{ color: '#dc2626' }}>*</span>
            </span>
            <input
              type="text"
              className="misa-input-solo"
              style={{
                ...inputBase,
                border: `1px solid ${!form.so_tai_khoan.trim() && valErr ? '#dc2626' : 'var(--border-strong)'}`,
              }}
              value={form.so_tai_khoan}
              onChange={(e) => setForm((f) => ({ ...f, so_tai_khoan: e.target.value }))}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: LABEL_W, textAlign: 'left' }}>Số dư đầu kỳ</span>
            <input
              type="text"
              className="misa-input-solo"
              inputMode="decimal"
              lang="vi"
              style={{
                ...inputBase,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
              placeholder="Để trống = không giới hạn chuyển tiền"
              value={soDuStr}
              onChange={(e) => {
                const fs = formatSoTien(e.target.value)
                setSoDuStr(fs)
                const n = parseFloatVN(fs)
                setForm((f) => ({
                  ...f,
                  so_du_hien_tai: fs.trim() === '' || !Number.isFinite(n) ? undefined : Math.round(n),
                }))
              }}
              onBlur={() => {
                const n = parseFloatVN(soDuStr)
                if (!Number.isFinite(n) || soDuStr.trim() === '') {
                  setSoDuStr('')
                  setForm((f) => ({ ...f, so_du_hien_tai: undefined }))
                }
              }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ minWidth: LABEL_W, paddingTop: 4, textAlign: 'left' }}>
              {laTienMat ? (
                <>
                  Tên tài khoản <span style={{ color: '#dc2626' }}>*</span>
                </>
              ) : (
                <>
                  Tên ngân hàng <span style={{ color: '#dc2626' }}>*</span>
                </>
              )}
            </span>
            {!laTienMat ? (
              <div ref={bankWrapRef} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <input
                  type="text"
                  className="misa-input-solo"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 2,
                    padding: '2px 28px 2px 6px',
                    fontSize: 11,
                    height: 24,
                  }}
                  value={bankDropdownOpen ? bankFilter || getDisplayBankName(form.ten_ngan_hang) : getDisplayBankName(form.ten_ngan_hang)}
                  onChange={(e) => {
                    setBankFilter(e.target.value)
                    setBankDropdownOpen(true)
                    setForm((f) => ({ ...f, ten_ngan_hang: e.target.value }))
                  }}
                  onFocus={() => {
                    setBankFilter('')
                    setBankDropdownOpen(true)
                  }}
                  onClick={() => {
                    setBankFilter('')
                    setBankDropdownOpen(true)
                  }}
                  placeholder="Nhập hoặc chọn ngân hàng"
                  autoComplete="off"
                />
                <span
                  style={{
                    position: 'absolute',
                    right: 2,
                    top: 2,
                    bottom: 2,
                    width: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    background: 'var(--accent)',
                    color: 'var(--accent-text)',
                    borderRadius: '0 2px 2px 0',
                  }}
                  aria-hidden
                >
                  <ChevronDown size={12} />
                </span>
                {bankDropdownOpen && (
                  <div
                    data-htql-tk-bank-dropdown
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: '100%',
                      marginTop: 2,
                      maxHeight: 200,
                      overflowY: 'auto',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 4,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 4500,
                    }}
                  >
                    {banksForDropdown.length === 0 ? (
                      <div style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11 }}>Không có kết quả</div>
                    ) : (
                      banksForDropdown.map((b) => (
                        <div
                          key={b.id}
                          role="option"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setForm((f) => ({ ...f, ten_ngan_hang: b.name }))
                            setBankFilter(b.name)
                            setBankDropdownOpen(false)
                          }}
                          style={{
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: 11,
                            background: form.ten_ngan_hang === b.name ? 'var(--accent)' : undefined,
                            color: form.ten_ngan_hang === b.name ? 'var(--accent-text)' : 'var(--text-primary)',
                          }}
                        >
                          {b.shortName ? `${b.shortName} - ${b.name}` : b.name}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <input
                type="text"
                className="misa-input-solo"
                style={inputBase}
                value={form.ten_ngan_hang}
                onChange={(e) => setForm((f) => ({ ...f, ten_ngan_hang: e.target.value }))}
                placeholder="Tên tài khoản / quỹ"
              />
            )}
          </label>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ minWidth: LABEL_W, paddingTop: 4, textAlign: 'left' }}>Ngầm định khi</span>
            <div ref={ngamWrapRef} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              <button
                type="button"
                className="misa-input-solo"
                onClick={() => setNgamDropdownOpen((v) => !v)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  textAlign: 'left',
                  height: 24,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '2px 28px 2px 6px',
                  position: 'relative',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 2,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ngamHienThiTomTat()}</span>
                <span
                  style={{
                    position: 'absolute',
                    right: 2,
                    top: 2,
                    bottom: 2,
                    width: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    background: 'var(--accent)',
                    color: 'var(--accent-text)',
                    borderRadius: '0 2px 2px 0',
                  }}
                  aria-hidden
                >
                  <ChevronDown size={12} />
                </span>
              </button>
              {legacyNgamTokens.length > 0 && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  Giữ từ dữ liệu cũ: {legacyNgamTokens.join(', ')}
                </div>
              )}
              {ngamDropdownOpen &&
                ngamPortalRect &&
                createPortal(
                  <div
                    data-htql-tk-ngam-portal
                    style={{
                      position: 'fixed',
                      top: ngamPortalRect.top,
                      left: ngamPortalRect.left,
                      width: ngamPortalRect.width,
                      maxHeight: 240,
                      overflowY: 'auto',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 4,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 4500,
                      padding: '6px 0',
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {NGAM_DINH_TAI_KHOAN_OPTIONS.map((opt) => (
                      <label
                        key={opt}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontSize: 11,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--row-selected-bg)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedNgamUnified.includes(opt)}
                          onChange={() => toggleNgamOption(opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>,
                  document.body,
                )}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ minWidth: LABEL_W, paddingTop: 4, textAlign: 'left' }}>Diễn giải</span>
            <textarea
              className="misa-input-solo"
              rows={3}
              style={{
                ...inputBase,
                resize: 'vertical',
              }}
              value={form.dien_giai}
              onChange={(e) => setForm((f) => ({ ...f, dien_giai: e.target.value }))}
            />
          </label>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 6,
            padding: '14px 0 16px',
            borderTop: '1px solid var(--border)',
            marginTop: 12,
          }}
        >
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>
            Hủy bỏ
          </button>
          <button type="button" style={formFooterButtonSave} onClick={() => onLuu(false)}>
            Lưu
          </button>
          {formMode === 'add' && (
            <button type="button" style={formFooterButtonSaveAndAdd} onClick={() => onLuu(true)}>
              Lưu và tiếp tục
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
