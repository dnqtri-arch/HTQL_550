/**
 * Quy trình Nghiệp vụ Quỹ (YC59/YC60, YC62 khôi phục line backbone):
 * - Backbone ngang liền mạch từ cột 0 → cột Sổ, mũi tên ở cuối backbone.
 * - Cột 0: Thu tiền | Chi tiền; cột Sổ: hai đoạn dọc nối backbone với hai nút Sổ.
 * - Nhánh dưới trước Thu/chi: Chuyển tiền — line đứng lên backbone.
 * - Kiểm kê quỹ: nhánh xuống giữa Thu/chi và cột Sổ.
 */

import { useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  ClipboardCheck,
  BookMarked,
  Building2,
  Users,
  Briefcase,
  UserCog,
  TableProperties,
  Landmark,
  Wallet,
} from 'lucide-react'
import type { ModuleId } from '../../config/sidebarConfig'
import { useAppOptional } from '../../context/appContext'

const NWID = 110
const NHID = 90
const COLG = 28
const ROWG = 54
const PAD = 44
/** Khoảng thêm giữa Thu/chi tiền và vùng Kiểm kê / Sổ — đẩy Sổ xa Kiểm kê (YC60). */
const EXTRA_GAP_TRUOC_SO = 88

const ROW1Y = PAD
const BKBY = ROW1Y + NHID + ROWG / 2
const ROW2Y = BKBY + ROWG / 2

const COLSTART = PAD + 8
const COLSTEP = NWID + COLG

const COL0 = COLSTART
const COL1 = COL0 + NWID + COLSTEP
/** Cột Sổ chi tiết / Sổ NH — lệch phải thêm EXTRA_GAP_TRUOC_SO */
const COL_SO = COL1 + NWID + COLSTEP + EXTRA_GAP_TRUOC_SO

const cx = (leftEdge: number) => leftEdge + NWID / 2
const cx0 = cx(COL0)
const cx1 = cx(COL1)
const cxSo = cx(COL_SO)

/** Trung điểm nhánh Chuyển tiền (dưới, trước Thu/chi) — line đứng lên backbone */
const PRE_CX = (cx0 + cx1) / 2
const PRE_LEFT = PRE_CX - NWID / 2

/** Kiểm kê: giữa Thu/chi và cột Sổ */
const KIN_CX = (cx1 + cxSo) / 2
const KIN_LEFT = KIN_CX - NWID / 2

const THUCHI_TOP = BKBY - NHID / 2

const DIAGRAMW = COL_SO + NWID + PAD
const DIAGRAMH = ROW2Y + NHID + PAD

const CLR = {
  amber: '#d97706',
  blue: '#3b82f6',
  green: '#16a34a',
  red: '#dc2626',
  purple: '#7c3aed',
  gray: '#6b7280',
  orange: '#ea580c',
  teal: '#0d9488',
}

const BAOCAO = [
  'Sổ kế toán chi tiết quỹ tiền mặt',
  'Dự báo thu, chi công nợ',
  'Dòng tiền',
  'Dòng tiền',
  'Bảng kê số dư tiền theo ngày',
]

