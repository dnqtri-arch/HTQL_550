import { useState } from 'react'
import {
  Factory,
  ScanLine,
  PackageOpen,
  Repeat,
  ClipboardList,
  Calculator,
  Boxes,
  BarChart2,
  Tags,
  FolderTree,
  Percent,
  Warehouse,
  Ruler,
  FileStack,
  Scaling,
  Palette,
  Settings2,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import { NODE_TO_TAB_ID, type WorkflowNodeId } from './workflowConfig'

const BAO_CAO = [
  'Tổng hợp tồn kho',
  'Tổng hợp tồn kho (Việt - Anh)',
  'Tổng hợp tồn kho (Việt - Trung)',
  'Tổng hợp tồn kho theo nhóm VTHH',
  'Tổng hợp tồn trên nhiều kho (Dạng bảng chéo)',
]

/* Theme 2026 - dùng biến CSS toàn cục */
const DARK = {
  bg: 'var(--bg-secondary)',
  panel: 'var(--bg-tab)',
  text: 'var(--text-primary)',
  textLight: 'var(--text-secondary)',
  border: 'var(--border)',
  hover: 'var(--bg-tab-active)',
  connector: 'var(--connector)',
}

/* Bố cục T-junction: [Nghiệp vụ] -> [Thủ kho] --ngang--> [Báo cáo]; nhánh dọc xuống [Kiểm kê]. */
const COL_GAP = 48
const ROW_GAP = 36
const MODULE_GAP = 32
const NODE_W = 125
const NODE_H = 105
const THU_KHO_W = NODE_W
const THU_KHO_H = NODE_H
const AREA_PAD = 32
const GAP_THU_KHO_BAO_CAO = 88
const GAP_ROW_KIEM_KE = 32
const LINE_OFFSET = 0

/* Khối 1: 2×3. Khối 2 (T-junction): Thủ kho + Báo cáo cùng hàng; Kiểm kê phía dưới, cân xứng giữa hai module. */
const COL1_W = NODE_W * 3 + MODULE_GAP * 2
const COL1_H = NODE_H * 2 + ROW_GAP
const BACKBONE_Y = AREA_PAD + NODE_H + ROW_GAP / 2
const THU_KHO_X = AREA_PAD + COL1_W + COL_GAP
const THU_KHO_Y = AREA_PAD + (COL1_H - THU_KHO_H) / 2
const BAO_CAO_X = THU_KHO_X + THU_KHO_W + GAP_THU_KHO_BAO_CAO
const ROW_TOP_Y = THU_KHO_Y
const X_MID = (THU_KHO_X + THU_KHO_W + BAO_CAO_X) / 2
const KIEM_KE_X = X_MID - NODE_W / 2
const KIEM_KE_Y = ROW_TOP_Y + Math.max(THU_KHO_H, NODE_H) + GAP_ROW_KIEM_KE
const BACKBONE_START_X = AREA_PAD + NODE_W / 2
const BACKBONE_END_X = AREA_PAD + COL1_W

interface Nut {
  id: WorkflowNodeId
  label: string
  labelLine2?: string
  Icon: React.ElementType
  x: number
  y: number
  w: number
  h: number
}

const NODE_ACCENT: Record<WorkflowNodeId, string> = {
  'lenh-sx': '#6366f1',
  'xuat-kho': '#0284c7',
  'chuyen-kho': '#0d9488',
  'lap-ra': '#7c3aed',
  'nhap-kho': '#16a34a',
  'tinh-gia': '#ea580c',
  'thu-kho': '#2563eb',
  'bao-cao': '#ca8a04',
  'kiem-ke': '#dc2626',
}

const NUT: Nut[] = [
  { id: 'lenh-sx', label: 'Lệnh sản xuất', Icon: Factory, x: AREA_PAD, y: AREA_PAD, w: NODE_W, h: NODE_H },
  { id: 'xuat-kho', label: 'Xuất kho', Icon: ScanLine, x: AREA_PAD + NODE_W + MODULE_GAP, y: AREA_PAD, w: NODE_W, h: NODE_H },
  { id: 'chuyen-kho', label: 'Chuyển kho', Icon: Repeat, x: AREA_PAD + 2 * (NODE_W + MODULE_GAP), y: AREA_PAD, w: NODE_W, h: NODE_H },
  { id: 'lap-ra', label: 'Lệnh lắp ráp tháo dỡ', Icon: Settings2, x: AREA_PAD, y: AREA_PAD + NODE_H + ROW_GAP, w: NODE_W, h: NODE_H },
  { id: 'nhap-kho', label: 'Nhập kho', Icon: PackageOpen, x: AREA_PAD + NODE_W + MODULE_GAP, y: AREA_PAD + NODE_H + ROW_GAP, w: NODE_W, h: NODE_H },
  { id: 'tinh-gia', label: 'Tính giá xuất kho', Icon: Calculator, x: AREA_PAD + 2 * (NODE_W + MODULE_GAP), y: AREA_PAD + NODE_H + ROW_GAP, w: NODE_W, h: NODE_H },
  { id: 'thu-kho', label: 'Thủ kho', labelLine2: 'nhập/xuất kho', Icon: Boxes, x: THU_KHO_X, y: THU_KHO_Y, w: THU_KHO_W, h: THU_KHO_H },
  { id: 'bao-cao', label: 'Tồn kho', Icon: BarChart2, x: BAO_CAO_X, y: THU_KHO_Y, w: NODE_W, h: THU_KHO_H },
  { id: 'kiem-ke', label: 'Kiểm kê', Icon: ClipboardList, x: KIEM_KE_X, y: KIEM_KE_Y, w: NODE_W, h: NODE_H },
]

const DIAGRAM_W = Math.max(BAO_CAO_X + NODE_W, KIEM_KE_X + NODE_W) + AREA_PAD
const DIAGRAM_H = KIEM_KE_Y + NODE_H + AREA_PAD

function toaDoEdge(n: Nut, side: 'left' | 'right'): { x: number; y: number } {
  const cy = n.y + n.h / 2
  if (side === 'left') return { x: n.x, y: cy }
  return { x: n.x + n.w, y: cy }
}

function toaDoTopCenter(n: Nut): { x: number; y: number } {
  return { x: n.x + n.w / 2, y: n.y }
}

function getNut(id: WorkflowNodeId): Nut {
  return NUT.find((n) => n.id === id)!
}

export function QuyTrinhKho({
  onChonVatTuHangHoa,
  onChonLoaiVthh,
  onChonNhomVthh,
  onChonKhoGiay,
  onChonDoDayDinhLuong,
  onChonHeMau,
  onChonThueGtgt,
  onChonKho,
  onChonDonViTinh,
  onChonTienIch,
  onChonTab,
}: {
  onChonVatTuHangHoa: () => void
  onChonLoaiVthh: () => void
  onChonNhomVthh: () => void
  onChonKhoGiay: () => void
  onChonDoDayDinhLuong: () => void
  onChonHeMau: () => void
  onChonThueGtgt: () => void
  onChonKho: () => void
  onChonDonViTinh: () => void
  onChonTienIch: () => void
  onChonTab?: (tabId: string) => void
}) {
  const [hoverNode, setHoverNode] = useState<WorkflowNodeId | null>(null)

  const handleClickNode = (nodeId: WorkflowNodeId) => {
    const tabId = NODE_TO_TAB_ID[nodeId]
    if (tabId && onChonTab) onChonTab(tabId)
  }

  const nodeStyle = (n: Nut, isHover: boolean): React.CSSProperties => ({
    position: 'absolute',
    left: n.x,
    top: n.y,
    width: n.w,
    height: n.h,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 10px',
    background: isHover ? `color-mix(in oklab, ${NODE_ACCENT[n.id]} 18%, ${DARK.panel})` : DARK.panel,
    border: `1px solid ${isHover ? NODE_ACCENT[n.id] : `${NODE_ACCENT[n.id]}66`}`,
    borderRadius: 6,
    boxSizing: 'border-box',
    cursor: NODE_TO_TAB_ID[n.id] ? 'pointer' : 'default',
    transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
    boxShadow: isHover ? `0 0 0 2px ${NODE_ACCENT[n.id]}44` : `inset 0 -2px 0 0 ${NODE_ACCENT[n.id]}33`,
  })

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: '100%',
        minHeight: 320,
        background: DARK.bg,
        padding: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>
        {/* Vùng Nghiệp vụ kho: 3 cột, gap 32–40px, SVG overlay phủ toàn bộ */}
        <div
          style={{
            flex: '1 1 65%',
            minWidth: 0,
            background: DARK.panel,
            border: `1px solid ${DARK.border}`,
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '6px 10px',
              background: DARK.bg,
              borderBottom: `1px solid ${DARK.border}`,
              fontSize: 11,
              fontWeight: 700,
              color: DARK.text,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            Nghiệp vụ kho
          </div>
          <div
            style={{
              flex: 1,
              position: 'relative',
              minHeight: DIAGRAM_H,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: DARK.panel,
            }}
          >
            <div style={{ position: 'relative', width: DIAGRAM_W, height: DIAGRAM_H }}>
              {/* SVG overlay: đường 1.5px, màu #d97706, từ cạnh phải giữa → cạnh trái module đích */}
              <svg
                width={DIAGRAM_W}
                height={DIAGRAM_H}
                style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
              >
                <defs>
                  <marker id="arrow-kho-right" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L8,4 L0,8 Z" fill={DARK.connector} />
                  </marker>
                  <marker id="arrow-kho-down" markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto">
                    <path d="M0,0 L6,0 L3,6 Z" fill={DARK.connector} />
                  </marker>
                </defs>
                {/* Đường trục chính (backbone): một đường ngang giữa hai hàng */}
                <line
                  x1={BACKBONE_START_X}
                  y1={BACKBONE_Y}
                  x2={BACKBONE_END_X}
                  y2={BACKBONE_Y}
                  stroke={DARK.connector}
                  strokeWidth={1.5}
                />
                {/* Module đầu vào: đường dọc nối vào backbone (cách viền module một khoảng, line nằm ngoài border) */}
                {[getNut('lenh-sx'), getNut('xuat-kho'), getNut('chuyen-kho')].map((n, i) => {
                  const cx = n.x + n.w / 2
                  const startY = n.y + n.h + LINE_OFFSET
                  return (
                    <line
                      key={`v-top-${i}`}
                      x1={cx}
                      y1={startY}
                      x2={cx}
                      y2={BACKBONE_Y}
                      stroke={DARK.connector}
                      strokeWidth={1.5}
                    />
                  )
                })}
                {[getNut('lap-ra'), getNut('nhap-kho'), getNut('tinh-gia')].map((n, i) => {
                  const cx = n.x + n.w / 2
                  const endY = n.y - LINE_OFFSET
                  return (
                    <line
                      key={`v-bot-${i}`}
                      x1={cx}
                      y1={BACKBONE_Y}
                      x2={cx}
                      y2={endY}
                      stroke={DARK.connector}
                      strokeWidth={1.5}
                    />
                  )
                })}
                {/* Luồng trung tâm: từ backbone một mũi tên vào Thủ kho (giống mũi tên trước Báo cáo) */}
                <line
                  x1={BACKBONE_END_X}
                  y1={BACKBONE_Y}
                  x2={THU_KHO_X - LINE_OFFSET}
                  y2={BACKBONE_Y}
                  stroke={DARK.connector}
                  strokeWidth={1.5}
                  markerEnd="url(#arrow-kho-right)"
                />
                {/* T-junction: đường ngang cùng độ cao BACKBONE_Y, nhánh dọc xuống Kiểm kê; cách viền module một khoảng */}
                {(() => {
                  const thuKho = getNut('thu-kho')
                  const baoCao = getNut('bao-cao')
                  const kiemKe = getNut('kiem-ke')
                  const kiemKeTop = toaDoTopCenter(kiemKe)
                  const xR = toaDoEdge(thuKho, 'right').x + LINE_OFFSET
                  const xL = toaDoEdge(baoCao, 'left').x - LINE_OFFSET
                  const yKiemKe = kiemKeTop.y - LINE_OFFSET
                  return (
                    <>
                      <line
                        x1={xR}
                        y1={BACKBONE_Y}
                        x2={xL}
                        y2={BACKBONE_Y}
                        stroke={DARK.connector}
                        strokeWidth={1.5}
                        markerEnd="url(#arrow-kho-right)"
                      />
                      <line
                        x1={X_MID}
                        y1={BACKBONE_Y}
                        x2={X_MID}
                        y2={yKiemKe}
                        stroke={DARK.connector}
                        strokeWidth={1.5}
                      />
                    </>
                  )
                })()}
              </svg>
              {NUT.map((n) => {
                const isHover = hoverNode === n.id
                const coTab = NODE_TO_TAB_ID[n.id]
                return (
                  <button
                    key={n.id}
                    type="button"
                    style={nodeStyle(n, isHover)}
                    onMouseEnter={() => setHoverNode(n.id)}
                    onMouseLeave={() => setHoverNode(null)}
                    onClick={() => coTab && handleClickNode(n.id)}
                    title={coTab ? `Mở: ${n.label}` : undefined}
                  >
                    <n.Icon
                      size={22}
                      color={NODE_ACCENT[n.id]}
                      style={{ marginBottom: 6, flexShrink: 0 }}
                      strokeWidth={2.2}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        color: DARK.text,
                        textAlign: 'center',
                        lineHeight: 1.22,
                        width: '100%',
                        fontWeight: 600,
                      }}
                    >
                      {n.label}
                      {n.labelLine2 && (
                        <>
                          <br />
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{n.labelLine2}</span>
                        </>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Báo cáo: nền tối, chữ vàng nhạt */}
        <div
          style={{
            flex: '0 0 200px',
            background: DARK.panel,
            border: `1px solid ${DARK.border}`,
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '6px 10px',
              background: DARK.bg,
              borderBottom: `1px solid ${DARK.border}`,
              fontSize: 11,
              fontWeight: 700,
              color: DARK.text,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            Báo cáo
          </div>
          <ul
            style={{
              listStyle: 'disc',
              paddingLeft: 18,
              margin: '8px 0',
              fontSize: 10,
              color: DARK.textLight,
              lineHeight: 1.7,
            }}
          >
            {BAO_CAO.map((ten) => (
              <li key={ten} style={{ marginBottom: 4, cursor: 'pointer' }}>
                {ten}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onChonTab?.('kho-vat-tu-hang-hoa')}
            style={{
              margin: '8px 10px',
              padding: '6px 10px',
              fontSize: 10,
              background: DARK.connector,
              color: DARK.bg,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Tất cả báo cáo
          </button>
        </div>
      </div>

      {/* Thanh dưới: icon vàng cam, nền đen, viền bo tròn */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '8px 10px',
          background: DARK.bg,
          border: `1px solid ${DARK.border}`,
          borderTop: `2px solid ${DARK.border}`,
          borderRadius: 6,
        }}
      >
        <button
          type="button"
          onClick={onChonKho}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            background: DARK.panel,
            border: `1px solid ${DARK.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            color: DARK.textLight,
            fontSize: 10,
          }}
        >
          <Warehouse size={22} color="#0ea5e9" style={{ marginBottom: 2 }} />
          <span style={{ textAlign: 'center' }}>Kho</span>
        </button>
        <button
          type="button"
          onClick={onChonVatTuHangHoa}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            background: DARK.panel,
            border: `1px solid ${DARK.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            color: DARK.textLight,
            fontSize: 10,
          }}
        >
          <ShoppingBag size={22} color="#16a34a" style={{ marginBottom: 2 }} />
          <span style={{ textAlign: 'center' }}>Vật tư hàng hóa</span>
        </button>
        <button
          type="button"
          onClick={onChonLoaiVthh}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            background: DARK.panel,
            border: `1px solid ${DARK.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            color: DARK.textLight,
            fontSize: 10,
          }}
        >
          <Tags size={22} color="#0f766e" style={{ marginBottom: 2 }} />
          <span style={{ textAlign: 'center' }}>Loại VTHH</span>
        </button>
        <button
          type="button"
          onClick={onChonNhomVthh}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            background: DARK.panel,
            border: `1px solid ${DARK.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            color: DARK.textLight,
            fontSize: 10,
          }}
        >
          <FolderTree size={22} color="#0891b2" style={{ marginBottom: 2 }} />
          <span style={{ textAlign: 'center' }}>Nhóm VTHH</span>
        </button>
        <button
          type="button"
          onClick={onChonKhoGiay}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            background: DARK.panel,
            border: `1px solid ${DARK.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            color: DARK.textLight,
            fontSize: 10,
          }}
        >
          <FileStack size={22} color="#7c3aed" style={{ marginBottom: 2 }} />
          <span style={{ textAlign: 'center' }}>Khổ giấy</span>
        </button>
        <button
          type="button"
          onClick={onChonDoDayDinhLuong}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            background: DARK.panel,
            border: `1px solid ${DARK.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            color: DARK.textLight,
            fontSize: 10,
          }}
        >
          <Scaling size={22} color="#a855f7" style={{ marginBottom: 2 }} />
          <span style={{ textAlign: 'center' }}>Độ dày/ Định lượng</span>
        </button>
        <button
          type="button"
          onClick={onChonHeMau}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            background: DARK.panel,
            border: `1px solid ${DARK.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            color: DARK.textLight,
            fontSize: 10,
          }}
        >
          <Palette size={22} color="#c026d3" style={{ marginBottom: 2 }} />
          <span style={{ textAlign: 'center' }}>Hệ màu</span>
        </button>
        <button
          type="button"
          onClick={onChonThueGtgt}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            background: DARK.panel,
            border: `1px solid ${DARK.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            color: DARK.textLight,
            fontSize: 10,
          }}
        >
          <Percent size={22} color="#ca8a04" style={{ marginBottom: 2 }} />
          <span style={{ textAlign: 'center' }}>Thuế GTGT</span>
        </button>
        <button
          type="button"
          onClick={onChonDonViTinh}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            background: DARK.panel,
            border: `1px solid ${DARK.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            color: DARK.textLight,
            fontSize: 10,
          }}
        >
          <Ruler size={22} color="#7c3aed" style={{ marginBottom: 2 }} />
          <span style={{ textAlign: 'center' }}>Đơn vị tính</span>
        </button>
        <button
          type="button"
          onClick={onChonTienIch}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            background: DARK.panel,
            border: `1px solid ${DARK.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            color: DARK.textLight,
            fontSize: 10,
          }}
        >
          <Truck size={22} color="#64748b" style={{ marginBottom: 2 }} />
          <span style={{ textAlign: 'center' }}>Tiện ích</span>
        </button>
      </div>
    </div>
  )
}
