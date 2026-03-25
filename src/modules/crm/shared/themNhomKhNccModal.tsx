import { useState, useRef, useEffect, useMemo } from 'react'
import { X, Info, Trash2, Search } from 'lucide-react'
import type { NhomKhNccItem } from '../muaHang/nhaCungCap/nhaCungCapApi'
import type { NhaCungCapRecord } from '../muaHang/nhaCungCap/nhaCungCapApi'
import { nhaCungCapGetAll } from '../muaHang/nhaCungCap/nhaCungCapApi'
import { formFooterButtonCancel, formFooterButtonSave, formFooterButtonSaveAndAdd } from '../../../constants/formFooterButtons'
import { ChonKhachHangNccModal } from './chonKhachHangNccModal'

/** Chuẩn hóa một từ sang không dấu (dùng cho sinh mã). */
function boDauTu(w: string): string {
  const from = 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ'
  const to = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydD'
  let t = (w || '').trim()
  for (let i = 0; i < from.length; i++) t = t.replace(new RegExp(from[i], 'g'), to[i])
  return t
}

/** Lấy chữ cái đầu mỗi từ trong tên, không dấu, viết hoa (vd: "Nhóm Khách Hàng" → "NKH", "Đối tác" → "DT") */
function maTuChuDauMoiTu(ten: string): string {
  return ten
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => {
      const c = boDauTu(w)[0]
      return c ? c.toUpperCase() : ''
    })
    .filter(Boolean)
    .join('')
}

/** Đảm bảo mã không trùng trong danh sách: thêm _2, _3... nếu cần */
function maDocNhat(baseMa: string, existingItems: NhomKhNccItem[]): string {
  if (!baseMa) return baseMa
  const mas = new Set(existingItems.map((o) => o.ma))
  if (!mas.has(baseMa)) return baseMa
  let n = 2
  while (mas.has(`${baseMa}_${n}`)) n++
  return `${baseMa}_${n}`
}

interface ThemNhomKhNccModalProps {
  onClose: () => void
  onSave: (item: NhomKhNccItem) => void
  onSaveAndAdd?: (item: NhomKhNccItem) => void
  /** Danh sách nhóm có sẵn (cho dropdown Thuộc) */
  parentOptions?: NhomKhNccItem[]
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 4000,
}

const box: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  width: '95vw',
  maxWidth: 720,
  height: '90vh',
  maxHeight: 520,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  overflow: 'hidden',
}

const headerStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'var(--bg-tab)',
  fontSize: '12px',
  fontFamily: "var(--font-misa, 'Tahoma', Arial, sans-serif)",
  fontWeight: 600,
  color: 'var(--text-primary)',
}

const bodyStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: 12,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 4,
  display: 'block',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 280,
  padding: '4px 8px',
  fontSize: 11,
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
  height: 28,
}

const footerStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 8,
  background: 'var(--bg-tab)',
  flexShrink: 0,
}

const thTable: React.CSSProperties = {
  padding: '4px 6px',
  textAlign: 'left',
  background: 'var(--bg-tab)',
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  fontSize: 11,
  fontWeight: 600,
}

