import { useState } from 'react'
import {
  Factory,
  Package,
  PackageOpen,
  ArrowLeftRight,
  ClipboardCheck,
  Calculator,
  UserCog,
  BarChart3,
  Wrench,
} from 'lucide-react'
import { NODE_TO_TAB_ID, type WorkflowNodeId } from './workflowConfig'

const BAO_CAO = [
  'Tổng hợp tồn kho',
  'Tổng hợp tồn kho (Việt - Anh)',
  'Tổng hợp tồn kho (Việt - Trung)',
  'Tổng hợp tồn kho theo nhóm VTHH',
  'Tổng hợp tồn trên nhiều kho (Dạng bảng chéo)',
]

/* Dark Theme - bảng màu ảnh 2 */
const DARK = {
  bg: '#1a1a1a',
  panel: '#242424',
  text: '#f59e0b',
  textLight: '#ffab00',
  border: '#3f3f46',
  hover: '#374151',
  connector: '#d97706',
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

const NUT: Nut[] = [
  { id: 'lenh-sx', label: 'Lệnh sản xuất', Icon: Factory, x: AREA_PAD, y: AREA_PAD, w: NODE_W, h: NODE_H },
  { id: 'xuat-kho', label: 'Xuất kho', Icon: Package, x: AREA_PAD + NODE_W + MODULE_GAP, y: AREA_PAD, w: NODE_W, h: NODE_H },
  { id: 'chuyen-kho', label: 'Chuyển kho', Icon: ArrowLeftRight, x: AREA_PAD + 2 * (NODE_W + MODULE_GAP), y: AREA_PAD, w: NODE_W, h: NODE_H },
  { id: 'lap-ra', label: 'Lệnh lắp ráp tháo dỡ', Icon: Package, x: AREA_PAD, y: AREA_PAD + NODE_H + ROW_GAP, w: NODE_W, h: NODE_H },
  { id: 'nhap-kho', label: 'Nhập kho', Icon: PackageOpen, x: AREA_PAD + NODE_W + MODULE_GAP, y: AREA_PAD + NODE_H + ROW_GAP, w: NODE_W, h: NODE_H },
  { id: 'tinh-gia', label: 'Tính giá xuất kho', Icon: Calculator, x: AREA_PAD + 2 * (NODE_W + MODULE_GAP), y: AREA_PAD + NODE_H + ROW_GAP, w: NODE_W, h: NODE_H },
  { id: 'thu-kho', label: 'Thủ kho', labelLine2: 'nhập/xuất kho', Icon: UserCog, x: THU_KHO_X, y: THU_KHO_Y, w: THU_KHO_W, h: THU_KHO_H },
  { id: 'bao-cao', label: 'Báo cáo phân tích', Icon: BarChart3, x: BAO_CAO_X, y: ROW_TOP_Y, w: NODE_W, h: NODE_H },
  { id: 'kiem-ke', label: 'Kiểm kê', Icon: ClipboardCheck, x: KIEM_KE_X, y: KIEM_KE_Y, w: NODE_W, h: NODE_H },
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
  onChonKho,
  onChonDonViTinh,
  onChonTienIch,
  onChonTab,
}: {
  onChonVatTuHangHoa: () => void
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
    background: isHover ? DARK.hover : DARK.panel,
    border: `1px solid ${isHover ? DARK.text : DARK.border}`,
    borderRadius: 6,
    boxSizing: 'border-box',
    cursor: NODE_TO_TAB_ID[n.id] ? 'pointer' : 'default',
    transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
    boxShadow: isHover ? `0 0 0 2px ${DARK.border}` : 'none',
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
                      color={DARK.textLight}
                      style={{ marginBottom: 4, flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        color: DARK.text,
                        textAlign: 'center',
                        lineHeight: 1.3,
                        width: '100%',
                      }}
                    >
                      {n.label}
                      {n.labelLine2 && (
                        <>
                          <br />
                          {n.labelLine2}
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
          <Package size={22} color={DARK.textLight} style={{ marginBottom: 2 }} />
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
          <PackageOpen size={22} color={DARK.textLight} style={{ marginBottom: 2 }} />
          <span style={{ textAlign: 'center' }}>Vật tư hàng hóa</span>
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
          <Calculator size={22} color={DARK.textLight} style={{ marginBottom: 2 }} />
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
          <Wrench size={22} color={DARK.textLight} style={{ marginBottom: 2 }} />
          <span style={{ textAlign: 'center' }}>Tiện ích</span>
        </button>
      </div>
    </div>
  )
}
