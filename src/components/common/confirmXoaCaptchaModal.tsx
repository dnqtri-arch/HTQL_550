import { useEffect, useState, useCallback, useRef, type CSSProperties, type ReactNode } from 'react'
import { Modal } from './modal'
import { ShieldCheck } from 'lucide-react'

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
/** Chiều cao thống nhất: ô phép tính + ô nhập tổng (rule htql550 §3.2). */
const CAPTCHA_INPUT_ROW_HEIGHT = 36

const btnDanger: CSSProperties = {
  padding: '8px 14px',
  fontSize: 12,
  borderRadius: 6,
  cursor: 'pointer',
  border: '1px solid #9f1239',
  background: 'linear-gradient(165deg, #f43f5e 0%, #be123c 55%, #9f1239 100%)',
  color: '#fff',
  fontWeight: 600,
  boxShadow: '0 2px 8px rgba(190,18,60,0.35)',
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
 * Mỗi lần mở modal tạo phép tính mới; không có nút làm mới câu hỏi.
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
  const refNhapTong = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) {
      setNhap('')
      setLoi(null)
      return
    }
    setPhepTinh(taoPhepTinhNgauNhien())
    setNhap('')
    setLoi(null)
    const t = window.setTimeout(() => {
      refNhapTong.current?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [open])

  const handleConfirm = useCallback(() => {
    const n = parseInt(nhap.trim(), 10)
    if (Number.isNaN(n) || n !== phepTinh.ketQuaDung) {
      setLoi('Kết quả không đúng. Nhập đúng tổng hai số.')
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
            marginTop: 14,
            padding: 0,
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid rgba(244,63,94,0.35)',
            background: 'linear-gradient(145deg, rgba(244,63,94,0.12) 0%, rgba(59,130,246,0.08) 45%, var(--bg-secondary) 100%)',
            boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: 'linear-gradient(90deg, rgba(244,63,94,0.18), rgba(59,130,246,0.12))',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <ShieldCheck size={18} style={{ color: '#be123c', flexShrink: 0 }} aria-hidden />
            <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.04em', color: '#9f1239', textTransform: 'uppercase' }}>
              Xác minh trước khi xóa
            </span>
          </div>
          <div style={{ padding: '12px 14px 14px' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'stretch',
                gap: 10,
              }}
            >
              <div
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 15,
                  letterSpacing: '0.05em',
                  fontWeight: 800,
                  padding: '0 10px',
                  minHeight: CAPTCHA_INPUT_ROW_HEIGHT,
                  height: CAPTCHA_INPUT_ROW_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 6,
                  textAlign: 'center',
                  userSelect: 'none',
                  minWidth: 108,
                  flex: '0 0 auto',
                  color: 'var(--text-primary)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  boxSizing: 'border-box',
                }}
                aria-hidden
              >
                {a} + {b} = ?
              </div>
              <input
                ref={refNhapTong}
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
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  handleConfirm()
                }}
                placeholder="Tổng"
                aria-label="Kết quả phép cộng (tổng)"
                style={{
                  width: 72,
                  maxWidth: 88,
                  flex: '0 0 auto',
                  boxSizing: 'border-box',
                  padding: '0 8px',
                  minHeight: CAPTCHA_INPUT_ROW_HEIGHT,
                  height: CAPTCHA_INPUT_ROW_HEIGHT,
                  fontSize: 14,
                  lineHeight: 1.2,
                  border: '1px solid var(--border-strong)',
                  borderRadius: 6,
                  fontVariantNumeric: 'tabular-nums',
                  background: 'var(--bg-primary)',
                }}
              />
            </div>
            <span style={{ display: 'block', marginTop: 8, fontWeight: 600, fontSize: 10, color: 'var(--text-muted)' }}>
              Nhập đúng tổng (phép tính bên trái)
            </span>
            {loi && (
              <div role="alert" style={{ marginTop: 10, color: '#dc2626', fontSize: 11, lineHeight: 1.4 }}>
                {loi}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