const tdTable: React.CSSProperties = {
  padding: '2px 4px',
  borderBottom: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

/** Chuẩn hóa chuỗi để tìm kiếm gần đúng (bỏ dấu, lowercase) */
function normalizeSearch(s: string): string {
  const from = 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ'
  const to = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
  let t = (s || '').toLowerCase().trim()
  for (let i = 0; i < from.length; i++) t = t.replace(new RegExp(from[i], 'g'), to[i])
  return t.replace(/đ/g, 'd')
}

export function ThemNhomKhNccModal({
  onClose,
  onSave,
  onSaveAndAdd,
  parentOptions = [],
}: ThemNhomKhNccModalProps) {
  const overlayMouseDownRef = useRef(false)
  const [ten, setTen] = useState('')
  const [thuoc, setThuoc] = useState('')
  const [dienGiai, setDienGiai] = useState('')
  const [members, setMembers] = useState<{ id: number; ma_ncc: string; ten_ncc: string; dia_chi?: string; ma_so_thue?: string; dien_thoai?: string }[]>([])
  const [showChonKhachHang, setShowChonKhachHang] = useState(false)
  const [searchKhNcc, setSearchKhNcc] = useState('')
  const [nccList, setNccList] = useState<NhaCungCapRecord[]>([])

  const ma = useMemo(
    () => maDocNhat(maTuChuDauMoiTu(ten), parentOptions ?? []),
    [ten, parentOptions]
  )

  useEffect(() => {
    nhaCungCapGetAll().then(setNccList)
  }, [])

  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members])
  const searchResults = useMemo(() => {
    const q = normalizeSearch(searchKhNcc)
    if (!q) return []
    return nccList.filter((r) => {
      if (memberIds.has(r.id)) return false
      const searchableText = [
        r.ma_ncc,
        r.ten_ncc,
        r.dia_chi,
        r.nhom_kh_ncc,
        r.ma_so_thue,
        r.ma_dvqhns,
        r.dien_thoai,
        r.fax,
        r.email,
        r.website,
        r.dien_giai,
        r.dieu_khoan_tt,
        r.nv_mua_hang,
        r.tk_ngan_hang,
        r.ten_ngan_hang,
        r.nguoi_lien_he,
      ]
        .filter(Boolean)
        .map(String)
        .map(normalizeSearch)
        .join(' ')
      return searchableText.includes(q)
    })
  }, [nccList, memberIds, searchKhNcc])

  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false)
      }
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [])

  const addToMembers = (r: NhaCungCapRecord) => {
    setMembers((prev) => [
      ...prev,
      {
        id: r.id,
        ma_ncc: r.ma_ncc,
        ten_ncc: r.ten_ncc,
        dia_chi: r.dia_chi,
        ma_so_thue: r.ma_so_thue,
        dien_thoai: r.dien_thoai,
      },
    ])
    setSearchDropdownOpen(false)
  }

  const handleLuu = () => {
    const trimmedTen = ten.trim()
    if (!ma || !trimmedTen) return
    onSave({ ma, ten: trimmedTen })
    onClose()
  }

  const handleLuuVaTiepTuc = () => {
    const trimmedTen = ten.trim()
    if (!ma || !trimmedTen) return
    const item: NhomKhNccItem = { ma, ten: trimmedTen }
    if (onSaveAndAdd) onSaveAndAdd(item)
    else onSave(item)
    setTen('')
    setThuoc('')
    setDienGiai('')
  }

  return (
    <div
      style={overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) overlayMouseDownRef.current = true }}
      onClick={(e) => { if (e.target === e.currentTarget && overlayMouseDownRef.current) onClose(); overlayMouseDownRef.current = false }}
    >
      <div style={box} onMouseDown={() => { overlayMouseDownRef.current = false }} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span>Thêm Nhóm khách hàng, nhà cung cấp</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: 2,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
            }}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div style={bodyStyle}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', minWidth: 120 }}>
              <label style={labelStyle}>Mã (*)</label>
              <input
                type="text"
                value={ma}
                readOnly
                style={{
                  ...inputStyle,
                  background: 'var(--bg-primary)',
                  color: 'var(--text-muted)',
                  cursor: 'default',
                }}
                title="Tự động theo chữ cái đầu mỗi từ ở ô Tên"
              />
            </div>
            <div style={{ flex: '1 1 180px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Tên (*)</label>
              <input
                type="text"
                value={ten}
                onChange={(e) => setTen(e.target.value)}
                style={{ ...inputStyle, maxWidth: 'none', width: '100%' }}
                placeholder="Nhập tên nhóm"
              />
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', minWidth: 160 }}>
              <label style={labelStyle}>Thuộc</label>
              <select
                value={thuoc}
                onChange={(e) => setThuoc(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', width: 'auto', minWidth: 160 }}
              >
                <option value="">-- Chọn nhóm cha --</option>
                {parentOptions.map((o) => (
                  <option key={o.ma} value={o.ma}>
                    {o.ma} - {o.ten}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Diễn giải</label>
            <textarea
              value={dienGiai}
              onChange={(e) => setDienGiai(e.target.value)}
              style={{ ...inputStyle, minHeight: 56, resize: 'vertical', maxWidth: 'none', width: '100%' }}
              placeholder=""
              rows={2}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Ô tìm kiếm KH/NCC - dropdown xổ xuống, click chọn thì thêm vào bảng */}
              <div ref={searchWrapRef} style={{ position: 'relative', width: '100%' }}>
                <div style={{ position: 'relative', maxWidth: 280 }}>
                  <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={searchKhNcc}
                    onChange={(e) => {
                      setSearchKhNcc(e.target.value)
                      setSearchDropdownOpen(true)
                    }}
                    onFocus={() => setSearchDropdownOpen(true)}
                    onClick={() => { if (!searchDropdownOpen) setSearchDropdownOpen(true) }}
                    placeholder="Tìm kiếm Mã hoặc Tên KH/NCC (gần đúng)..."
                    style={{ ...inputStyle, paddingLeft: 28, maxWidth: '100%', width: '100%' }}
                  />
                </div>
                {searchDropdownOpen && searchKhNcc.trim() && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 2,
                      maxHeight: 220,
                      overflow: 'auto',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      background: 'var(--bg-secondary)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                      zIndex: 100,
                    }}
                  >
                    {searchResults.length === 0 ? (
                      <div style={{ padding: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                        Không tìm thấy KH/NCC phù hợp hoặc đã có trong nhóm.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-tab)' }}>
                            <th
                              style={{
                                padding: '4px 8px',
                                textAlign: 'left',
                                borderBottom: '1px solid var(--border)',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                width: '12%',
                              }}
                            >
                              Mã KH/NCC
                            </th>
                            <th
                              style={{
                                padding: '4px 8px',
                                textAlign: 'left',
                                borderBottom: '1px solid var(--border)',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                width: '12%',
                              }}
                            >
                              Mã số thuế
                            </th>
                            <th
                              style={{
                                padding: '4px 8px',
                                textAlign: 'left',
                                borderBottom: '1px solid var(--border)',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                width: '38%',
                              }}
                            >
                              Tên KH/NCC
                            </th>
                            <th
                              style={{
                                padding: '4px 8px',
                                textAlign: 'left',
                                borderBottom: '1px solid var(--border)',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                              }}
                            >
                              Địa chỉ
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {searchResults.slice(0, 30).map((r) => (
                            <tr
                              key={r.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => addToMembers(r)}
                              onKeyDown={(e) => e.key === 'Enter' && addToMembers(r)}
                              style={{
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                              }}
                            >
                              <td
                                style={{ padding: '4px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                title={r.ma_ncc}
                              >
                                {r.ma_ncc}
                              </td>
                              <td
                                style={{ padding: '4px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                title={r.ma_so_thue}
                              >
                                {r.ma_so_thue}
                              </td>
                              <td
                                style={{ padding: '4px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                title={r.ten_ncc}
                              >
                                {r.ten_ncc}
                              </td>
                              <td
                                style={{ padding: '4px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                title={r.dia_chi}
                              >
                                {r.dia_chi}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={16} style={{ flexShrink: 0, color: 'var(--accent)' }} />
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowChonKhachHang(true)}
                  onKeyDown={(e) => e.key === 'Enter' && setShowChonKhachHang(true)}
                  style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  (Chọn khách hàng, nhà cung cấp vào nhóm để gán vào nhóm này)
                </span>
              </div>
              <div style={{ border: '0.5px solid var(--border)', borderRadius: 4, overflowX: 'auto', background: 'var(--bg-tab)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', borderSpacing: 0, fontSize: 11, tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: 36 }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 90 }} />
                    <col />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 36 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ ...thTable, textAlign: 'center' }}>STT</th>
                      <th style={thTable}>Mã KH/NCC</th>
                      <th style={thTable}>Mã số thuế</th>
                      <th style={thTable}>Tên KH/NCC</th>
                      <th style={thTable}>Điện thoại</th>
                      <th style={{ ...thTable, borderRight: 'none' }}>Địa chỉ</th>
                      <th style={{ ...thTable, width: 36, borderRight: 'none' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 ? null : (
                      members.map((m, idx) => (
                        <tr key={m.id}>
                          <td style={{ ...tdTable, textAlign: 'center' }}>{idx + 1}</td>
                          <td style={tdTable}>{m.ma_ncc}</td>
                          <td style={tdTable}>{m.ma_so_thue ?? ''}</td>
                          <td style={tdTable}>{m.ten_ncc}</td>
                          <td style={tdTable}>{m.dien_thoai ?? ''}</td>
                          <td style={{ ...tdTable, borderRight: 'none' }}>{m.dia_chi ?? ''}</td>
                          <td style={{ ...tdTable, width: 36, padding: '2px 4px', textAlign: 'center', borderRight: 'none', overflow: 'visible' }}>
                            <button
                              type="button"
                              onClick={() => setMembers((prev) => prev.filter((x) => x.id !== m.id))}
                              style={{ padding: 2, background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Xóa dòng"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        <div style={footerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Số dòng = {members.length}</span>
            <a href="#video" style={{ fontSize: 11, color: 'var(--accent)' }} onClick={(e) => e.preventDefault()}>
              Xem video hướng dẫn
            </a>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>
            <button type="button" style={formFooterButtonSave} onClick={handleLuu} disabled={!ma || !ten.trim()}>Lưu</button>
            {onSaveAndAdd && (
              <button type="button" style={formFooterButtonSaveAndAdd} onClick={handleLuuVaTiepTuc} disabled={!ma || !ten.trim()}>Lưu và tiếp tục</button>
            )}
          </div>
        </div>
      </div>

      {showChonKhachHang && (
        <ChonKhachHangNccModal
          title="Chọn khách hàng, nhà cung cấp vào nhóm"
          excludeIds={members.map((m) => m.id)}
          onSelect={(records: NhaCungCapRecord[]) => {
            setMembers((prev) => [
              ...prev,
              ...records.map((r) => ({
                id: r.id,
                ma_ncc: r.ma_ncc,
                ten_ncc: r.ten_ncc,
                dia_chi: r.dia_chi,
                ma_so_thue: r.ma_so_thue,
                dien_thoai: r.dien_thoai,
              })),
            ])
            setShowChonKhachHang(false)
          }}
          onClose={() => setShowChonKhachHang(false)}
        />
      )}
    </div>
  )
}
