import { useState } from 'react'
import {
  FileText,
  FileInput,
  Package,
  RotateCcw,
  CreditCard,
  BarChart3,
  FileSignature,
  Receipt,
  Percent,
  Users,
  ShoppingBag,
  FileCheck,
  Wrench,
} from 'lucide-react'

const BAO_CAO = [
  'Tổng hợp mua hàng',
  'Tổng hợp mua hàng (Việt - Anh)',
  'Tổng hợp mua hàng (Việt - Trung)',
  'Số chi tiết mua hàng',
  'Số chi tiết mua hàng (Việt - Anh)',
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
  /** Đường nối màu cam từ Đề xuất mua hàng tới Đơn / Hợp đồng */
  connectorCam: 'var(--accent)',
}

const COL_GAP = 24
const ROW_GAP = 56
const NODE_W = 110
const NODE_H = 90
const AREA_PAD = 44
const SHIFT = NODE_W + COL_GAP

/* Đề xuất mua hàng canh ngang với Báo cáo phân tích (cùng BAO_CAO_Y), bên trái */
const NODE_DE_XUAT = { id: 'de-xuat-mua-hang', label: 'Đề xuất mua hàng', Icon: FileInput, x: AREA_PAD }

/* Bố cục: Đường ngang chính (backbone) ở giữa; nút trên nối xuống, nút dưới nối lên */
const ROW1_Y = AREA_PAD
const BACKBONE_Y = AREA_PAD + NODE_H + ROW_GAP / 2
const ROW2_Y = BACKBONE_Y + ROW_GAP / 2

const NODES_ROW1 = [
  { id: 'don-mua-hang', label: 'Đơn mua hàng', Icon: FileText, x: AREA_PAD + SHIFT },
  { id: 'nhan-hang', label: 'Nhận hàng hóa', label2: 'dịch vụ', Icon: Package, x: AREA_PAD + SHIFT + (NODE_W + COL_GAP) },
  { id: 'tra-lai-hang', label: 'Trả lại hàng mua', Icon: RotateCcw, x: AREA_PAD + SHIFT + 2 * (NODE_W + COL_GAP) },
  { id: 'tra-tien-ncc', label: 'Trả tiền', label2: 'Nhà cung cấp', Icon: CreditCard, x: AREA_PAD + SHIFT + 3 * (NODE_W + COL_GAP) },
]

/* Hàng dưới: Hợp đồng (dưới nút 1), Nhận HĐ (dưới nút 2), Giảm giá (giữa nút 3-4) */
const NODES_ROW2 = [
  { id: 'hop-dong-mua', label: 'Hợp đồng mua hàng', Icon: FileSignature, x: AREA_PAD + SHIFT },
  { id: 'nhan-hoa-don', label: 'Nhận hóa đơn', Icon: Receipt, x: AREA_PAD + SHIFT + (NODE_W + COL_GAP) },
  { id: 'giam-gia-mua', label: 'Giảm giá hàng mua', Icon: Percent, x: AREA_PAD + SHIFT + 2.5 * (NODE_W + COL_GAP) - NODE_W / 2 },
]

const BAO_CAO_X = AREA_PAD + SHIFT + 4 * (NODE_W + COL_GAP)
const BAO_CAO_Y = BACKBONE_Y - NODE_H / 2
/* Đề xuất mua hàng cùng hàng với Báo cáo phân tích */
const DE_XUAT_Y = BAO_CAO_Y

const DIAGRAM_W = BAO_CAO_X + NODE_W + AREA_PAD
const DIAGRAM_H = ROW2_Y + NODE_H + AREA_PAD

type DanhMucId = 'nha-cung-cap' | 'hang-hoa-dich-vu' | 'dieu-khoan-thanh-toan' | 'tien-ich'

const DANH_MUC: { id: DanhMucId; label: string; Icon: React.ElementType }[] = [
  { id: 'nha-cung-cap', label: 'Nhà cung cấp', Icon: Users },
  { id: 'hang-hoa-dich-vu', label: 'Hàng hóa, dịch vụ', Icon: ShoppingBag },
  { id: 'dieu-khoan-thanh-toan', label: 'DKTT', Icon: FileCheck },
  { id: 'tien-ich', label: 'Tiện ích', Icon: Wrench },
]

