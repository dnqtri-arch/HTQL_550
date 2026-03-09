import {
  Search,
  FileText,
  Calendar,
} from 'lucide-react'

const headerWrap: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  borderBottom: '2px solid var(--border-strong)',
}

const menuRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 12px',
  flexWrap: 'wrap',
  gap: '6px',
}

const menuItems: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
}

const menuBtn: React.CSSProperties = {
  padding: '4px 10px',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: '12px',
  fontFamily: 'inherit',
}

const searchWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flex: '1',
  maxWidth: '360px',
  minWidth: '180px',
}

const searchInput: React.CSSProperties = {
  flex: 1,
  padding: '4px 8px 4px 28px',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  fontSize: '11px',
}

const iconBtn: React.CSSProperties = {
  padding: '4px 6px',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  borderRadius: '4px',
}

export function AppHeader() {
  const menuLabels = ['Tệp', 'Danh mục', 'Nghiệp vụ', 'Hệ thống', 'Tiện ích', 'Trợ giúp']

  return (
    <header style={headerWrap}>
      <div style={menuRow}>
        <div style={menuItems}>
          {menuLabels.map((label) => (
            <button key={label} type="button" className="htql-menu-btn" style={menuBtn}>
              {label}
            </button>
          ))}
        </div>
        <div style={searchWrap}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Nhập nội dung cần tìm kiếm (Ctrl+Q)"
              style={searchInput}
              aria-label="Tìm kiếm"
            />
          </div>
          <button type="button" className="htql-icon-btn" style={iconBtn} title="Báo cáo">
            <FileText size={16} />
          </button>
          <button type="button" className="htql-icon-btn" style={iconBtn} title="Tìm chứng từ">
            <FileText size={16} />
          </button>
          <button type="button" className="htql-icon-btn" style={iconBtn} title="Ngày hạch toán">
            <Calendar size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
