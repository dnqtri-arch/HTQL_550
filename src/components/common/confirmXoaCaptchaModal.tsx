import { useEffect, useState, useCallback, type CSSProperties, type ReactNode } from 'react'
import { Modal } from './modal'
import { ShieldAlert } from 'lucide-react'

const btnSecondary: CSSProperties = {
  padding: '8px 14px',
  fontSize: 12,
  borderRadius: 6,
  cursor: 'pointer',
  border: '1px solid var(--border-strong)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontWeight: 500,
}
const btnDanger: CSSProperties = {
  padding: '8px 14px',
  fontSize: 12,
  borderRadius: 6,
  cursor: 'pointer',
  border: '1px solid #b91c1c',
  background: 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)',
  color: '#fff',
  fontWeight: 600,
  boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
}

/** Hai số nguyên dương nhỏ — tổng tối đa 18 (rule htql550 §3.2). */
function taoPhepTinhNgauNhien(): { a: number; b: number; ketQuaDung: number } {
  const a = 2 + Math.floor(Math.random() * 8)
  const b = 2 + Math.floor(Math.random() * 8)
  return { a, b, ketQuaDung: a + b }
}

export type ConfirmXoaCaptchaModalProps = {
  open: boolean
  title?: string
  message: ReactNode
  onClose: () => void
  onConfirm: () => void
  cancelLabel?: string
  confirmLabel?: string
}

/**
 * Modal xóa — nhập đúng **tổng** hai số (phép cộng) trước khi xác nhận (rule htql550 §3.2).
 * Giao diện gọn: thẻ xác minh, ô nhập số, nút làm mới câu hỏi.
 */
export function ConfirmXoaCaptchaModal({
  open,
  title = 'Xác nhận xóa',
  message,
  onClose,
  onConfirm,
  cancelLabel = 'Hủy bỏ',
  confirmLabel = 'Đồng ý xóa',
}: ConfirmXoaCaptchaModalProps) {
  const [phepTinh, setPhepTinh] = useState(() => taoPhepTinhNgauNhien())
  const [nhap, setNhap] = useState('')
  const [loi, setLoi] = useState<string | null>(null)

  const lamMoiCauHoi = useCallback(() => {
    setPhepTinh(taoPhepTinhNgauNhien())
    setNhap('')
    setLoi(null)
  }, [])

  useEffect(() => {
    if (!open) {
      setNhap('')
      setLoi(null)
      return
    }
    lamMoiCauHoi()
  }, [open, lamMoiCauHoi])

  const handleConfirm = useCallback(() => {
    const n = parseInt(nhap.trim(), 10)
    if (Number.isNaN(n) || n !== phepTinh.ketQuaDung) {
      setLoi('Kết quả không đúng. Nhập đúng tổng hai số hoặc bấm «Làm mới câu hỏi».')
      return
    }
    setLoi(null)
    onConfirm()
  }, [nhap, phepTinh.ketQuaDung, onConfirm])

  const { a, b } = phepTinh

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" style={btnSecondary} onClick={onClose}>
            {cancelLabel}
          </button>
          <button type="button" style={btnDanger} onClick={handleConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text-primary)' }}>
        {message}
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 8,
            border: '1px solid var(--border-strong)',
            background: 'linear-gradient(145deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <ShieldAlert size={16} style={{ color: 'var(--accent-text)', flexShrink: 0 }} aria-hidden />
            <span style={{ fontWeight: 600, fontSize: 11, letterSpacing: '0.02em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Xác minh trước khi xóa
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 20,
                letterSpacing: '0.08em',
                fontWeight: 800,
                padding: '12px 16px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 8,
                textAlign: 'center',
                userSelect: 'none',
                minWidth: 148,
                color: 'var(--text-primary)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
              aria-hidden
            >
              {a} + {b} = ?
            </div>
            <button type="button" style={{ ...btnSecondary, fontSize: 11, padding: '6px 10px' }} onClick={lamMoiCauHoi} title="Tạo phép tính mới">
              Làm mới câu hỏi
            </button>
          </div>
          <label style={{ display: 'block', marginTop: 12, fontWeight: 600, fontSize: 11, color: 'var(--text-muted)' }}>
            Nhập kết quả (tổng)
          </label>
          <input
            type="text"
            lang="en"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={3}
            value={nhap}
            onChange={(e) => {
              setNhap(e.target.value.replace(/\D/g, '').slice(0, 3))
              setLoi(null)
            }}
            placeholder="VD: 12"
            aria-label="Kết quả phép cộng"
            style={{
              marginTop: 6,
              width: '100%',
              maxWidth: 140,
              boxSizing: 'border-box',
              padding: '10px 12px',
              fontSize: 16,
              border: '1px solid var(--border-strong)',
              borderRadius: 6,
              fontVariantNumeric: 'tabular-nums',
              background: 'var(--bg-primary)',
            }}
          />
          {loi && (
            <div role="alert" style={{ marginTop: 10, color: '#dc2626', fontSize: 11, lineHeight: 1.4 }}>
              {loi}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
