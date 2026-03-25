import { useState } from 'react'
import {
  BookOpen,
  DollarSign,
  Wallet,
  Landmark,
  FileText,
  ShoppingCart,
  Store,
  FileCheck,
  Percent,
  Warehouse,
  Wrench,
  Car,
  Banknote,
  Calculator,
  FileSignature,
  LucideIcon,
} from 'lucide-react'
import { useAppOptional } from '../../context/appContext'
import type { ModuleId } from '../../config/sidebarConfig'

const CONNECTOR_COLOR = '#d97706'
const CONNECTOR_HIGHLIGHT = '#f59e0b'

interface DiagramNode {
  id: string
  label: string
  Icon: LucideIcon
  moduleId?: ModuleId
  summary?: string | number
}

const NODES: DiagramNode[] = [
  { id: 'ngan-sach', label: 'Ngân sách', Icon: DollarSign, moduleId: 'tong-hop', summary: 0 },
  { id: 'quy', label: 'Quỹ', Icon: Wallet, moduleId: 'quy', summary: 0 },
  { id: 'ngan-hang', label: 'Ngân hàng', Icon: Landmark, moduleId: 'ngan-hang', summary: 0 },
  { id: 'khe-uoc-vay', label: 'Khế ước vay', Icon: FileText, summary: 0 },
  { id: 'mua-hang', label: 'Mua hàng', Icon: ShoppingCart, moduleId: 'mua-hang', summary: 1 },
  { id: 'ban-hang', label: 'Bán hàng', Icon: Store, moduleId: 'ban-hang', summary: 2 },
  { id: 'hoa-don', label: 'Hóa đơn', Icon: FileCheck, moduleId: 'hoa-don-dien-tu', summary: 5 },
  { id: 'thue', label: 'Thuế', Icon: Percent, moduleId: 'thue', summary: 0 },
  { id: 'kho', label: 'Kho', Icon: Warehouse, moduleId: 'kho', summary: 12 },
  { id: 'ccdc', label: 'CCDC', Icon: Wrench, moduleId: 'cong-cu-dung-cu', summary: 0 },
  { id: 'tscd', label: 'TSCĐ', Icon: Car, moduleId: 'tai-san-co-dinh', summary: 0 },
  { id: 'tien-luong', label: 'Tiền lương', Icon: Banknote, moduleId: 'tien-luong', summary: 3 },
  { id: 'gia-thanh', label: 'Giá thành', Icon: Calculator, moduleId: 'gia-thanh', summary: 0 },
  { id: 'hop-dong', label: 'Hợp đồng', Icon: FileSignature, moduleId: 'hop-dong', summary: 1 },
]

const RADIUS = 200
const CENTER_SIZE = 88
const NODE_SIZE = 88

export function QuyTrinhNghiepVu() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const app = useAppOptional()

  const activeModuleId = app?.activeModuleId ?? null
  const openOrFocusTab = app?.openOrFocusTab

  const isNodeActive = (node: DiagramNode) =>
    node.moduleId != null && activeModuleId === node.moduleId
  const isNodeHovered = (node: DiagramNode) => hoveredId === node.id
  const isNodeHighlighted = (node: DiagramNode) => isNodeActive(node) || isNodeHovered(node)

  const handleNodeClick = (node: DiagramNode) => {
    if (node.moduleId && openOrFocusTab) openOrFocusTab(node.moduleId)
  }

  const containerSize = RADIUS * 2 + 240

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: containerSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: containerSize,
          height: containerSize,
          flexShrink: 0,
        }}
      >
        {/* Đường nối SVG: nét mảnh, màu #d97706, highlight khi hover */}
        <svg
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {NODES.map((node, i) => {
            const angle = (i / NODES.length) * 2 * Math.PI - Math.PI / 2
            const cx = containerSize / 2
            const cy = containerSize / 2
            const nodeX = cx + RADIUS * Math.cos(angle)
            const nodeY = cy + RADIUS * Math.sin(angle)
            const dx = nodeX - cx
            const dy = nodeY - cy
            const len = Math.sqrt(dx * dx + dy * dy)
            const ux = dx / len
            const uy = dy / len
            const startX = cx + ux * (CENTER_SIZE / 2 + 4)
            const startY = cy + uy * (CENTER_SIZE / 2 + 4)
            const endX = nodeX - ux * (NODE_SIZE / 2 + 4)
            const endY = nodeY - uy * (NODE_SIZE / 2 + 4)
            const highlighted = isNodeHighlighted(node)
            const strokeColor = highlighted ? CONNECTOR_HIGHLIGHT : CONNECTOR_COLOR
            const strokeWidth = highlighted ? 2.5 : 1.5
            const opacity = highlighted ? 1 : 0.85
            return (
              <line
                key={node.id}
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
            )
          })}
        </svg>

        {/* Center: TỔNG HỢP */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: CENTER_SIZE,
            height: CENTER_SIZE,
            marginLeft: -CENTER_SIZE / 2,
            marginTop: -CENTER_SIZE / 2,
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            border: '3px solid var(--accent)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 4px var(--border)',
            zIndex: 1,
          }}
        >
          <BookOpen size={36} color="var(--accent)" style={{ marginBottom: '2px' }} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Tổng hợp
          </span>
        </div>

        {/* Các nút vệ tinh */}
        {NODES.map((node, i) => {
          const angle = (i / NODES.length) * 2 * Math.PI - Math.PI / 2
          const cx = containerSize / 2
          const cy = containerSize / 2
          const x = cx + RADIUS * Math.cos(angle) - NODE_SIZE / 2
          const y = cy + RADIUS * Math.sin(angle) - NODE_SIZE / 2
          const { Icon } = node
          const highlighted = isNodeHighlighted(node)
          const clickable = !!node.moduleId && !!openOrFocusTab

          return (
            <div
              key={node.id}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleNodeClick(node)}
              onKeyDown={(e) => {
                if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  handleNodeClick(node)
                }
              }}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: NODE_SIZE,
                height: NODE_SIZE,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: highlighted ? 'var(--bg-tab-active)' : 'var(--bg-secondary)',
                border: highlighted ? '2px solid var(--connector-highlight)' : '2px solid var(--border-strong)',
                borderRadius: '12px',
                padding: '6px',
                boxShadow: highlighted ? '0 0 12px rgba(245, 158, 11, 0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
                cursor: clickable ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                zIndex: 2,
              }}
            >
              <Icon
                size={32}
                color={highlighted ? CONNECTOR_HIGHLIGHT : 'var(--accent)'}
                style={{ marginBottom: '4px', flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {node.label}
              </span>
              {node.summary != null && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--accent)',
                    marginTop: '2px',
                  }}
                >
                  {node.summary}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
