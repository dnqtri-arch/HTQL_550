/**
 * Tài khoản ngân hàng — danh sách + form thêm/sửa (YC62).
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../components/common/dataGrid'
import { ModulePage } from '../../../components/modulePage'
import { useToastOptional } from '../../../context/toastContext'
import { matchSearchKeyword } from '../../../utils/stringUtils'
import { getBanksVietnam, type BankItem } from '../../crm/shared/banksApi'
import { ConfirmXoaCaptchaModal } from '../../../components/common/confirmXoaCaptchaModal'
import type { TaiKhoanNganHangRecord } from '../../../types/taiKhoanNganHang'
import {
  taiKhoanNganHangGetAll,
  taiKhoanNganHangPost,
  taiKhoanNganHangPut,
  taiKhoanNganHangDelete,
  NGAM_DINH_KHI_OPTIONS,
} from './taiKhoanNganHangApi'
import { TaiKhoanNganHangForm } from './taiKhoanNganHangForm'
import styles from '../../crm/banHang/BanHang.module.css'

const columns: DataGridColumn<TaiKhoanNganHangRecord>[] = [
  { key: 'thuoc_cty_cn', label: 'Thuộc CTY/CN', width: 120 },
  { key: 'so_tai_khoan', label: 'Số tài khoản', width: 140 },
  { key: 'ten_ngan_hang', label: 'Tên ngân hàng', width: '22%' },
  { key: 'chu_tai_khoan', label: 'Chủ tài khoản', width: '14%' },
  { key: 'ngam_dinh_khi', label: 'Ngầm định khi', width: 140 },
]

function emptyForm(): Omit<TaiKhoanNganHangRecord, 'id'> {
  return {
    thuoc_cty_cn: '',
    so_tai_khoan: '',
    ten_ngan_hang: '',
    chu_tai_khoan: '',
    ngam_dinh_khi: NGAM_DINH_KHI_OPTIONS[0],
    dien_giai: '',
  }
}

export function TaiKhoanNganHang() {
  const toast = useToastOptional()
  const [rows, setRows] = useState<TaiKhoanNganHangRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterSo, setFilterSo] = useState('')
  const [filterNh, setFilterNh] = useState('')
  const [filterCty, setFilterCty] = useState('')
  const [filterChu, setFilterChu] = useState('')
  const [filterNd, setFilterNd] = useState('')
  const [bankList, setBankList] = useState<BankItem[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [form, setForm] = useState<Omit<TaiKhoanNganHangRecord, 'id'>>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [valErr, setValErr] = useState('')
  const [xoaRow, setXoaRow] = useState<TaiKhoanNganHangRecord | null>(null)

  const load = useCallback(() => setRows(taiKhoanNganHangGetAll()), [])
  useEffect(() => {
    load()
    getBanksVietnam().then((l) => {
      if (Array.isArray(l) && l.length) setBankList(l)
    })
  }, [load])

  const selected = selectedId ? rows.find((r) => r.id === selectedId) ?? null : null

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterSo.trim() && !matchSearchKeyword(r.so_tai_khoan, filterSo)) return false
      if (filterNh.trim() && !matchSearchKeyword(r.ten_ngan_hang, filterNh)) return false
      if (filterCty.trim() && !matchSearchKeyword(r.thuoc_cty_cn, filterCty)) return false
      if (filterChu.trim() && !matchSearchKeyword(r.chu_tai_khoan, filterChu)) return false
      if (filterNd.trim() && !matchSearchKeyword(r.ngam_dinh_khi, filterNd)) return false
      return true
    })
  }, [rows, filterSo, filterNh, filterCty, filterChu, filterNd])

  const moThem = () => {
    setFormMode('add')
    setForm(emptyForm())
    setEditingId(null)
    setValErr('')
    setFormOpen(true)
  }

  const moSua = () => {
    if (!selected) return
    setFormMode('edit')
    const { id, ...rest } = selected
    setEditingId(id)
    setForm(rest)
    setValErr('')
    setFormOpen(true)
  }

  const validate = (): boolean => {
    if (!form.so_tai_khoan.trim()) {
      setValErr('Vui lòng nhập số tài khoản.')
      return false
    }
    if (!form.ten_ngan_hang.trim()) {
      setValErr('Vui lòng nhập tên ngân hàng.')
      return false
    }
    setValErr('')
    return true
  }

  const luu = (tiepTuc: boolean) => {
    if (!validate()) return
    if (formMode === 'add') {
      taiKhoanNganHangPost(form)
      toast?.showToast('Đã lưu tài khoản ngân hàng.', 'success')
    } else if (editingId) {
      taiKhoanNganHangPut(editingId, form)
      toast?.showToast('Đã cập nhật tài khoản ngân hàng.', 'success')
    }
    load()
    if (tiepTuc) {
      setForm(emptyForm())
      setFormMode('add')
      setEditingId(null)
    } else {
      setFormOpen(false)
    }
  }

  return (
    <ModulePage title="Tài khoản ngân hàng">
      <div className={styles.root}>
        <div className={styles.toolbarWrap}>
          <button type="button" className={styles.toolbarBtn} onClick={moThem}>
            <Plus size={13} /><span>Thêm</span>
          </button>
          <button type="button" className={styles.toolbarBtn} disabled={!selected} onClick={moSua}>
            <Pencil size={13} /><span>Sửa</span>
          </button>
          <button type="button" className={styles.toolbarBtnDanger} disabled={!selected} onClick={() => selected && setXoaRow(selected)}>
            <Trash2 size={13} /><span>Xóa</span>
          </button>
          <button type="button" className={styles.toolbarBtn} onClick={() => load()}>
            <RefreshCw size={13} /><span>Nạp</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr 140px', gap: 4, marginBottom: 4, alignItems: 'center' }}>
          <input type="text" className={styles.searchInput} placeholder="Tìm kiếm" value={filterSo} onChange={(e) => setFilterSo(e.target.value)} title="Lọc số TK" />
          <input type="text" className={styles.searchInput} placeholder="Tên NH" value={filterNh} onChange={(e) => setFilterNh(e.target.value)} />
          <input type="text" className={styles.searchInput} placeholder="CTY/CN" value={filterCty} onChange={(e) => setFilterCty(e.target.value)} />
          <input type="text" className={styles.searchInput} placeholder="Chủ TK" value={filterChu} onChange={(e) => setFilterChu(e.target.value)} />
          <input type="text" className={styles.searchInput} placeholder="Ngầm định khi" value={filterNd} onChange={(e) => setFilterNd(e.target.value)} />
        </div>
        <div className={styles.gridWrap} style={{ flex: 1, minHeight: 200 }}>
          <DataGrid<TaiKhoanNganHangRecord>
            columns={columns}
            data={filtered}
            keyField="id"
            stripedRows
            compact
            height="100%"
            selectedRowId={selectedId}
            onRowSelect={(r) => setSelectedId(r.id)}
          />
        </div>
      </div>

      <TaiKhoanNganHangForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        formMode={formMode}
        form={form}
        setForm={setForm}
        valErr={valErr}
        bankList={bankList}
        onLuu={luu}
      />

      <ConfirmXoaCaptchaModal
        open={xoaRow != null}
        onClose={() => setXoaRow(null)}
        onConfirm={() => {
          if (!xoaRow) return
          taiKhoanNganHangDelete(xoaRow.id)
          load()
          if (selectedId === xoaRow.id) setSelectedId(null)
          toast?.showToast('Đã xóa tài khoản ngân hàng.', 'info')
          setXoaRow(null)
        }}
        message={
          xoaRow ? (
            <>
              Xóa tài khoản <strong>{xoaRow.so_tai_khoan}</strong> — <strong>{xoaRow.ten_ngan_hang}</strong>?<br />
              <span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span>
            </>
          ) : null
        }
      />
    </ModulePage>
  )
}
