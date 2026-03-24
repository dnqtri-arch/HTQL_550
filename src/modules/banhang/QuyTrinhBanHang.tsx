/**
 * Quy trình nghiệp vụ Bán hàng — cấu trúc "xương cá" chuẩn MISA.
 *
 * Backbone ngang duy nhất chạy từ trái sang phải.
 * Các khối nối vào backbone bằng đường kẻ dọc ĐƠN GIẢN, KHÔNG có đầu mũi tên.
 * DUY NHẤT 1 mũi tên (nét đứt) ở cuối chỉ vào "Báo cáo phân tích".
 *
 * Cặp vị trí (trên/dưới backbone):
 *   Col 0: Đơn hàng bán (trên)   | Hợp đồng HD nguyên tắc (dưới)
 *   Col 1: Ghi nhận doanh thu (trên) | Xuất hóa đơn (dưới)
 *   Col 2: Trả lại hàng bán (trên)  | Giảm giá hàng bán (dưới)
 *   Col 3: Thu tiền khách hàng (trên) [không có cặp dưới]
 *   Cuối:  → Báo cáo phân tích
 *
 * Tuân thủ htql-core-standards.mdc: viết liền, zIndex 4000, Toast 3200ms.
 */

import { useState } from 'react'
import {
  FileText,
  FileSignature,
  ShoppingCart,
  Receipt,
  RotateCcw,
  CreditCard,
  BarChart3,
  Package,
  Percent,
  Users,
  Wrench,
} from 'lucide-react'

// ─── Hằng bố cục ────────────────────────────────────────────────────────────
const NWID = 110   // chiều rộng node
const NHID = 90    // chiều cao node
const BGWID = 100  // Báo giá nhỏ hơn chút
const COLG = 28    // khoảng cách giữa các cột
const ROWG = 54    // khoảng cách row trên/dưới vs backbone
const PAD = 44     // padding ngoài

// Y-coordinates
const ROW1Y = PAD                              // hàng trên backbone
const BKBY = ROW1Y + NHID + ROWG / 2          // backbone y (trục ngang chính)
const ROW2Y = BKBY + ROWG / 2                 // hàng dưới backbone

// Báo giá: căn giữa trên backbone, bên trái nhất
const BGX = PAD
const BGY = BKBY - NHID / 2

// 4 cột paired bắt đầu sau Báo giá
const COLSTART = BGX + BGWID + 48
const COLSTEP = NWID + COLG
const COLX = [0, 1, 2, 3].map((i) => COLSTART + i * COLSTEP)

// Giảm giá hàng bán: trung điểm cột 2–3 (không trùng với Trả lại hàng bán)
const GGXC = Math.round((COLX[2] + COLX[3]) / 2)  // left edge của node Giảm giá
const GGcx = GGXC + NWID / 2                        // center x của Giảm giá

// Báo cáo phân tích: cuối backbone, căn giữa
const BCPX = COLX[3] + NWID + 48
const BCPY = BKBY - NHID / 2

// Canvas dimensions
const DIAGRAMW = BCPX + NWID + PAD
const DIAGRAMH = ROW2Y + NHID + PAD

// ─── Màu icon ───────────────────────────────────────────────────────────────
const CLR = {
  amber:  '#d97706',
  blue:   '#3b82f6',
  green:  '#16a34a',
  red:    '#dc2626',
  purple: '#7c3aed',
  gray:   '#6b7280',
  orange: '#ea580c',
}

// ─── Badge (mock — đơn chưa xử lý) ─────────────────────────────────────────
const BADGES: Record<string, number> = {
  donhangban:      3,
  ghinhanhdt:      2,
  thutienkhachhang: 5,
}

// ─── Danh sách báo cáo ──────────────────────────────────────────────────────
const BAOCAO = [
  'Tổng hợp bán hàng',
  'S16-DNN: Sổ chi tiết bán hàng',
  'Sổ chi tiết bán hàng',
  'Sổ chi tiết bán hàng theo mã quy cách',
  'Sổ nhật ký bán hàng',
]

interface QuyTrinhBanHangProps {
  onNavigate?: (tab: string) => void
}

