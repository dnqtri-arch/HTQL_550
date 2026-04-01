/**
 * Form thêm/sửa Tài khoản ngân hàng — tách khỏi màn danh sách (cấu trúc gần module báo giá: list + form riêng).
 */
import type { Dispatch, SetStateAction } from 'react'
import { Modal } from '../../../components/common/modal'
import {
  formFooterButtonCancel,
  formFooterButtonSave,
  formFooterButtonSaveAndAdd,
} from '../../../constants/formFooterButtons'
import type { TaiKhoanNganHangRecord } from '../../../types/taiKhoanNganHang'
import type { BankItem } from '../../crm/shared/banksApi'
import { NGAM_DINH_KHI_OPTIONS } from './taiKhoanNganHangApi'

const LABEL_W = 100

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
  const logoHint = (form.ten_ngan_hang || 'NH').trim().slice(0, 2).toUpperCase()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formMode === 'add' ? 'Thêm Tài khoản ngân hàng' : 'Sửa Tài khoản ngân hàng'}
      footer={null}
    >
      <div style={{ padding: '12px 16px 0', fontSize: 11, maxWidth: 720 }}>
        {valErr ? (
          <div style={{ color: '#dc2626', marginBottom: 8, fontWeight: 600 }}>{valErr}</div>
        ) : null}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ minWidth: LABEL_W, textAlign: 'left' }}>
                Ngân hàng <span style={{ color: '#dc2626' }}>*</span>
              </span>
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
                value={form.ten_ngan_hang}
                onChange={(e) => setForm((f) => ({ ...f, ten_ngan_hang: e.target.value }))}
              >
                <option value="">— Chọn —</option>
                {bankList.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ minWidth: LABEL_W, textAlign: 'left' }}>Chi nhánh</span>
              <input
                type="text"
                className="misa-input-solo"
                style={{ flex: 1, minWidth: 0, border: '1px solid var(--border-strong)', borderRadius: 2, padding: '2px 6px', fontSize: 11 }}
                value={form.chi_nhanh}
                onChange={(e) => setForm((f) => ({ ...f, chi_nhanh: e.target.value }))}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ minWidth: LABEL_W, textAlign: 'left' }}>Tỉnh/TP</span>
              <input
                type="text"
                className="misa-input-solo"
                style={{ flex: 1, minWidth: 0, border: '1px solid var(--border-strong)', borderRadius: 2, padding: '2px 6px', fontSize: 11 }}
                value={form.tinh_tp}
                onChange={(e) => setForm((f) => ({ ...f, tinh_tp: e.target.value }))}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ minWidth: LABEL_W, textAlign: 'left' }}>Địa chỉ CN</span>
              <input
                type="text"
                className="misa-input-solo"
                style={{ flex: 1, minWidth: 0, border: '1px solid var(--border-strong)', borderRadius: 2, padding: '2px 6px', fontSize: 11 }}
                value={form.dia_chi_cn}
                onChange={(e) => setForm((f) => ({ ...f, dia_chi_cn: e.target.value }))}
              />
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
          <div
            style={{
              width: 88,
              height: 88,
              flexShrink: 0,
              border: '1px solid var(--border-strong)',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-tab)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-muted)',
            }}
            title="Logo ngân hàng (minh họa)"
          >
            {logoHint}
          </div>
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
