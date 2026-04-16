/**
 * Loại thu/chi — quản lý lý do thu, chi, chuyển tiền (YC94).
 */
import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../components/common/dataGrid'
import { ModulePage } from '../../../components/modulePage'
import { useToastOptional } from '../../../context/toastContext'
import { matchSearchKeyword } from '../../../utils/stringUtils'
import { ConfirmXoaCaptchaModal } from '../../../components/common/confirmXoaCaptchaModal'
import type { LoaiThuChiRecord } from '../../../types/loaiThuChi'
import {
  loaiThuChiQueryKey,
  loaiThuChiQueryFn,
  loaiThuChiPost,
  loaiThuChiPut,
  loaiThuChiDelete,
  loaiThuChiMaTrung,
} from './loaiThuChiApi'
import { LoaiThuChiForm } from './loaiThuChiForm'
import styles from '../../crm/banHang/BanHang.module.css'

function emptyForm(): Omit<LoaiThuChiRecord, 'id'> {
  return {
    ma: '',
    ten: '',
    ghi_chu: '',
    ap_dung_thu: false,
    ap_dung_chi: false,
    ap_dung_chuyen_tien: false,
  }
}

function tickLabel(v: boolean): string {
  return v ? 'Có' : '—'
}

export function LoaiThuChi() {
  const toast = useToastOptional()
  const queryClient = useQueryClient()
  const { data: loaiThuChiData, isFetching, refetch } = useQuery({
    queryKey: loaiThuChiQueryKey,
    queryFn: loaiThuChiQueryFn,
  })
  const rows = loaiThuChiData?.rows ?? []
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterTen, setFilterTen] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [form, setForm] = useState<Omit<LoaiThuChiRecord, 'id'>>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [valErr, setValErr] = useState('')
  const [xoaRow, setXoaRow] = useState<LoaiThuChiRecord | null>(null)

  const columns = useMemo((): DataGridColumn<LoaiThuChiRecord>[] => {
    return [
      { key: 'ma', label: 'Mã loại', width: 100 },
      { key: 'ten', label: 'Tên lý do', width: '28%' },
      {
        key: 'ap_dung_chi',
        label: 'Lý do chi',
        width: 88,
        align: 'center',
        renderCell: (_v, row) => tickLabel((row as LoaiThuChiRecord).ap_dung_chi),
      },
      {
        key: 'ap_dung_thu',
        label: 'Lý do thu',
        width: 88,
        align: 'center',
        renderCell: (_v, row) => tickLabel((row as LoaiThuChiRecord).ap_dung_thu),
      },
      {
        key: 'ap_dung_chuyen_tien',
        label: 'Lý do chuyển',
        width: 100,
        align: 'center',
        renderCell: (_v, row) => tickLabel((row as LoaiThuChiRecord).ap_dung_chuyen_tien),
      },
    ]
  }, [])

  const selected = selectedId ? rows.find((r) => r.id === selectedId) ?? null : null

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = filterTen.trim()
      if (!q) return true
      return matchSearchKeyword(r.ten, q) || matchSearchKeyword(r.ma, q)
    })
  }, [rows, filterTen])

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
    if (!form.ma.trim()) {
      setValErr('Vui lòng nhập mã loại.')
      return false
    }
    if (!form.ten.trim()) {
      setValErr('Vui lòng nhập tên lý do.')
      return false
    }
    const n =
      (form.ap_dung_thu ? 1 : 0) + (form.ap_dung_chi ? 1 : 0) + (form.ap_dung_chuyen_tien ? 1 : 0)
    if (n !== 1) {
      setValErr('Chọn đúng một: Lý do chi, Lý do thu hoặc Lý do chuyển tiền.')
      return false
    }
    if (loaiThuChiMaTrung(form.ma, rows, formMode === 'edit' ? editingId : null)) {
      setValErr('Mã loại đã tồn tại.')
      return false
    }
    setValErr('')
    return true
  }

  const luu = async (tiepTuc: boolean) => {
    if (!validate()) return
    const current = loaiThuChiData
    if (!current) {
      toast?.showToast('Chưa tải dữ liệu.', 'error')
      return
    }
    try {
      if (formMode === 'add') {
        await loaiThuChiPost(form, current)
        toast?.showToast('Đã lưu.', 'success')
      } else if (editingId) {
        await loaiThuChiPut(editingId, form, current)
        toast?.showToast('Đã cập nhật.', 'success')
      }
      await queryClient.invalidateQueries({ queryKey: loaiThuChiQueryKey })
      if (tiepTuc) {
        setForm(emptyForm())
        setFormMode('add')
        setEditingId(null)
      } else {
        setFormOpen(false)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg === 'CONFLICT') {
        await queryClient.invalidateQueries({ queryKey: loaiThuChiQueryKey })
        toast?.showToast('Dữ liệu đã thay đổi. Bạn đã nạp lại.', 'info')
        return
      }
      toast?.showToast(msg || 'Không lưu được.', 'error')
    }
  }

  return (
    <ModulePage title="Loại thu/chi">
      <div className={styles.root}>
        <div className={styles.toolbarWrap}>
          <button type="button" className={styles.toolbarBtn} onClick={moThem}>
            <Plus size={13} />
            <span>Thêm</span>
          </button>
          <button type="button" className={styles.toolbarBtn} disabled={!selected} onClick={moSua}>
            <Pencil size={13} />
            <span>Sửa</span>
          </button>
          <button type="button" className={styles.toolbarBtnDanger} disabled={!selected} onClick={() => selected && setXoaRow(selected)}>
            <Trash2 size={13} />
            <span>Xóa</span>
          </button>
          <button type="button" className={styles.toolbarBtn} onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw size={13} />
            <span>Nạp</span>
          </button>
        </div>
        <div style={{ marginBottom: 4 }}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Tìm mã hoặc tên lý do..."
            value={filterTen}
            onChange={(e) => setFilterTen(e.target.value)}
          />
        </div>
        <div className={styles.gridWrap} style={{ flex: 1, minHeight: 200 }}>
          <DataGrid<LoaiThuChiRecord>
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

      <LoaiThuChiForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        formMode={formMode}
        form={form}
        setForm={setForm}
        valErr={valErr}
        onLuu={luu}
      />

      <ConfirmXoaCaptchaModal
        open={xoaRow != null}
        onClose={() => setXoaRow(null)}
        onConfirm={async () => {
          if (!xoaRow) return
          const current = loaiThuChiData
          if (!current) {
            setXoaRow(null)
            return
          }
          try {
            await loaiThuChiDelete(xoaRow.id, current)
            await queryClient.invalidateQueries({ queryKey: loaiThuChiQueryKey })
            if (selectedId === xoaRow.id) setSelectedId(null)
            toast?.showToast('Đã xóa.', 'info')
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            if (msg === 'CONFLICT') {
              await queryClient.invalidateQueries({ queryKey: loaiThuChiQueryKey })
              toast?.showToast('Dữ liệu đã thay đổi. Bạn đã nạp lại.', 'info')
            } else {
              toast?.showToast(msg || 'Không xóa được.', 'error')
            }
          } finally {
            setXoaRow(null)
          }
        }}
        message={
          xoaRow ? (
            <>
              Xóa lý do <strong>{xoaRow.ten}</strong>?<br />
              <span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span>
            </>
          ) : null
        }
      />
    </ModulePage>
  )
}
