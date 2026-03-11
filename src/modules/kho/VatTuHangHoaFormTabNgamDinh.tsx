import React from 'react'
import type { UseFormRegister, Control, FieldErrors } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { ChevronDown } from 'lucide-react'
import { formatSoTien, isZeroDisplay, parseNumber } from '../../utils/numberFormat'
import type { FormValues } from './VatTuHangHoaForm'

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

export const THUE_SUAT_OPTIONS_FORM = [
  { value: 'Chưa xác định', label: 'Chưa xác định' },
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '8', label: '8%' },
  { value: '10', label: '10%' },
  { value: 'Tự nhập', label: 'Tự nhập' },
] as const

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

export interface TabNgamDinhProps {
  control: Control<FormValues>
  register: UseFormRegister<FormValues>
  watch: (name: keyof FormValues) => unknown
  errors: FieldErrors<FormValues>
  onOpenKhoLookup: () => void
  onOpenThemKho: () => void
  khoNgamDinhRef: React.RefObject<HTMLDivElement>
}

/** Nội dung tab 1 - Ngầm định */
export function VatTuHangHoaFormTabNgamDinh({
  control,
  register,
  watch,
  errors,
  onOpenKhoLookup,
  onOpenThemKho,
  khoNgamDinhRef,
}: TabNgamDinhProps) {
  return (
    <div className="misa-form-grid htql-tab-grid htql-tab-ngam-dinh">
      <LabelCell label="Kho ngầm định" />
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
          <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: '#0d0d0d' }}>
            <ChevronDown size={12} style={{ color: '#0d0d0d' }} />
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
      <LabelCell label="ĐG mua cố định" />
      <div className="misa-grid-item htql-don-gia-wrap">
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
      </div>
      <LabelCell label="TK kho" />
      <div className="misa-grid-item" style={{ position: 'relative' }}>
        <input {...register('tai_khoan_kho')} className="misa-input-solo" style={inputStyle} placeholder="152, 156..." />
        <ChevronDown size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
      </div>
      <LabelCell label="ĐG mua gần nhất" />
      <div className="misa-grid-item htql-don-gia-wrap">
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
      </div>
      <LabelCell label="TK doanh thu" />
      <div className="misa-grid-item" style={{ position: 'relative' }}>
        <input {...register('tai_khoan_doanh_thu')} className="misa-input-solo" style={inputStyle} placeholder="5111" />
        <ChevronDown size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
      </div>
      <LabelCell label="ĐG bán" />
      <div className="misa-grid-item htql-don-gia-wrap">
        <InputWithLookup onLookup={() => {}}>
          <Controller
            control={control}
            name="don_gia_ban"
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
      </div>
      <LabelCell label="TK chiết khấu" />
      <div className="misa-grid-item" style={{ position: 'relative' }}>
        <input {...register('tk_chiet_khau')} className="misa-input-solo" style={inputStyle} placeholder="5111" />
        <ChevronDown size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
      </div>
      <LabelCell label="Thuế GTGT (%)" />
      <div className="misa-grid-item" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div
          className="misa-input-wrap htql-thue-gtgt-no-border"
          style={{ flex: 1, minWidth: 0, position: 'relative', cursor: 'pointer' }}
        >
          <select
            {...register('thue_suat_gtgt_dau_ra')}
            className="misa-input-solo"
            style={{ ...selectStyle, width: '100%', paddingRight: 26, cursor: 'pointer', border: 'none' }}
          >
            {THUE_SUAT_OPTIONS_FORM.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: '#0d0d0d' }}>
            <ChevronDown size={12} style={{ color: '#0d0d0d' }} />
          </span>
        </div>
        {watch('thue_suat_gtgt_dau_ra') === 'Tự nhập' && (
          <Controller
            control={control}
            name="thue_suat_gtgt_tu_nhap"
            rules={{
              validate: (v) => {
                if (!v.trim()) return true
                const n = parseFloat(parseNumber(v))
                if (Number.isNaN(n)) return true
                return n >= 0 || 'Phải lớn hơn hoặc bằng 0'
              },
            }}
            render={({ field, fieldState }) => (
              <input
                {...field}
                onChange={(e) => field.onChange(formatSoTien(e.target.value))}
                onFocus={() => { if (isZeroDisplay(String(field.value))) field.onChange('') }}
                onBlur={field.onBlur}
                className="misa-input-solo"
                style={{ ...inputStyle, width: 72, flexShrink: 0, ...(fieldState.error ? { borderColor: 'var(--accent)' } : {}) }}
                placeholder="VD: 7"
              />
            )}
          />
        )}
        {watch('thue_suat_gtgt_dau_ra') === 'Tự nhập' && errors.thue_suat_gtgt_tu_nhap && (
          <span style={{ fontSize: 10, color: 'var(--accent)', flexShrink: 0 }}>{errors.thue_suat_gtgt_tu_nhap.message}</span>
        )}
      </div>
      <LabelCell label="TK giảm giá" />
      <div className="misa-grid-item" style={{ position: 'relative' }}>
        <input {...register('tk_giam_gia')} className="misa-input-solo" style={inputStyle} placeholder="5111" />
        <ChevronDown size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
      </div>
      <div className="misa-grid-item" />
      <div className="misa-grid-item htql-checkbox-cell" style={{ width: 'fit-content', paddingLeft: 0, marginLeft: 0, justifyContent: 'flex-start', minWidth: 0 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" {...register('la_mat_hang_khuyen_mai')} style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-primary)' }}>Là hàng khuyến mại</span>
        </label>
      </div>
      <LabelCell label="TK trả lại" />
      <div className="misa-grid-item" style={{ position: 'relative' }}>
        <input {...register('tk_tra_lai')} className="misa-input-solo" style={inputStyle} placeholder="5111" />
        <ChevronDown size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
      </div>
      <div className="misa-grid-item" />
      <div className="misa-grid-item" />
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