export function QuyTrinhBanHang({ onNavigate }: QuyTrinhBanHangProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [hovBaoCao, setHovBaoCao] = useState<string | null>(null)

  const nav = (tab: string) => () => onNavigate?.(tab)

  // CSS variables shorthand
  const T = {
    bg:       'var(--bg-secondary)',
    panel:    'var(--bg-tab)',
    text:     'var(--text-primary)',
    muted:    'var(--text-secondary)',
    border:   'var(--border)',
    borderSt: 'var(--border-strong)',
    hover:    'var(--bg-tab-active)',
    conn:     CLR.amber,
  }

  // ─── renderNode ─────────────────────────────────────────────────────────
  const renderNode = (
    id: string,
    label: string,
    label2: string | undefined,
    Icon: React.ElementType,
    iconColor: string,
    x: number,
    y: number,
    onClick: () => void,
    w = NWID,
    h = NHID,
  ) => {
    const isHov = hovered === id
    const badge = BADGES[id]
    return (
      <button
        key={id}
        type="button"
        title={label}
        style={{
          position: 'absolute', left: x, top: y, width: w, height: h,
          background: isHov ? T.hover : T.panel,
          border: `1.5px solid ${isHov ? T.conn : T.border}`,
          borderRadius: 8,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 4, cursor: 'pointer',
          transition: 'background 0.13s, border-color 0.13s, box-shadow 0.13s',
          boxShadow: isHov ? `0 2px 12px rgba(217,119,6,0.22)` : '0 1px 3px rgba(0,0,0,0.07)',
          userSelect: 'none', zIndex: 1, padding: '8px 4px', fontFamily: 'inherit',
        }}
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
        onClick={onClick}
      >
        {/* Badge số */}
        {badge != null && badge > 0 && (
          <div style={{
            position: 'absolute', top: 4, right: 6,
            background: CLR.red, color: '#fff',
            borderRadius: 8, fontSize: 9, fontWeight: 700,
            padding: '1px 5px', lineHeight: 1.4, zIndex: 2,
          }}>
            {badge}
          </div>
        )}
        <Icon
          size={24}
          color={isHov ? T.conn : iconColor}
          strokeWidth={1.6}
          style={{ flexShrink: 0 }}
        />
        <div style={{ textAlign: 'center', lineHeight: 1.35 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: isHov ? T.conn : T.text }}>
            {label}
          </div>
          {label2 && (
            <div style={{ fontSize: 9.5, color: T.muted, marginTop: 1 }}>{label2}</div>
          )}
        </div>
      </button>
    )
  }

  // ─── Trung tâm X của mỗi cột ────────────────────────────────────────────
  const cx = (col: number) => COLX[col] + NWID / 2
  const bgCx = BGX + BGWID / 2

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', gap: 8,
      padding: 10, background: T.bg, overflow: 'auto', minHeight: 0,
    }}>
      {/* ── Hàng trên: sơ đồ nghiệp vụ + panel báo cáo ───────────────────── */}
      <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0 }}>

        {/* Panel nghiệp vụ chính */}
        <div style={{
          flex: 1, background: T.panel, border: `1px solid ${T.border}`,
          borderRadius: 8, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Tiêu đề panel */}
          <div style={{
            padding: '6px 12px', background: T.bg,
            borderBottom: `1px solid ${T.border}`,
            fontSize: 11, fontWeight: 700, color: T.text,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Nghiệp vụ bán hàng
          </div>

          {/* Canvas chứa sơ đồ */}
          <div style={{
            flex: 1, position: 'relative', minHeight: DIAGRAMH,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: T.panel,
          }}>
            <div style={{ position: 'relative', width: DIAGRAMW, height: DIAGRAMH }}>

              {/* ════════ SVG CONNECTORS ════════════════════════════════════ */}
              <svg
                width={DIAGRAMW}
                height={DIAGRAMH}
                style={{
                  position: 'absolute', left: 0, top: 0,
                  pointerEvents: 'none', zIndex: 0,
                }}
              >
                <defs>
                  {/* Mũi tên DUY NHẤT — chốt cuối trục backbone vào Báo cáo phân tích */}
                  <marker
                    id="arrowBHEnd"
                    markerWidth="8" markerHeight="8"
                    refX="7" refY="4"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                  >
                    <path d="M0,0 L8,4 L0,8 Z" fill={CLR.amber} />
                  </marker>
                </defs>

                {/* ── Trục backbone ngang: từ Báo giá → đâm thẳng vào Báo cáo phân tích ── */}
                <line
                  x1={BGX + BGWID}
                  y1={BKBY}
                  x2={BCPX}
                  y2={BKBY}
                  stroke={T.conn}
                  strokeWidth={1.5}
                  markerEnd="url(#arrowBHEnd)"
                />

                {/* ── Đường kẻ dọc: Báo giá lên/xuống backbone ───────────── */}
                {/* Báo giá nằm ngay trên backbone — kẻ dọc từ bottom của node xuống backbone */}
                <line
                  x1={bgCx} y1={BGY + NHID}
                  x2={bgCx} y2={BKBY}
                  stroke={T.conn} strokeWidth={1.5}
                />

                {/* ── 4 đường kẻ dọc: node ROW1 xuống backbone (không mũi tên) */}
                {COLX.map((_rx, i) => (
                  <line
                    key={`vtop${i}`}
                    x1={cx(i)} y1={ROW1Y + NHID}
                    x2={cx(i)} y2={BKBY}
                    stroke={T.conn} strokeWidth={1.5}
                  />
                ))}

                {/* ── Đường kẻ dọc: Col 0, 1 xuống backbone → ROW2 ────────── */}
                {[0, 1].map((i) => (
                  <line
                    key={`vbot${i}`}
                    x1={cx(i)} y1={BKBY}
                    x2={cx(i)} y2={ROW2Y}
                    stroke={T.conn} strokeWidth={1.5}
                  />
                ))}

                {/* ── Giảm giá hàng bán: vertical tại trung điểm col 2–3 ───── */}
                <line
                  x1={GGcx} y1={BKBY}
                  x2={GGcx} y2={ROW2Y}
                  stroke={T.conn} strokeWidth={1.5}
                />
              </svg>

              {/* ════════ NODES ═════════════════════════════════════════════ */}

              {/* Báo giá — căn giữa backbone bên trái */}
              {renderNode('baogia', 'Báo giá', undefined,
                FileText, CLR.amber,
                BGX, BGY, nav('baogia'), BGWID, NHID)}

              {/* ROW 1 — trên backbone */}
              {renderNode('donhangban', 'Đơn hàng bán', undefined,
                ShoppingCart, CLR.orange,
                COLX[0], ROW1Y, nav('donhangban'))}

              {renderNode('ghinhanhdt', 'Ghi nhận', 'doanh thu',
                Receipt, CLR.blue,
                COLX[1], ROW1Y, nav('hoadon'))}

              {renderNode('tralai', 'Trả lại hàng bán', undefined,
                RotateCcw, CLR.red,
                COLX[2], ROW1Y, nav('tralai'))}

              {renderNode('thutienkhachhang', 'Thu tiền', 'khách hàng',
                CreditCard, CLR.green,
                COLX[3], ROW1Y, nav('congno'))}

              {/* ROW 2 — dưới backbone (3 node, cặp với col 0, 1, 2) */}
              {renderNode('hopdong', 'Hợp đồng', 'HD nguyên tắc',
                FileSignature, CLR.purple,
                COLX[0], ROW2Y, nav('hopdong'))}

              {renderNode('xuathoadon', 'Xuất hóa đơn', undefined,
                FileText, CLR.blue,
                COLX[1], ROW2Y, nav('hoadon'))}

              {renderNode('giamgiahangban', 'Giảm giá hàng bán', undefined,
                Percent, CLR.gray,
                GGXC, ROW2Y, () => {})}

              {/* Báo cáo phân tích — cuối trục ngang */}
              {renderNode('baocaophanich', 'Báo cáo phân tích', undefined,
                BarChart3, CLR.amber,
                BCPX, BCPY, () => {}, NWID, NHID)}
            </div>
          </div>
        </div>

        {/* Panel báo cáo bên phải */}
        <div style={{
          width: 200, flexShrink: 0, background: T.panel,
          border: `1px solid ${T.border}`, borderRadius: 8,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '6px 10px', background: T.bg,
            borderBottom: `1px solid ${T.border}`,
            fontSize: 11, fontWeight: 700, color: T.text,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Báo cáo
          </div>
          <ul style={{
            listStyle: 'disc', paddingLeft: 18, margin: '8px 0',
            flex: 1, fontSize: 10, color: T.muted, lineHeight: 1.7,
          }}>
            {BAOCAO.map((ten) => (
              <li
                key={ten}
                style={{
                  marginBottom: 4, cursor: 'pointer',
                  color: hovBaoCao === ten ? T.conn : T.muted,
                  transition: 'color 0.1s',
                }}
                onMouseEnter={() => setHovBaoCao(ten)}
                onMouseLeave={() => setHovBaoCao(null)}
              >
                {ten}
              </li>
            ))}
          </ul>
          <button
            type="button"
            style={{
              margin: '8px 10px 12px',
              padding: '6px 10px', fontSize: 10,
              background: T.conn, color: '#fff',
              border: 'none', borderRadius: 6,
              cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            Tất cả báo cáo
          </button>
        </div>
      </div>

      {/* ── Hàng danh mục — tách biệt hoàn toàn, không có connector ──────── */}
      <div style={{
        display: 'flex', gap: 8, padding: '8px 10px',
        background: T.bg, border: `1px solid ${T.border}`,
        borderTop: `2px solid ${T.borderSt}`, borderRadius: 8,
      }}>
        {[
          { id: 'dmkhachhang',    label: 'Khách hàng',           Icon: Users,      color: CLR.blue },
          { id: 'dmvathh',        label: 'Sản phẩm, hàng hóa',   Icon: Package,    color: CLR.orange },
          { id: 'dmdieukhoanntt', label: 'Điều khoản thanh toán', Icon: CreditCard, color: CLR.green },
          { id: 'dmtienich',      label: 'Tiện ích',              Icon: Wrench,     color: CLR.gray },
        ].map(({ id, label, Icon, color }) => (
          <button
            key={id}
            type="button"
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '6px 8px',
              background: hovered === id ? T.hover : T.panel,
              border: `1px solid ${hovered === id ? T.conn : T.border}`,
              borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.13s, border-color 0.13s',
            }}
            onMouseEnter={() => setHovered(id)}
            onMouseLeave={() => setHovered(null)}
            onClick={nav(id.replace('dm', ''))}
          >
            <Icon
              size={22}
              color={hovered === id ? T.conn : color}
              strokeWidth={1.5}
              style={{ marginBottom: 3 }}
            />
            <span style={{
              fontSize: 10,
              color: hovered === id ? T.conn : T.text,
              textAlign: 'center',
            }}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