export function QuyTrinhMuaHang({
  onChonNhaCungCap,
  onChonHangHoaDichVu,
  onChonDieuKhoanThanhToan,
  onChonTienIch,
  onChonTab,
}: {
  onChonNhaCungCap: () => void
  onChonHangHoaDichVu: () => void
  onChonDieuKhoanThanhToan: () => void
  onChonTienIch: () => void
  onChonTab?: (tabId: string) => void
}) {
  const [hoverNode, setHoverNode] = useState<string | null>(null)

  const handleClickNode = (nodeId: string) => {
    const tabMap: Record<string, string> = {
      'de-xuat-mua-hang': 'de-xuat-mua-hang',
      'don-mua-hang': 'don-mua-hang',
      'nhan-hang': 'nhan-hang',
      'tra-lai-hang': 'tra-lai-hang',
      'tra-tien-ncc': 'tra-tien-ncc',
      'hop-dong-mua': 'hop-dong-mua',
      'nhan-hoa-don': 'nhan-hoa-don',
      'giam-gia-mua': 'giam-gia-mua',
      'bao-cao': 'bao-cao-phan-tich',
    }
    const tabId = tabMap[nodeId]
    if (tabId && onChonTab) onChonTab(tabId)
  }

  const nodeStyle = (isHover: boolean): React.CSSProperties => ({
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 8px',
    width: NODE_W,
    height: NODE_H,
    background: isHover ? DARK.hover : DARK.panel,
    border: `1px solid ${isHover ? DARK.text : DARK.border}`,
    borderRadius: 6,
    boxSizing: 'border-box',
    cursor: 'pointer',
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
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Vùng Nghiệp vụ mua hàng */}
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
            Nghiệp vụ mua hàng
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
              <svg
                width={DIAGRAM_W}
                height={DIAGRAM_H}
                style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
              >
                <defs>
                  <marker id="arrow-mh-right" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L8,4 L0,8 Z" fill={DARK.connector} />
                  </marker>
                </defs>
                {/* Đường cam góc vuông ngược: cạnh trên Đề xuất → dọc xuống, rồi ngang sang cạnh trái Đơn mua hàng */}
                <path
                  d={`M ${AREA_PAD + NODE_W / 2} ${DE_XUAT_Y} L ${AREA_PAD + NODE_W / 2} ${ROW1_Y + NODE_H / 2} L ${AREA_PAD + SHIFT} ${ROW1_Y + NODE_H / 2}`}
                  fill="none"
                  stroke={DARK.connectorCam}
                  strokeWidth={2}
                />
                {/* Đường cam góc vuông ngược: cạnh dưới Đề xuất → dọc lên, rồi ngang sang cạnh trái Hợp đồng mua hàng */}
                <path
                  d={`M ${AREA_PAD + NODE_W / 2} ${DE_XUAT_Y + NODE_H} L ${AREA_PAD + NODE_W / 2} ${ROW2_Y + NODE_H / 2} L ${AREA_PAD + SHIFT} ${ROW2_Y + NODE_H / 2}`}
                  fill="none"
                  stroke={DARK.connectorCam}
                  strokeWidth={2}
                />
                {/* === Đường ngang chính (backbone) - trục luồng từ trái sang phải */}
                <line
                  x1={AREA_PAD + SHIFT + NODE_W / 2}
                  y1={BACKBONE_Y}
                  x2={AREA_PAD + SHIFT + 4 * (NODE_W + COL_GAP) - COL_GAP / 2}
                  y2={BACKBONE_Y}
                  stroke={DARK.connector}
                  strokeWidth={1.5}
                />
                {/* Đường dọc từ 4 nút TRÊN xuống backbone */}
                {NODES_ROW1.map((n, i) => {
                  const cx = n.x + NODE_W / 2
                  return (
                    <line
                      key={`v-top-${i}`}
                      x1={cx}
                      y1={ROW1_Y + NODE_H}
                      x2={cx}
                      y2={BACKBONE_Y}
                      stroke={DARK.connector}
                      strokeWidth={1.5}
                    />
                  )
                })}
                {/* Đường dọc từ 3 nút DƯỚI lên backbone */}
                {NODES_ROW2.map((n, i) => {
                  const cx = n.x + NODE_W / 2
                  return (
                    <line
                      key={`v-bot-${i}`}
                      x1={cx}
                      y1={ROW2_Y}
                      x2={cx}
                      y2={BACKBONE_Y}
                      stroke={DARK.connector}
                      strokeWidth={1.5}
                    />
                  )
                })}
                {/* Mũi tên từ backbone sang Báo cáo phân tích */}
                <line
                  x1={AREA_PAD + SHIFT + 4 * (NODE_W + COL_GAP) - COL_GAP / 2}
                  y1={BACKBONE_Y}
                  x2={BAO_CAO_X - 4}
                  y2={BACKBONE_Y}
                  stroke={DARK.connector}
                  strokeWidth={1.5}
                  markerEnd="url(#arrow-mh-right)"
                />
              </svg>
              <button
                type="button"
                style={{ ...nodeStyle(hoverNode === NODE_DE_XUAT.id), left: NODE_DE_XUAT.x, top: DE_XUAT_Y, height: 90 }}
                onMouseEnter={() => setHoverNode(NODE_DE_XUAT.id)}
                onMouseLeave={() => setHoverNode(null)}
                onClick={() => handleClickNode(NODE_DE_XUAT.id)}
                title={`Mở: ${NODE_DE_XUAT.label}`}
              >
                <NODE_DE_XUAT.Icon size={20} color={DARK.textLight} style={{ marginBottom: 4, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: DARK.text, textAlign: 'center', lineHeight: 1.3, width: '100%' }}>
                  {NODE_DE_XUAT.label}
                </span>
              </button>
              {NODES_ROW1.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  style={{ ...nodeStyle(hoverNode === n.id), left: n.x, top: ROW1_Y }}
                  onMouseEnter={() => setHoverNode(n.id)}
                  onMouseLeave={() => setHoverNode(null)}
                  onClick={() => handleClickNode(n.id)}
                  title={`Mở: ${n.label}`}
                >
                  <n.Icon size={20} color={DARK.textLight} style={{ marginBottom: 4, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: DARK.text, textAlign: 'center', lineHeight: 1.3, width: '100%' }}>
                    {n.label}
                    {n.label2 && (
                      <>
                        <br />
                        {n.label2}
                      </>
                    )}
                  </span>
                </button>
              ))}
              {NODES_ROW2.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  style={{ ...nodeStyle(hoverNode === n.id), left: n.x, top: ROW2_Y }}
                  onMouseEnter={() => setHoverNode(n.id)}
                  onMouseLeave={() => setHoverNode(null)}
                  onClick={() => handleClickNode(n.id)}
                  title={`Mở: ${n.label}`}
                >
                  <n.Icon size={20} color={DARK.textLight} style={{ marginBottom: 4, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: DARK.text, textAlign: 'center', lineHeight: 1.3, width: '100%' }}>
                    {n.label}
                  </span>
                </button>
              ))}
              <button
                type="button"
                style={{ ...nodeStyle(hoverNode === 'bao-cao'), left: BAO_CAO_X, top: BAO_CAO_Y, height: 90 }}
                onMouseEnter={() => setHoverNode('bao-cao')}
                onMouseLeave={() => setHoverNode(null)}
                onClick={() => handleClickNode('bao-cao')}
                title="Mở: Báo cáo phân tích"
              >
                <BarChart3 size={22} color={DARK.textLight} style={{ marginBottom: 4, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: DARK.text, textAlign: 'center', lineHeight: 1.3 }}>
                  Báo cáo phân tích
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Báo cáo */}
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

      {/* Thanh danh mục */}
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
        {DANH_MUC.map((dm) => {
          const onClick =
            dm.id === 'nha-cung-cap'
              ? onChonNhaCungCap
              : dm.id === 'hang-hoa-dich-vu'
                ? onChonHangHoaDichVu
                : dm.id === 'dieu-khoan-thanh-toan'
                  ? onChonDieuKhoanThanhToan
                  : onChonTienIch
          const Icon = dm.Icon
          return (
            <button
              key={dm.id}
              type="button"
              onClick={onClick}
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
              <Icon size={22} color={DARK.textLight} style={{ marginBottom: 2 }} />
              <span style={{ textAlign: 'center' }}>{dm.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