export function QuyTrinhTaiChinh() {
  const app = useAppOptional()
  const [hovered, setHovered] = useState<string | null>(null)
  const [hovBaoCao, setHovBaoCao] = useState<string | null>(null)

  const nav = (id: ModuleId) => () => app?.openOrFocusTab(id)

  const T = {
    bg: 'var(--bg-secondary)',
    panel: 'var(--bg-tab)',
    text: 'var(--text-primary)',
    muted: 'var(--text-secondary)',
    border: 'var(--border)',
    borderSt: 'var(--border-strong)',
    hover: 'var(--bg-tab-active)',
    conn: CLR.amber,
  }

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
    z = 1,
  ) => {
    const isHov = hovered === id
    return (
      <button
        key={id}
        type="button"
        title={label}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          background: isHov ? T.hover : T.panel,
          border: `1.5px solid ${isHov ? T.conn : T.border}`,
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          cursor: 'pointer',
          transition: 'background 0.13s, border-color 0.13s, box-shadow 0.13s',
          boxShadow: isHov ? '0 2px 12px rgba(217,119,6,0.22)' : '0 1px 3px rgba(0,0,0,0.07)',
          userSelect: 'none',
          zIndex: z,
          padding: '8px 4px',
          fontFamily: 'inherit',
        }}
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
        onClick={onClick}
      >
        <Icon
          size={24}
          color={isHov ? T.conn : iconColor}
          strokeWidth={1.6}
          style={{ flexShrink: 0 }}
        />
        <div style={{ textAlign: 'center', lineHeight: 1.35 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: isHov ? T.conn : T.text }}>{label}</div>
          {label2 && (
            <div style={{ fontSize: 9.5, fontWeight: 600, color: T.muted, marginTop: 1 }}>{label2}</div>
          )}
        </div>
      </button>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 10,
        background: T.bg,
        overflow: 'auto',
        minHeight: 0,
      }}
    >
      <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            background: T.panel,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '6px 12px',
              background: T.bg,
              borderBottom: `1px solid ${T.border}`,
              fontSize: 11,
              fontWeight: 700,
              color: T.text,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Nghiệp vụ quỹ
          </div>

          <div
            style={{
              flex: 1,
              position: 'relative',
              minHeight: DIAGRAMH,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: T.panel,
            }}
          >
            <div style={{ position: 'relative', width: DIAGRAMW, height: DIAGRAMH }}>
              <svg
                width={DIAGRAMW}
                height={DIAGRAMH}
                style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 0 }}
              >
                <defs>
                  <marker
                    id="arrowTcEndYc60"
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="4"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                  >
                    <path d="M0,0 L8,4 L0,8 Z" fill={CLR.amber} />
                  </marker>
                </defs>

                {/* Backbone ngang: một đoạn liền đến cột Sổ, mũi tên ở cuối */}
                <line
                  x1={cx0}
                  y1={BKBY}
                  x2={cxSo}
                  y2={BKBY}
                  stroke={T.conn}
                  strokeWidth={1.5}
                  markerEnd="url(#arrowTcEndYc60)"
                />

                {/* Cột 0: Thu — backbone — Chi */}
                <line x1={cx0} y1={ROW1Y + NHID} x2={cx0} y2={BKBY} stroke={T.conn} strokeWidth={1.5} />
                <line x1={cx0} y1={BKBY} x2={cx0} y2={ROW2Y} stroke={T.conn} strokeWidth={1.5} />

                {/* Nhánh Chuyển tiền: từ dòng dưới lên backbone (trước Thu/chi) */}
                <line x1={PRE_CX} y1={ROW2Y} x2={PRE_CX} y2={BKBY} stroke={T.conn} strokeWidth={1.5} />

                {/* Nhánh Kiểm kê: từ backbone xuống */}
                <line x1={KIN_CX} y1={BKBY} x2={KIN_CX} y2={ROW2Y} stroke={T.conn} strokeWidth={1.5} />

                {/* Cột Sổ: hai đoạn dọc nối backbone với hai nút */}
                <line x1={cxSo} y1={ROW1Y + NHID} x2={cxSo} y2={BKBY} stroke={T.conn} strokeWidth={1.5} />
                <line x1={cxSo} y1={BKBY} x2={cxSo} y2={ROW2Y} stroke={T.conn} strokeWidth={1.5} />
              </svg>

              {renderNode('thutien', 'Thu tiền', undefined, TrendingUp, CLR.green, COL0, ROW1Y, nav('thuTien'))}
              {renderNode('chitien', 'Chi tiền', undefined, TrendingDown, CLR.red, COL0, ROW2Y, nav('chiTien'))}
              {renderNode('quy_dm', 'Chuyển tiền', undefined, Wallet, CLR.gray, PRE_LEFT, ROW2Y, nav('quy'))}
              {renderNode(
                'thuchitien',
                'Thu/chi tiền',
                undefined,
                ArrowLeftRight,
                CLR.blue,
                COL1,
                THUCHI_TOP,
                nav('thuChiTien'),
                NWID,
                NHID,
                2,
              )}
              {renderNode(
                'kiemkequy',
                'Kiểm kê quỹ',
                undefined,
                ClipboardCheck,
                CLR.purple,
                KIN_LEFT,
                ROW2Y,
                nav('kiemKeQuy'),
              )}
              {renderNode(
                'sochitiet',
                'Sổ chi tiết',
                'tiền mặt',
                BookMarked,
                CLR.amber,
                COL_SO,
                ROW1Y,
                nav('soChiTietTienMat'),
              )}
              {renderNode(
                'sotienguinh',
                'Sổ chi tiết tài khoản',
                'ngân hàng',
                Building2,
                CLR.teal,
                COL_SO,
                ROW2Y,
                nav('soTienGuiNganHang'),
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            width: 200,
            flexShrink: 0,
            background: T.panel,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '6px 10px',
              background: T.bg,
              borderBottom: `1px solid ${T.border}`,
              fontSize: 11,
              fontWeight: 700,
              color: T.text,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Báo cáo
          </div>
          <ul
            style={{
              listStyle: 'disc',
              paddingLeft: 18,
              margin: '8px 0',
              flex: 1,
              fontSize: 10,
              color: T.muted,
              lineHeight: 1.7,
            }}
          >
            {BAOCAO.map((ten) => (
              <li
                key={ten}
                style={{
                  marginBottom: 4,
                  cursor: 'pointer',
                  color: hovBaoCao === ten ? T.conn : T.muted,
                  transition: 'color 0.1s',
                }}
                onMouseEnter={() => setHovBaoCao(ten)}
                onMouseLeave={() => setHovBaoCao(null)}
                onClick={nav('baoCaoTaiChinh')}
              >
                {ten}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={nav('baoCaoTaiChinh')}
            style={{
              margin: '8px 10px 12px',
              padding: '6px 10px',
              fontSize: 10,
              background: T.conn,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            Tất cả báo cáo
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '8px 10px',
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderTop: `2px solid ${T.borderSt}`,
          borderRadius: 8,
          flexWrap: 'wrap',
        }}
      >
        {[
          { id: 'khachHang' as ModuleId, label: 'Khách hàng', Icon: Users, color: CLR.blue },
          { id: 'nhaCungCap' as ModuleId, label: 'Nhà cung cấp', Icon: Briefcase, color: CLR.orange },
          { id: 'tienLuong' as ModuleId, label: 'Nhân viên', Icon: UserCog, color: CLR.green },
          { id: 'taiKhoanNganHang' as ModuleId, label: 'Tài khoản ngân hàng', Icon: Landmark, color: CLR.teal },
          { id: 'tyGiaXuatQuy' as ModuleId, label: 'Tính tỷ giá xuất quỹ', Icon: TableProperties, color: CLR.gray },
        ].map(({ id, label, Icon, color }) => (
          <button
            key={id}
            type="button"
            style={{
              flex: '1 1 140px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 8px',
              background: hovered === id ? T.hover : T.panel,
              border: `1px solid ${hovered === id ? T.conn : T.border}`,
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.13s, border-color 0.13s',
            }}
            onMouseEnter={() => setHovered(id)}
            onMouseLeave={() => setHovered(null)}
            onClick={nav(id)}
          >
            <Icon size={22} color={hovered === id ? T.conn : color} strokeWidth={1.5} style={{ marginBottom: 3 }} />
            <span style={{ fontSize: 10, color: hovered === id ? T.conn : T.text, textAlign: 'center' }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
