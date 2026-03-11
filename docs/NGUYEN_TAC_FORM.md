# Nguyên tắc form — Nút footer và điều khiển chuẩn

Tài liệu này mô tả các thiết lập chuẩn cho form/modal trong HTQL_550, dùng làm reference khi tạo hoặc chỉnh form mới.

---

## 1. Ba nút footer (Hủy bỏ | Lưu | Lưu và tiếp tục)

**Chuẩn:** Theo form **Thêm vật tư hàng hóa** (phân hệ Kho) — `VatTuHangHoaForm.tsx`.

### 1.1. Định nghĩa dùng chung

- **File:** `src/constants/formFooterButtons.ts`
- **Export:**
  - `formFooterButtonCancel` — nút Hủy bỏ
  - `formFooterButtonSave` — nút Lưu (hoặc Cất)
  - `formFooterButtonSaveAndAdd` — nút Lưu và tiếp tục (hoặc Cất & Thêm)

### 1.2. Style (không đổi)

- **Chung:** `padding: 4px 14px`, `fontSize: 11`, `fontFamily: 'Tahoma', Arial, sans-serif`, `border: 1px solid var(--border)`, `borderRadius: 0`, `fontWeight: 'bold'`, `cursor: 'pointer'`
- **Hủy bỏ:** `background: var(--bg-tab)`, `color: var(--text-primary)`
- **Lưu:** `background: var(--accent)`, `color: '#0d0d0d'`
- **Lưu và tiếp tục:** `background: var(--bg-tab)`, `color: var(--text-primary)` (giống Hủy bỏ)

### 1.3. Hiển thị

- **Chỉ chữ, không icon** trên ba nút footer.
- **Nhãn thống nhất:** luôn dùng **"Hủy bỏ"**, **"Lưu"**, **"Lưu và tiếp tục"** (không dùng "Cất", "Cất & Thêm", "Đồng ý", "Đồng ý và thêm" trên nút).
- **Thứ tự:** Hủy bỏ → Lưu → Lưu và tiếp tục.
- **Khoảng cách giữa nút:** `gap: 6` trên container (ví dụ `style={{ display: 'flex', gap: 6 }}`).

### 1.4. Cách dùng trong form mới

```tsx
import { formFooterButtonCancel, formFooterButtonSave, formFooterButtonSaveAndAdd } from '../../constants/formFooterButtons'

// Trong JSX footer:
<div style={{ display: 'flex', gap: 6 }}>
  <button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>
  <button type="button" style={formFooterButtonSave} onClick={handleLuu}>Lưu</button>
  {mode === 'add' && (
    <button type="button" style={formFooterButtonSaveAndAdd} onClick={handleLuuVaThem}>Lưu và tiếp tục</button>
  )}
</div>
```

Form đã áp dụng: `VatTuHangHoaForm`, `NhaCungCap` (modal), `ThemDieuKhoanThanhToanModal`, `DonViTinh` (modal), `ThemDonViTinhModal`, `ThemNhomVTHHModal`, `ThemKhoModal`, `ThemNhomKhNccModal`.

---

## 2. Ô lookup (dropdown + nút Thêm) — giống ĐVT chính / Nhóm KH, NCC

**Chuẩn:** Ô có dropdown và nút "+" giống **ĐVT chính** (form Vật tư hàng hóa) và **Nhóm KH, NCC** (form Nhà cung cấp).

### 2.1. Định nghĩa dùng chung

- **File:** `src/constants/lookupControlStyles.ts`
- **Export:**
  - `LOOKUP_CONTROL_HEIGHT` = 24
  - `LOOKUP_CHEVRON_WIDTH` = 22
  - `lookupInputWithChevronStyle` — ô input/select có chevron bên trong (height 24, paddingRight 26, boxSizing border-box)
  - `lookupChevronOverlayStyle` — vùng chevron trong ô (nền `var(--accent)`, chữ #0d0d0d, width 22)
  - `lookupActionButtonStyle` — nút dropdown hoặc nút "+" (24×24, nền accent, chữ #0d0d0d)

### 2.2. Cách dùng

- Ô **readOnly** + chevron **bên trong ô** (overlay bên phải) + nút **+** bên cạnh; chiều cao ô và nút đều 24px.
- Khi thêm form mới có ô "chọn từ danh sách + thêm mới", import từ `lookupControlStyles` và dùng các style trên để đồng bộ.

---

## 3. Ô số không spinner (nút tăng/giảm)

- **Class CSS:** `htql-no-spinner` (định nghĩa trong `src/styles/global.css`).
- Gắn cho `input[type="number"]` khi không muốn hiển thị nút tăng/giảm mặc định của trình duyệt.

---

*Cập nhật theo phiên làm việc 09/03/2025 — đồng bộ nút footer và lookup theo form Vật tư hàng hóa.*
