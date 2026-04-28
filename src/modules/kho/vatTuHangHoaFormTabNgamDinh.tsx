import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { UseFormRegister, Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Ban, ChevronDown } from 'lucide-react'
import ReactDOM from 'react-dom'
import { formatSoTien, isZeroDisplay } from '../../utils/numberFormat'
import type { FormValues } from './vatTuHangHoaForm'
import { buildThueVatSelectOptions, readVthhThueVatCustomFromStorage, thueVatTokenDisplayLabel } from './vthhLoaiNhomSync'
import { thueGtgtStdToken } from '../../utils/thueGtgtTokens'

/** Dùng chung trong form VTHH: ô nhãn trong grid */
export function LabelCell({ label, required }: { label: string; required?: boolean }) {
  return (
    <div className="misa-label misa-grid-item">
      {label}
      {required && <span className="misa-required"> *</span>}
    </div>
  )
}

/** Bọc input + nút lookup (chấm vàng) */
export function InputWithLookup({
  children,
  onLookup,
  className,
}: {
  children: React.ReactNode
  onLookup?: () => void
  className?: string
}) {
  return (
    <div className={className ? `misa-input-wrap ${className}` : 'misa-input-wrap'}>
      {children}
      <button type="button" onClick={onLookup ?? (() => {})} className="misa-lookup-btn" title="Chọn từ danh mục">
        ...
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  height: 24,
  lineHeight: '22px',
  padding: '0 4px',
  fontSize: 11,
  fontFamily: "'Tahoma', Arial, sans-serif",
  background: 'var(--bg-tab)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  paddingRight: 20,
}

const VARIANT_CONTROL_HEIGHT = 22

export interface TabNgamDinhProps {
  control: Control<FormValues>
  register: UseFormRegister<FormValues>
  watch: (name: keyof FormValues) => unknown
  onOpenKhoLookup: () => void
  onOpenThemKho: () => void
  khoNgamDinhRef: React.RefObject<HTMLDivElement>
  openVariantDropdown: 'dinh-luong' | 'kho-giay' | 'he-mau' | null
  selectedDinhLuong: string[]
  selectedKhoGiay: string[]
  selectedHeMau: string[]
  dinhLuongOptions: string[]
  khoGiayOptions: string[]
  heMauOptions: string[]
  onToggleVariantDropdown: (kind: 'dinh-luong' | 'kho-giay' | 'he-mau') => void
  onToggleVariantValue: (field: 'dinh_luong' | 'kho_giay' | 'he_mau', value: string) => void
  isVariantOptionDisabled?: (kind: 'dinh-luong' | 'kho-giay' | 'he-mau', value: string) => boolean
}

function renderThueGtgtSelect(
  register: UseFormRegister<FormValues>,
  thueSuatOptions: Array<{ value: string; label: string }>
) {
  return (
    <div
      className="misa-input-wrap htql-thue-gtgt-no-border"
      style={{ flex: 1, minWidth: 0, position: 'relative', cursor: 'pointer' }}
    >
      <select
        {...register('thue_suat_gtgt_dau_ra')}
        className="misa-input-solo"
        style={{ ...selectStyle, width: '100%', paddingRight: 26, cursor: 'pointer', border: 'none' }}
      >
        {thueSuatOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
        <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
      </span>
    </div>
  )
}

/** Task 6: Phím tắt Enter — nhảy focus sang ô nhập kế tiếp */
function handleEnterNav(e: React.KeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'Enter') return
  const inputs = Array.from(
    (e.currentTarget as HTMLDivElement).querySelectorAll<HTMLElement>(
      'input:not([readonly]):not([type="checkbox"]), select:not([disabled])'
    )
  )
  const idx = inputs.indexOf(e.target as HTMLElement)
  if (idx >= 0 && idx < inputs.length - 1) {
    e.preventDefault()
    inputs[idx + 1].focus()
  }
}

/** Nội dung tab 1 - Ngầm định — 4 cột (Label-Left | Input-Left | Label-Right | Input-Right) */
export function VatTuHangHoaFormTabNgamDinh({
  control,
  register,
  watch,
  onOpenKhoLookup,
  onOpenThemKho,
  khoNgamDinhRef,
  openVariantDropdown,
  selectedDinhLuong,
  selectedKhoGiay,
  selectedHeMau,
  dinhLuongOptions,
  khoGiayOptions,
  heMauOptions,
  onToggleVariantDropdown,
  onToggleVariantValue,
  isVariantOptionDisabled,
}: TabNgamDinhProps) {
  const nhieuPhienBan = watch('nhieu_phien_ban') === true
  const dinhLuongBtnRef = useRef<HTMLButtonElement>(null)
  const khoGiayBtnRef = useRef<HTMLButtonElement>(null)
  const heMauBtnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null)
  const activeBtnRef = openVariantDropdown === 'dinh-luong' ? dinhLuongBtnRef : openVariantDropdown === 'kho-giay' ? khoGiayBtnRef : openVariantDropdown === 'he-mau' ? heMauBtnRef : null
  const thueSuatDangChon = String((watch('thue_suat_gtgt_dau_ra') as string | undefined) ?? '').trim()
  const thueSuatOptions = buildThueVatSelectOptions()
  if (thueSuatDangChon && !thueSuatOptions.some((o) => o.value === thueSuatDangChon)) {
    const customs = readVthhThueVatCustomFromStorage()
    const tok = thueGtgtStdToken(thueSuatDangChon) || thueSuatDangChon
    thueSuatOptions.push({
      value: thueSuatDangChon,
      label: thueVatTokenDisplayLabel(tok, customs),
    })
  }

  useEffect(() => {
    if (!openVariantDropdown || !activeBtnRef?.current) {
      setPanelStyle(null)
      return
    }
    const rect = activeBtnRef.current.getBoundingClientRect()
    const viewportH = window.innerHeight
    const viewportW = window.innerWidth
    const margin = 8
    const preferredHeight = 220
    const spaceBelow = viewportH - rect.bottom - margin
    const spaceAbove = rect.top - margin
    const openDown = spaceBelow >= 140 || spaceBelow >= spaceAbove
    const maxHeight = Math.max(120, Math.min(preferredHeight, openDown ? spaceBelow : spaceAbove))
    const width = Math.max(rect.width, 260)
    const left = Math.min(Math.max(margin, rect.left), Math.max(margin, viewportW - width - margin))
    const top = openDown ? rect.bottom + 4 : rect.top - maxHeight - 4
    setPanelStyle({
      position: 'fixed',
      left,
      top,
      width,
      maxHeight,
      overflowY: 'auto',
      border: '1px solid var(--border-strong)',
      borderRadius: 4,
      background: 'var(--bg-secondary)',
      zIndex: 5200,
      padding: 6,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    })
  }, [openVariantDropdown, activeBtnRef])

  const activeOptions = useMemo(
    () => (openVariantDropdown === 'dinh-luong' ? dinhLuongOptions : openVariantDropdown === 'kho-giay' ? khoGiayOptions : heMauOptions),
    [openVariantDropdown, dinhLuongOptions, khoGiayOptions, heMauOptions],
  )

  const activeSelected = useMemo(
    () => (openVariantDropdown === 'dinh-luong' ? selectedDinhLuong : openVariantDropdown === 'kho-giay' ? selectedKhoGiay : selectedHeMau),
    [openVariantDropdown, selectedDinhLuong, selectedKhoGiay, selectedHeMau],
  )
  const optionKind = openVariantDropdown
  return (
    <div className="misa-form-grid htql-tab-grid htql-tab-ngam-dinh" onKeyDown={handleEnterNav}>
      {/* Row 1 — Left: Kho | Right: ĐG mua cố định */}
      <LabelCell label="Kho" />
      <div ref={khoNgamDinhRef} className="misa-grid-item" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div
          className="misa-input-wrap htql-kho-ngam-dinh-no-border"
          style={{ flex: 1, minWidth: 0, position: 'relative', cursor: 'pointer' }}
          onClick={onOpenKhoLookup}
        >
          <input
            {...register('kho_ngam_dinh')}
            readOnly
            className="misa-input-solo"
            style={{ ...inputStyle, paddingRight: 26, cursor: 'pointer' }}
            placeholder="Chọn kho..."
          />
          <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
            <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
          </span>
        </div>
        <button
          type="button"
          className="misa-lookup-btn htql-dvt-plus-btn"
          style={{ width: 24, height: 24, minHeight: 24, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
          title="Thêm kho"
          onClick={onOpenThemKho}
        >
          +
        </button>
      </div>
      <LabelCell label={nhieuPhienBan ? 'Mã phiên bản' : 'ĐG mua cố định'} />
      <div className="misa-grid-item htql-don-gia-wrap">
        {nhieuPhienBan ? (
          <input
            {...register('ma_quy_cach_bien_the')}
            readOnly
            tabIndex={-1}
            className="misa-input-solo htql-variant-control"
            style={{
              ...inputStyle,
              width: '100%',
              height: VARIANT_CONTROL_HEIGHT,
              lineHeight: `${Math.max(16, VARIANT_CONTROL_HEIGHT - 2)}px`,
              boxSizing: 'border-box',
              background: 'var(--bg-secondary)',
              cursor: 'default',
            }}
            placeholder="Tự động sinh mã quy cách"
          />
        ) : (
          <InputWithLookup onLookup={() => {}}>
            <Controller
              control={control}
              name="don_gia_mua_co_dinh"
              render={({ field }) => (
                <input
                  {...field}
                  onChange={(e) => field.onChange(formatSoTien(e.target.value))}
                  onFocus={() => { if (isZeroDisplay(String(field.value))) field.onChange('') }}
                  onBlur={field.onBlur}
                  className="misa-input-solo"
                  style={inputStyle}
                  placeholder="0,00"
                />
              )}
            />
          </InputWithLookup>
        )}
      </div>
      <LabelCell label="TK kho" />
      <div className="misa-grid-item" style={{ position: 'relative' }}>
        <input {...register('tai_khoan_kho')} className="misa-input-solo" style={inputStyle} placeholder="152, 156..." />
        <ChevronDown size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
      </div>
      <LabelCell label={nhieuPhienBan ? 'Độ dày/Định lượng' : 'Giá mua gần'} />
      <div className="misa-grid-item htql-don-gia-wrap">
        {nhieuPhienBan ? (
          <div data-vthh-variant-dropdown style={{ position: 'relative', width: '100%', minWidth: 0, display: 'flex' }}>
            <button
              ref={dinhLuongBtnRef}
              type="button"
              className="misa-input-solo htql-variant-control"
              style={{
                ...inputStyle,
                width: '100%',
                minWidth: 0,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                height: VARIANT_CONTROL_HEIGHT,
                lineHeight: `${Math.max(16, VARIANT_CONTROL_HEIGHT - 2)}px`,
                boxSizing: 'border-box',
              }}
              onClick={() => onToggleVariantDropdown('dinh-luong')}
              title="Độ dày/Định lượng (chọn nhiều)"
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedDinhLuong.length > 0 ? selectedDinhLuong.join(', ') : 'Độ dày/Định lượng'}
              </span>
              <ChevronDown size={12} />
            </button>
          </div>
        ) : (
          <InputWithLookup onLookup={() => {}}>
            <Controller
              control={control}
              name="don_gia_mua_gan_nhat"
              render={({ field }) => (
                <input
                  {...field}
                  onChange={(e) => field.onChange(formatSoTien(e.target.value))}
                  onFocus={() => { if (isZeroDisplay(String(field.value))) field.onChange('') }}
                  onBlur={field.onBlur}
                  className="misa-input-solo"
                  style={inputStyle}
                  placeholder="0,00"
                />
              )}
            />
          </InputWithLookup>
        )}
      </div>
      <LabelCell label="TK doanh thu" />
      <div className="misa-grid-item" style={{ position: 'relative' }}>
        <input {...register('tai_khoan_doanh_thu')} className="misa-input-solo" style={inputStyle} placeholder="5111" />
        <ChevronDown size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
      </div>
      <LabelCell label={nhieuPhienBan ? 'Khổ giấy' : 'Thuế GTGT (%)'} />
      <div className={nhieuPhienBan ? 'misa-grid-item htql-don-gia-wrap' : 'misa-grid-item'} style={nhieuPhienBan ? undefined : { position: 'relative' }}>
        {nhieuPhienBan ? (
          <div data-vthh-variant-dropdown style={{ position: 'relative', width: '100%', minWidth: 0, display: 'flex' }}>
            <button
              ref={khoGiayBtnRef}
              type="button"
              className="misa-input-solo htql-variant-control"
              style={{
                ...inputStyle,
                width: '100%',
                minWidth: 0,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                height: VARIANT_CONTROL_HEIGHT,
                lineHeight: `${Math.max(16, VARIANT_CONTROL_HEIGHT - 2)}px`,
                boxSizing: 'border-box',
              }}
              onClick={() => onToggleVariantDropdown('kho-giay')}
              title="Khổ giấy (chọn nhiều)"
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedKhoGiay.length > 0 ? selectedKhoGiay.join(', ') : 'Khổ giấy'}
              </span>
              <ChevronDown size={12} />
            </button>
          </div>
        ) : (
          renderThueGtgtSelect(register, thueSuatOptions)
        )}
      </div>
      {openVariantDropdown && panelStyle && ReactDOM.createPortal(
        <div ref={panelRef} data-vthh-variant-dropdown-panel style={panelStyle}>
          {activeOptions.length === 0 ? (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {openVariantDropdown === 'dinh-luong'
                ? 'Chưa có dữ liệu ở module Độ dày/Định lượng'
                : openVariantDropdown === 'kho-giay'
                  ? 'Chưa có dữ liệu ở module Khổ giấy'
                  : 'Chưa có dữ liệu ở module Hệ màu'}
            </span>
          ) : (
            activeOptions.map((item) => {
              const disabled = Boolean(optionKind && isVariantOptionDisabled?.(optionKind, item))
              return (
              <label
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.45 : 1,
                }}
                title={disabled ? 'Không cho phép chọn' : item}
              >
                <input
                  type="checkbox"
                  checked={activeSelected.includes(item)}
                  disabled={disabled}
                  onChange={() => onToggleVariantValue(openVariantDropdown === 'dinh-luong' ? 'dinh_luong' : openVariantDropdown === 'kho-giay' ? 'kho_giay' : 'he_mau', item)}
                />
                <span>{item}</span>
                {disabled ? <Ban size={12} /> : null}
              </label>
              )
            })
          )}
        </div>,
        document.body
      )}
      <LabelCell label="TK chiết khấu" />
      <div className="misa-grid-item" style={{ position: 'relative' }}>
        <input {...register('tk_chiet_khau')} className="misa-input-solo" style={inputStyle} placeholder="5111" />
        <ChevronDown size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
      </div>
      <LabelCell label={nhieuPhienBan ? 'Hệ màu' : ''} />
      <div className="misa-grid-item htql-don-gia-wrap">
        {nhieuPhienBan ? (
          <div data-vthh-variant-dropdown style={{ position: 'relative', width: '100%', minWidth: 0, display: 'flex' }}>
            <button
              ref={heMauBtnRef}
              type="button"
              className="misa-input-solo htql-variant-control"
              style={{
                ...inputStyle,
                width: '100%',
                minWidth: 0,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                height: VARIANT_CONTROL_HEIGHT,
                lineHeight: `${Math.max(16, VARIANT_CONTROL_HEIGHT - 2)}px`,
                boxSizing: 'border-box',
              }}
              onClick={() => onToggleVariantDropdown('he-mau')}
              title="Hệ màu (chọn nhiều)"
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedHeMau.length > 0 ? selectedHeMau.join(', ') : 'Hệ màu'}
              </span>
              <ChevronDown size={12} />
            </button>
          </div>
        ) : (
          <div />
        )}
      </div>
      {/* Row 5 — Left: TK giảm giá */}
      <LabelCell label="TK giảm giá" />
      <div className="misa-grid-item" style={{ position: 'relative' }}>
        <input {...register('tk_giam_gia')} className="misa-input-solo" style={inputStyle} placeholder="5111" />
        <ChevronDown size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
      </div>
      <LabelCell label={nhieuPhienBan ? 'Thuế GTGT (%)' : ''} />
      <div className="misa-grid-item" style={{ position: 'relative' }}>
        {nhieuPhienBan ? (
          renderThueGtgtSelect(register, thueSuatOptions)
        ) : (
          <div />
        )}
      </div>
      {/* Row 6 — Left: TK chi phí */}
      <LabelCell label="TK chi phí" />
      <div className="misa-grid-item" style={{ position: 'relative' }}>
        <input {...register('tai_khoan_chi_phi')} className="misa-input-solo" style={inputStyle} placeholder="632" />
        <ChevronDown size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
      </div>
      <div className="misa-grid-item" />
      <div className="misa-grid-item" />
    </div>
  )
}
