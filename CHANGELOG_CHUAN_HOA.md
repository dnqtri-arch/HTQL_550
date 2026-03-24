# Báo cáo chuẩn hóa dự án HTQL_550

Ngày thực hiện: 2025-03-15

## Tổng quan

Đã rà soát và chuẩn hóa dự án theo quy tắc trong cursorrules: đồng bộ đường dẫn, việt hóa, chuẩn số thực, bảo mật.

---

## Danh sách file đã thay đổi và lý do

### 1. Đồng bộ đường dẫn (lưu trữ file nặng)

| File | Thay đổi |
|------|----------|
| `src/modules/kho/vatTuHangHoaApi.ts` | `VATTU_IMAGE_BASE`: `/ssd_2tb/HTQL_550/` → `/ssd_2t/htql_550/thietke/vattu/`. Sửa comment tài liệu. |
| `src/modules/ban-hang/index.tsx` | Ghi chú "File thiết kế lưu tại" từ `/ssd_2tb/HTQL_550/thietke/` → `/ssd_2t/htql_550/thietke/`. |
| `server/cau_hinh.py` | Mặc định `DUONG_DAN_VAT_TU`: dùng `PATH_SSD_2T` từ .env, fallback `/ssd_2t/htql_550/thietke/vattu/`. |
| `server/api_vat_tu.py` | Cập nhật comment: `/ssd_2tb/...` → `/ssd_2t/htql_550/...`. |
| `config_network.py` | `PATH_THIETKE`: `/ssd_2tb/HTQL_550/thietke/` → `/ssd_2t/htql_550/thietke/`. |
| `README.md` | Ghi chú đường dẫn thiết kế: `/ssd_2tb/HTQL_550/` → `/ssd_2t/htql_550/`. |

**Chuẩn:** Ổ SSD lưu tại `/ssd_2t/htql_550/`, backup tại `/hdd_4t/htql_550/` (đã có trong `tool/sever/.env.example`).

---

### 2. Việt hóa codebase (comments, console.log)

| File | Thay đổi |
|------|----------|
| `src/modules/ban-lam-viec/QuyTrinhNghiepVu.tsx` | Comment: "SVG Connectors - thin lines..." → "Đường nối SVG: nét mảnh...". "Satellite nodes" → "Các nút vệ tinh". |
| `server/donViTinhServer.js` | Log tiếng Việt rõ hơn: "API: http://..." → "API đơn vị tính: ...", "API nhà cung cấp: ...", "API tra cứu CCCD: ...". |

*Lưu ý:* Các file khác (`tool/sever/src/routes/update.js`, `scripts/deduplicate-transcript.js`) đã dùng tiếng Việt.

---

### 3. Chuẩn hóa số thực (phẩy hiển thị, chấm tính toán)

| File | Thay đổi |
|------|----------|
| `src/modules/kho/VatTuHangHoa.tsx` | `imageMeta.sizeMB.toFixed(2)` → `formatNumberDisplay(imageMeta.sizeMB, 2)` để hiển thị dấu phẩy. |
| `src/modules/kho/VatTuHangHoaForm.tsx` | Tương tự: dùng `formatNumberDisplay` thay `toFixed(2)` cho kích thước file. Thêm import `formatNumberDisplay`. |

*Chuẩn:* `src/utils/numberFormat.ts` đã dùng dấu phẩy (`,`) cho hiển thị và dấu chấm (`.`) cho tính toán; các chỗ dùng `toFixed` trực tiếp đã được thay bằng `formatNumberDisplay`.

---

### 4. Bảo mật (thông tin nhạy cảm vào .env)

| File | Thay đổi |
|------|----------|
| `config_network.py` | `IP_LAN`, `IP_PUBLIC` đọc từ biến môi trường `HTQL_550_IP_LAN`, `HTQL_550_IP_PUBLIC`; thêm fallback nếu chưa có .env. |
| `.env.example` | Thêm `HTQL_550_IP_LAN`, `HTQL_550_IP_PUBLIC` để cấu hình IP. |
| `tool/sever/.env.example` | Thêm gợi ý `HTQL_550_VATTU` cho Python server. |

*Lưu ý:* `server/cau_hinh.py` đã dùng biến môi trường cho DB; `vite.config` dùng `localhost` cho proxy dev (không lộ ra ngoài).

---

### 5. Dọn dẹp mã thừa

Đã rà soát: các biến `DU_LIEU_MAU`, `MOCK_DON` là dữ liệu mặc định khi chưa có localStorage, không bỏ. Không tìm thấy mã mẫu/test thừa an toàn để xóa; nếu cần sẽ dọn theo từng module cụ thể.

---

## File không thay đổi (đã đúng chuẩn)

- `src/utils/numberFormat.ts`: logic số đã chuẩn theo number-format.mdc.
- `src/config/htql_550_map.ts`: API key lấy từ `import.meta.env`.
- `tool/sever/`: đường dẫn dùng `PATH_SSD_2T`, `PATH_HDD_4T` từ .env.
