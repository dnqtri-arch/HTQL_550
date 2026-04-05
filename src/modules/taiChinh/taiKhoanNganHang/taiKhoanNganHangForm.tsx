/**
 * Form thêm/sửa Tài khoản ngân hàng — tách khỏi màn danh sách (cấu trúc gần module báo giá: list + form riêng).
 */
import { useState, useMemo, useRef, useEffect, type Dispatch, type SetStateAction } from 'react'
import { ChevronDown } from 'lucide-react'
import { Modal } from '../../../components/common/modal'
import {
  formFooterButtonCancel,
  formFooterButtonSave,
  formFooterButtonSaveAndAdd,
} from '../../../constants/formFooterButtons'
import type { TaiKhoanNganHangRecord } from '../../../types/taiKhoanNganHang'
import type { BankItem } from '../../crm/shared/banksApi'
import { NGAM_DINH_KHI_OPTIONS } from './taiKhoanNganHangApi'

const LABEL_W = 108

export type TaiKhoanNganHangFormProps = {
  open: boolean
  onClose: () => void
  formMode: 'add' | 'edit'
  form: Omit<TaiKhoanNganHangRecord, 'id'>
  setForm: Dispatch<SetStateAction<Omit<TaiKhoanNganHangRecord, 'id'>>>
  valErr: string
  bankList: BankItem[]
  onLuu: (tiepTuc: boolean) => void
}

export function TaiKhoanNganHangForm({
  open,
  onClose,
  formMode,
  form,
  setForm,
  valErr,
  bankList,
  onLuu,
}: TaiKhoanNganHangFormProps) {
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false)
  const [bankFilter, setBankFilter] = useState('')
  const bankWrapRef = useRef<HTMLDivElement>(null)

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
    if (!open) {
      setBankDropdownOpen(false)
      setBankFilter('')
    }
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formMode === 'add' ? 'Thêm Tài khoản ngân hàng' : 'Sửa Tài khoản ngân hàng'}
      footer={null}
    >
      <div style={{ padding: '12px 16px 0', fontSize: 11, maxWidth: 680 }}>
        {valErr ? (
          <div style={{ color: '#dc2626', marginBottom: 8, fontWeight: 600 }}>{valErr}</div>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: LABEL_W, textAlign: 'left' }}>Thuộc CTY/CN</span>
            <select
              className="misa-input-solo"
              style={{
                flex: 1,
                minWidth: 0,
                border: '1px solid var(--border-strong)',
                borderRadius: 2,
                padding: '2px 6px',
                fontSize: 11,
                height: 24,
              }}
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
                flex: 1,
                minWidth: 0,
                border: `1px solid ${!form.so_tai_khoan.trim() && valErr ? '#dc2626' : 'var(--border-strong)'}`,
                borderRadius: 2,
                padding: '2px 6px',
                fontSize: 11,
              }}
              value={form.so_tai_khoan}
              onChange={(e) => setForm((f) => ({ ...f, so_tai_khoan: e.target.value }))}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ minWidth: LABEL_W, paddingTop: 4, textAlign: 'left' }}>
              Tên ngân hàng <span style={{ color: '#dc2626' }}>*</span>
            </span>
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
                  data-tknh-bank-dropdown
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
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: LABEL_W, textAlign: 'left' }}>Chủ tài khoản</span>
            <input
              type="text"
              className="misa-input-solo"
              style={{ flex: 1, minWidth: 0, border: '1px solid var(--border-strong)', borderRadius: 2, padding: '2px 6px', fontSize: 11 }}
              value={form.chu_tai_khoan}
              onChange={(e) => setForm((f) => ({ ...f, chu_tai_khoan: e.target.value }))}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: LABEL_W, textAlign: 'left' }}>Ngầm định khi</span>
            <select
              className="misa-input-solo"
              style={{
                flex: 1,
                minWidth: 0,
                border: '1px solid var(--border-strong)',
                borderRadius: 2,
                padding: '2px 6px',
                fontSize: 11,
                height: 24,
              }}
              value={form.ngam_dinh_khi}
              onChange={(e) => setForm((f) => ({ ...f, ngam_dinh_khi: e.target.value }))}
            >
              {NGAM_DINH_KHI_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ minWidth: LABEL_W, paddingTop: 4, textAlign: 'left' }}>Diễn giải</span>
            <textarea
              className="misa-input-solo"
              rows={3}
              style={{
                flex: 1,
                minWidth: 0,
                border: '1px solid var(--border-strong)',
                borderRadius: 2,
                padding: '4px 6px',
                fontSize: 11,
                resize: 'vertical',
              }}
              value={form.dien_giai}
              onChange={(e) => setForm((f) => ({ ...f, dien_giai: e.target.value }))}
            />
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '14px 0 16px', borderTop: '1px solid var(--border)', marginTop: 12 }}>
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
