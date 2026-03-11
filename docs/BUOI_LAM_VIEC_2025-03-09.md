# Buổi làm việc — 09/03/2025

Tóm tắt các thay đổi trong phiên làm việc hôm nay (form Nhà cung cấp, Điều khoản thanh toán, kiểu chuẩn lookup).

---

## 1. Ô Điều khoản TT (Tổ chức & Cá nhân)

- **Dropdown + nút +** giống ô Nhóm KH, NCC / form thêm vật tư.
- Ô **readOnly**, nút **ChevronDown** nằm **trong ô** bên phải (nền accent), bấm vào ô hoặc mũi tên để mở danh sách điều khoản.
- **Nút +** bên cạnh: mở modal **Thêm Điều khoản thanh toán**.
- Danh sách điều khoản lưu `localStorage`, chọn dòng → gán mã điều khoản + số ngày được nợ vào form.

**File liên quan:** `src/modules/mua-hang/NhaCungCap.tsx`, `ThemDieuKhoanThanhToanModal.tsx`, `nhaCungCapApi.ts`.

---

## 2. Nút + và nút sổ xuống — chuẩn hệ thống (giống ĐVT chính)

- **Định nghĩa dùng chung** trong `src/constants/lookupControlStyles.ts`:
  - `LOOKUP_CONTROL_HEIGHT` = 24
  - `LOOKUP_CHEVRON_WIDTH` = 22
  - `lookupInputWithChevronStyle` — ô input có chevron bên trong (height 24, paddingRight 26)
  - `lookupChevronOverlayStyle` — vùng chevron (nền accent, chữ #0d0d0d)
  - `lookupActionButtonStyle` — nút dropdown / nút + (24×24, nền accent)
- **Điều khoản TT:** ô + chevron trong ô + nút + dùng các style trên; chiều cao 24px.
- **NV mua hàng (Tổ chức & Cá nhân):** ô nhập height 24, nút sổ xuống và nút + dùng `lookupActionButtonStyle`, icon Plus/ChevronDown màu #0d0d0d.

Mục đích: sau này chỉ cần import từ `constants/lookupControlStyles` để đồng bộ toàn hệ thống.

---

## 3. Form Thêm Điều khoản thanh toán — chỉnh sửa

### 3.1. Mã — khóa, lấy từ Tên

- Ô **Mã** read-only (nền xám, cursor not-allowed).
- Mã = **chữ cái đầu của ô Tên** (viết hoa). Ví dụ: Tên "Thanh toán ngay" → Mã "T".
- Khi lưu: `ma = ten.trim().charAt(0).toUpperCase()`.
- Kiểm tra trùng: chỉ báo lỗi khi trùng cả cặp (ma, ten).

### 3.2. Số ngày được nợ → Số ngày công nợ

- Đổi nhãn thành **"Số ngày công nợ"**.
- **Bỏ nút tăng/giảm** trong ô số: dùng class `htql-no-spinner`; trong `src/styles/global.css` thêm rule ẩn spinner cho `input[type="number"]`.

### 3.3. Bỏ hai trường

- **Thời hạn hưởng chiết khấu** — xóa hẳn.
- **Tỷ lệ chiết khấu** — xóa hẳn.

### 3.4. Thêm trường mới

- **Số công nợ tối đa** — ô số, mặc định 0, không spinner (cùng class `htql-no-spinner`).

### 3.5. Type & API

- **`DieuKhoanThanhToanItem`** (trong `nhaCungCapApi.ts`):
  - Xóa: `thoi_han_chiet_khau`, `ty_le_chiet_khau`.
  - Thêm: `so_cong_no_toi_da: number`.
- Cập nhật `DKTT_MAU`, `loadDieuKhoanThanhToan()` để đọc/ghi đúng cấu trúc mới (dữ liệu cũ không có `so_cong_no_toi_da` thì mặc định 0).

**File đã sửa:**  
`src/modules/mua-hang/ThemDieuKhoanThanhToanModal.tsx`, `nhaCungCapApi.ts`, `src/styles/global.css`.

---

## 4. Lưu ý (chưa sửa trong phiên này)

- **NhaCungCap.tsx** vẫn còn lỗi build:
  - Biến `formToChuc` khai báo nhưng không dùng.
  - Một số chỗ gán object có `loai_ncc: string` cho `FormState` (cần `loai_ncc: LoaiNhaCungCap`).
- Có thể sau này: khi chọn điều khoản TT trong form NCC, tự điền **Số nợ tối đa** từ `so_cong_no_toi_da` của điều khoản đã chọn.

---

## 5. Danh sách file thay đổi

| File | Nội dung |
|------|----------|
| `src/constants/lookupControlStyles.ts` | Mới — định nghĩa style lookup/ĐVT chính dùng chung |
| `src/modules/mua-hang/NhaCungCap.tsx` | Điều khoản TT + NV mua hàng dùng lookup styles; import lookupControlStyles |
| `src/modules/mua-hang/ThemDieuKhoanThanhToanModal.tsx` | Mã khóa/từ Tên; Số ngày công nợ; bỏ 2 trường; thêm Số công nợ tối đa; ô số dùng htql-no-spinner |
| `src/modules/mua-hang/nhaCungCapApi.ts` | Cập nhật `DieuKhoanThanhToanItem`, `DKTT_MAU`, `loadDieuKhoanThanhToan` |
| `src/styles/global.css` | Thêm `.htql-no-spinner` cho input number (ẩn spinner) |

---

*Tạo lúc kết thúc phiên 09/03/2025.*
