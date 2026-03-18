# HTQL_550 - Hệ thống đa phân hệ (Kiểu MISA)

Giao diện đa phân hệ với Sidebar nhóm menu, Multi-tab. Theme trắng, màu chủ đạo cam — tương phản rõ, hiện đại, tối ưu giao diện.

## Yêu cầu

- Node.js 18+
- PostgreSQL (cho database)

## Chạy client

```bash
npm install
npm run dev
```

Mở http://localhost:5173

## Cấu trúc

- **client (Vite + React):** `src/`
  - `src/components/` – Layout, Sidebar, TabBar, ModulePage, AppHeader, AppFooter
  - `src/config/sidebarConfig.ts` – Cấu hình 6 nhóm phân hệ
  - `src/modules/[TenPhanHe]/` – Một thư mục cho mỗi phân hệ (Bàn làm việc, Công việc, Bán hàng, Mua hàng, …)
- **Danh mục dùng chung:** `shared/danhmuc/`
  - DanhMuc_DoiTuong (Khách hàng, Nhà cung cấp, Nhân viên)
  - DanhMuc_VatTu (Vật tư hàng hóa, Kho, Đơn vị tính)
  - DanhMuc_TaiKhoan (Ngân hàng, Hệ thống tài khoản)
- **Cấu hình mạng:** `config_network.py`
  - Tự nhận diện: ping 192.168.1.68 → dùng LAN, không thì dùng IP Public 14.224.152.48 (có thể cấu hình qua biến môi trường `HTQL_IP_LAN`, `HTQL_IP_PUBLIC`)
  - Đường dẫn lưu thiết kế (Bán hàng, Kho): `/ssd_2t/htql_550/thietke/` (backup tại `/hdd_4t/htql_550/thietke/`)
- **Database:** `database/schema_postgresql.sql` – Tạo bảng PostgreSQL (tên bảng tiếng Việt) cho tất cả phân hệ

## Các phân hệ (Sidebar)

1. **Nhóm 1:** Bàn làm việc, Công việc  
2. **Nhóm 2:** Bán hàng, Mua hàng, Hợp đồng  
3. **Nhóm 3:** Quỹ, Ngân hàng, Thủ quỹ  
4. **Nhóm 4:** Kho, Thủ kho, Công cụ dụng cụ, Tài sản cố định  
5. **Nhóm 5:** Tiền lương, Thuế, Giá thành, Tổng hợp  
6. **Nhóm 6:** Hóa đơn điện tử, Quản lý hóa đơn, Tài liệu  

Mỗi phân hệ mở trong một Tab; chuyển tab không mất dữ liệu đang nhập.

## Màu sắc (Theme trắng — cam chủ đạo)

- **Nền:** Trắng (`--bg-primary`), xám nhạt cho panel/sidebar (`--bg-secondary`, `--bg-tab`)
- **Chữ:** Tối rõ trên nền trắng (`--text-primary`, `--text-secondary`) — tương phản cao
- **Accent:** Cam (`--accent`, `--accent-hover`) — nút, link, tab active; chữ trên nút dùng trắng
- **Form:** Viền rõ (`--input-border`), focus viền cam (`--input-border-focus`)
- **Font:** Be Vietnam Pro

## Khởi tạo PostgreSQL

```bash
psql -U postgres -d htql550 -f database/schema_postgresql.sql
```
