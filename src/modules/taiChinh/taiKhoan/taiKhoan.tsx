/**
 * Module Tài khoản — danh sách + form thêm/sửa (YC62, YC91, YC92).
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../components/common/dataGrid'
import { ModulePage } from '../../../components/modulePage'
import { useToastOptional } from '../../../context/toastContext'
import { matchSearchKeyword } from '../../../utils/stringUtils'
import { getBanksVietnam, type BankItem } from '../../crm/shared/banksApi'
import { ConfirmXoaCaptchaModal } from '../../../components/common/confirmXoaCaptchaModal'
import type { TaiKhoanRecord } from '../../../types/taiKhoan'
import { taiKhoanGetAll, taiKhoanPost, taiKhoanPut, taiKhoanDelete } from './taiKhoanApi'
import { TaiKhoanForm } from './taiKhoanForm'
import styles from '../../crm/banHang/BanHang.module.css'
import { decodeNgamDinhKhiList } from '../../../constants/ngamDinhTaiKhoan'
import { formatNumberDisplay } from '../../../utils/numberFormat'
import { phieuTaiKhoanTongPhatSinhTheoId } from './phieuTaiKhoanTongPhatSinh'
import { HTQL_THU_TIEN_BANG_RELOAD_EVENT } from '../thuTien/thuTienBangApi'
import { HTQL_CHI_TIEN_BANG_RELOAD_EVENT } from '../chiTien/chiTienBangApi'
import { HTQL_TAI_CHINH_GHI_SO_RELOAD_EVENT } from '../thuTien/ghiSoTaiChinhApi'

function emptyForm(): Omit<TaiKhoanRecord, 'id'> {
  return {
    la_tai_khoan_ngan_hang: false,
    la_tien_mat: false,
    thuoc_cty_cn: '',
    so_tai_khoan: '',
    ten_ngan_hang: '',
    ngam_dinh_khi: '',
    dien_giai: '',
    so_du_hien_tai: undefined,
  }
}

export function TaiKhoan() {
  const toast = useToastOptional()
  const [rows, setRows] = useState<TaiKhoanRecord[]>([])
  const [phieuTick, setPhieuTick] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterSo, setFilterSo] = useState('')
  const [filterNh, setFilterNh] = useState('')
  const [filterCty, setFilterCty] = useState('')
  const [filterLoai, setFilterLoai] = useState('')
  const [filterNd, setFilterNd] = useState('')
  const [bankList, setBankList] = useState<BankItem[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [form, setForm] = useState<Omit<TaiKhoanRecord, 'id'>>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [valErr, setValErr] = useState('')
  const [xoaRow, setXoaRow] = useState<TaiKhoanRecord | null>(null)

  const load = useCallback(() => {
    setRows(taiKhoanGetAll())
    setPhieuTick((t) => t + 1)
  }, [])
  useEffect(() => {
    load()
    getBanksVietnam().then((l) => {
      if (Array.isArray(l) && l.length) setBankList(l)
    })
  }, [load])

  useEffect(() => {
    const bump = () => setPhieuTick((t) => t + 1)
    window.addEventListener(HTQL_THU_TIEN_BANG_RELOAD_EVENT, bump)
    window.addEventListener(HTQL_CHI_TIEN_BANG_RELOAD_EVENT, bump)
    window.addEventListener(HTQL_TAI_CHINH_GHI_SO_RELOAD_EVENT, bump)
    return () => {
      window.removeEventListener(HTQL_THU_TIEN_BANG_RELOAD_EVENT, bump)
      window.removeEventListener(HTQL_CHI_TIEN_BANG_RELOAD_EVENT, bump)
      window.removeEventListener(HTQL_TAI_CHINH_GHI_SO_RELOAD_EVENT, bump)
    }
  }, [])

  const phatSinhTheoTk = useMemo(() => phieuTaiKhoanTongPhatSinhTheoId(), [rows, phieuTick])

  const columns = useMemo((): DataGridColumn<TaiKhoanRecord>[] => {
    const ps = phatSinhTheoTk
    return [
      { key: 'thuoc_cty_cn', label: 'Thuộc CTY/CN', width: 120 },
      {
        key: 'loai',
        label: 'Loại',
        width: 88,
        renderCell: (_v, row) => {
          const r = row as TaiKhoanRecord
          const p: string[] = []
          if (r.la_tai_khoan_ngan_hang) p.push('NH')
          if (r.la_tien_mat) p.push('TM')
          return p.length ? p.join(' + ') : '—'
        },
      },
      { key: 'so_tai_khoan', label: 'Số tài khoản', width: 140 },
      { key: 'ten_ngan_hang', label: 'Tên NH / TK', width: '22%' },
      {
        key: 'so_du_hien_tai',
        label: 'Số dư đầu kỳ',
        width: 112,
        align: 'right',
        renderCell: (_v, row) => {
          const r = row as TaiKhoanRecord
          if (r.so_du_hien_tai === undefined || !Number.isFinite(r.so_du_hien_tai)) return '—'
          return formatNumberDisplay(Math.round(r.so_du_hien_tai), 0)
        },
      },
      {
        key: 'so_du_hien_tai_theo_phieu',
        label: 'Số dư hiện tại',
        width: 120,
        align: 'right',
        renderCell: (_v, row) => {
          const r = row as TaiKhoanRecord
          const dauKyCo =
            r.so_du_hien_tai !== undefined &&
            Number.isFinite(r.so_du_hien_tai)
          const dauKy = dauKyCo ? Math.round(r.so_du_hien_tai!) : null
          const psAmt = ps.get(r.id) ?? 0
          if (!dauKyCo && psAmt === 0) return '—'
          return formatNumberDisplay((dauKy ?? 0) + psAmt, 0)
        },
      },
      {
        key: 'ngam_dinh_khi',
        label: 'Ngầm định khi',
        width: 200,
        renderCell: (v) => {
          const all = decodeNgamDinhKhiList(String(v ?? ''))
          if (all.length === 0) return ''
          const t = all.join(', ')
          return t.length > 48 ? `${t.slice(0, 48)}…` : t
        },
      },
    ]
  }, [phatSinhTheoTk])

  const selected = selectedId ? rows.find((r) => r.id === selectedId) ?? null : null

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterSo.trim() && !matchSearchKeyword(r.so_tai_khoan, filterSo)) return false
      if (filterNh.trim() && !matchSearchKeyword(r.ten_ngan_hang, filterNh)) return false
      if (filterCty.trim() && !matchSearchKeyword(r.thuoc_cty_cn, filterCty)) return false
      if (filterLoai.trim()) {
        const fl = filterLoai.trim().toLowerCase()
        const bits = `${r.la_tai_khoan_ngan_hang ? 'nh ngân hàng' : ''} ${r.la_tien_mat ? 'tm tiền mặt' : ''}`
        if (!bits.toLowerCase().includes(fl)) return false
      }
      if (filterNd.trim() && !matchSearchKeyword(r.ngam_dinh_khi, filterNd)) return false
      return true
    })
  }, [rows, filterSo, filterNh, filterCty, filterLoai, filterNd])

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
    if (form.la_tien_mat) {
      if (!form.ten_ngan_hang.trim()) {
        setValErr('Vui lòng nhập tên tài khoản.')
        return false
      }
    } else {
      if (!form.ten_ngan_hang.trim()) {
        setValErr('Vui lòng nhập tên ngân hàng.')
        return false
      }
    }
    setValErr('')
    return true
  }

  const luu = (tiepTuc: boolean) => {
    if (!validate()) return
    if (formMode === 'add') {
      taiKhoanPost(form)
      toast?.showToast('Đã lưu tài khoản.', 'success')
    } else if (editingId) {
      taiKhoanPut(editingId, form)
      toast?.showToast('Đã cập nhật tài khoản.', 'success')
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
    <ModulePage title="Tài khoản">
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
          <input type="text" className={styles.searchInput} placeholder="Loại (NH/TM)" value={filterLoai} onChange={(e) => setFilterLoai(e.target.value)} />
          <input type="text" className={styles.searchInput} placeholder="Ngầm định khi" value={filterNd} onChange={(e) => setFilterNd(e.target.value)} />
        </div>
        <div className={styles.gridWrap} style={{ flex: 1, minHeight: 200 }}>
          <DataGrid<TaiKhoanRecord>
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

      <TaiKhoanForm
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
          taiKhoanDelete(xoaRow.id)
          load()
          if (selectedId === xoaRow.id) setSelectedId(null)
          toast?.showToast('Đã xóa tài khoản.', 'info')
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
