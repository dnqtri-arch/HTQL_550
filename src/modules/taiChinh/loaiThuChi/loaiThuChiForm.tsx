/**
 * Form thêm/sửa — mã, tên, ghi chú; một loại chỉ thu HOẶC chi HOẶC chuyển (YC96).
 */
import type { Dispatch, SetStateAction } from 'react'
import { Modal } from '../../../components/common/modal'
import {
  formFooterButtonCancel,
  formFooterButtonSave,
  formFooterButtonSaveAndAdd,
} from '../../../constants/formFooterButtons'
import type { LoaiThuChiRecord } from '../../../types/loaiThuChi'

const LABEL_W = 108

export type LoaiThuChiFormProps = {
  open: boolean
  onClose: () => void
  formMode: 'add' | 'edit'
  form: Omit<LoaiThuChiRecord, 'id'>
  setForm: Dispatch<SetStateAction<Omit<LoaiThuChiRecord, 'id'>>>
  valErr: string
  onLuu: (tiepTuc: boolean) => void
}

export function LoaiThuChiForm({ open, onClose, formMode, form, setForm, valErr, onLuu }: LoaiThuChiFormProps) {
  const setMotLoai = (loai: 'thu' | 'chi' | 'chuyen') => {
    setForm((f) => ({
      ...f,
      ap_dung_thu: loai === 'thu',
      ap_dung_chi: loai === 'chi',
      ap_dung_chuyen_tien: loai === 'chuyen',
    }))
  }

  const radioName = 'loaiThuChiApDung'

  return (
    <Modal open={open} onClose={onClose} title={formMode === 'add' ? 'Thêm loại thu/chi' : 'Sửa loại thu/chi'} footer={null} size="md">
      <div style={{ padding: '12px 16px 0', fontSize: 11, width: 'min(520px, 92vw)', boxSizing: 'border-box' }}>
        {valErr ? <div style={{ color: '#dc2626', marginBottom: 8, fontWeight: 600 }}>{valErr}</div> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Áp dụng — chọn một:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="radio"
                name={radioName}
                checked={form.ap_dung_chi}
                onChange={() => setMotLoai('chi')}
              />
              <span>Lý do chi</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="radio"
                name={radioName}
                checked={form.ap_dung_thu}
                onChange={() => setMotLoai('thu')}
              />
              <span>Lý do thu</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="radio"
                name={radioName}
                checked={form.ap_dung_chuyen_tien}
                onChange={() => setMotLoai('chuyen')}
              />
              <span>Lý do chuyển tiền</span>
            </label>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: LABEL_W, textAlign: 'left' }}>
              Mã loại <span style={{ color: '#dc2626' }}>*</span>
            </span>
            <input
              type="text"
              className="misa-input-solo"
              style={{
                flex: 1,
                minWidth: 0,
                border: `1px solid ${!form.ma.trim() && valErr ? '#dc2626' : 'var(--border-strong)'}`,
                borderRadius: 2,
                padding: '2px 6px',
                fontSize: 11,
                height: 24,
                textTransform: 'uppercase',
              }}
              value={form.ma}
              onChange={(e) => setForm((f) => ({ ...f, ma: e.target.value.toUpperCase() }))}
              placeholder="Nhập mã (VD: LT1)"
              autoComplete="off"
              spellCheck={false}
              readOnly={formMode === 'edit'}
              disabled={formMode === 'edit'}
              title={formMode === 'edit' ? 'Không đổi mã khi sửa' : undefined}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: LABEL_W, textAlign: 'left' }}>
              Tên lý do <span style={{ color: '#dc2626' }}>*</span>
            </span>
            <input
              type="text"
              className="misa-input-solo"
              style={{
                flex: 1,
                minWidth: 0,
                border: `1px solid ${!form.ten.trim() && valErr ? '#dc2626' : 'var(--border-strong)'}`,
                borderRadius: 2,
                padding: '2px 6px',
                fontSize: 11,
                height: 24,
              }}
              value={form.ten}
              onChange={(e) => setForm((f) => ({ ...f, ten: e.target.value }))}
              placeholder="Nhập nội dung lý do"
              autoComplete="off"
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ minWidth: LABEL_W, textAlign: 'left', paddingTop: 4 }}>Ghi chú</span>
            <textarea
              className="misa-input-solo"
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 52,
                border: '1px solid var(--border-strong)',
                borderRadius: 2,
                padding: '4px 6px',
                fontSize: 11,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
              value={form.ghi_chu ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, ghi_chu: e.target.value }))}
              placeholder="Ghi chú (tùy chọn)"
              rows={2}
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
