import React, { useEffect, useRef, useState } from 'react'
import { DonHangMuaForm } from '../../crm/muaHang/donHangMua/donHangMuaForm'
import type { DonHangMuaRecord, DonHangMuaChiTiet } from '../../crm/muaHang/donHangMua/donHangMuaApi'
import { DonHangMuaApiProvider, type DonHangMuaApi } from '../../crm/muaHang/donHangMua/donHangMuaApiContext'
import { useNhanVatTuHangHoaApi } from './nhanVatTuHangHoaApiContext'
import type { NhanVatTuHangHoaRecord } from './nhanVatTuHangHoaApi'
import type { NhanVatTuHangHoaPrefillPayload } from './nhanVatTuHangHoaPrefill'
import styles from './NhanVatTuHangHoa.module.css'

/**
 * Modal form = `DonHangMuaForm` với `phieuNhanTuDonHangMua` + `doiChieuSource="don_mua_hang"`.
 * Canh lề cột/ô (số·ngày·giờ phải, chữ trái), datepicker, nhãn khối chứng từ: **canh-le.mdc**, **o-nhap.mdc**; triển khai trong `DonHangMuaForm.tsx`. Vùng giá trị khối Chứng từ/HĐ phiếu: **160px** (ô+chevron+gap+nút +) — `NVTHH_DON_HANG_BOX_VALUE_BAND_PX`.
 */
type NhanVatTuHangHoaFormModalProps = {
  open: boolean
  viewDon: NhanVatTuHangHoaRecord | null
  addFormKey: number
  formPrefillTuDhm: NhanVatTuHangHoaPrefillPayload | null
  getChiTiet: (donId: string) => DonHangMuaChiTiet[]
  onClose: () => void
  onSaved: () => void
  onSavedAndView: (don: DonHangMuaRecord) => void
  /** Chế độ xem từ popup ĐHM / danh sách: không hiện nút Sửa, không cho chỉnh. */
  chiXemKhongSua?: boolean
  /** z-index overlay (vd. nổi trên modal ĐHM). */
  overlayZIndex?: number
}

export function NhanVatTuHangHoaFormModal({
  open,
  viewDon,
  addFormKey,
  formPrefillTuDhm,
  getChiTiet,
  onClose,
  onSaved,
  onSavedAndView,
  chiXemKhongSua = false,
  overlayZIndex,
}: NhanVatTuHangHoaFormModalProps) {
  const nvthhApi = useNhanVatTuHangHoaApi()
  const modalBoxRef = useRef<HTMLDivElement>(null)
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null)
  const [dragStart, setDragStart] = useState<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null)
  const [formMinimized, setFormMinimized] = useState(false)
  const [formMaximized, setFormMaximized] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      setModalPosition(null)
      setFormMinimized(false)
      setFormMaximized(false)
    }
  }, [open])

  useEffect(() => {
    if (!dragStart) return
    const onMove = (e: MouseEvent) => {
      setModalPosition({
        x: dragStart.startX + (e.clientX - dragStart.clientX),
        y: dragStart.startY + (e.clientY - dragStart.clientY),
      })
    }
    const onUp = () => setDragStart(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragStart])

  const handleHeaderPointerDown = (e: React.MouseEvent) => {
    if (!modalBoxRef.current) return
    const rect = modalBoxRef.current.getBoundingClientRect()
    setModalPosition({ x: rect.left, y: rect.top })
    setDragStart({ clientX: e.clientX, clientY: e.clientY, startX: rect.left, startY: rect.top })
  }

  if (!open) return null

  return (
    <div className={styles.modalOverlay} style={overlayZIndex != null ? { zIndex: overlayZIndex } : undefined}>
      <div
        ref={modalBoxRef}
        className={styles.modalBox}
        style={{
          ...(formMaximized ? { width: '100vw', maxWidth: '100vw', height: '100vh', maxHeight: '100vh', borderRadius: 0 } : {}),
          ...(formMinimized ? { height: 'auto', maxHeight: 40, minHeight: 40 } : {}),
          ...(modalPosition != null ? { position: 'fixed' as const, left: modalPosition.x, top: modalPosition.y } : {}),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <DonHangMuaApiProvider api={nvthhApi as unknown as DonHangMuaApi}>
          <div className={styles.nvthhDonHangMuaEmbed}>
            <DonHangMuaForm
              key={viewDon ? viewDon.id : `add-${addFormKey}`}
              onClose={onClose}
              onSaved={onSaved}
              onSavedAndView={onSavedAndView}
              onHeaderPointerDown={handleHeaderPointerDown}
              dragging={dragStart != null}
              readOnly={viewDon != null}
              initialDon={viewDon != null ? (viewDon as DonHangMuaRecord) : undefined}
              initialChiTiet={viewDon ? getChiTiet(viewDon.id) : undefined}
              prefillDon={viewDon == null ? formPrefillTuDhm?.don : undefined}
              prefillChiTiet={viewDon == null ? formPrefillTuDhm?.chiTiet : undefined}
              formTitle={formPrefillTuDhm ? '' : 'Nhận vật tư hàng hóa'}
              doiChieuSource="don_mua_hang"
              phieuNhanTuDonHangMua
              phieuNhanThemMoiTuDanhSach={viewDon == null && formPrefillTuDhm == null}
              onMinimize={() => setFormMinimized((v) => !v)}
              onMaximize={() => setFormMaximized((v) => !v)}
              viewOnlyLocked={chiXemKhongSua && viewDon != null}
            />
          </div>
        </DonHangMuaApiProvider>
      </div>
    </div>
  )
}
