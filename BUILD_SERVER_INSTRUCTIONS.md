# 📑 HƯỚNG DẪN XÂY DỰNG & ĐÓNG GÓI SERVER HTQL_550 (MASTER)

## 1. QUY TRÌNH CÀI ĐẶT TƯƠNG TÁC & MẠNG (NETWORKING)
- **Cài đặt Tự động:** Tự động cài Node.js, PostgreSQL, Nginx, ImageMagick, Samba và khởi tạo Database `htql_550`.
- **Hỏi đường dẫn (Interactive read -p):**
    - Code & DB (NVME): Mặc định `/opt/htql550/server`.
    - Ảnh & Thiết kế (SSD 2TB): Mặc định `/mnt/storage_ssd/attachments`.
    - Backup (HDD): Mặc định `/mnt/backup_hdd/htql550_backups`.
- **Cấu hình Dual-Access (Kết nối kép):**
    - IP Nội bộ: `192.168.1.68` (Dùng cho nhân viên tại xưởng).
    - IP Tĩnh WAN: `14.224.152.48` (Dùng cho truy cập từ xa/online).
    - Mở cổng Firewall (UFW): cho phép các cổng 80 (Nginx), 3001 (API), 5432 (DB), 445 (Samba).

## 2. QUY TẮC PHIÊN BẢN (AUTO-INCREMENT VERSIONING)
- **Định dạng:** `htql_server_v[YYYY].[MM].[BUILD]`
- **Logic:** Tự động cập nhật Năm.Tháng. Số BUILD tăng dần liên tục và không được reset khi sang năm mới.

## 2.1. HTQL_550 Control Center (Windows) — phạm vi

- Tool trong `phanmem\controlCenter\` chỉ hỗ trợ **cập nhật server** (upload zip) và **cập nhật client** (dist lên Nginx). **Không** còn luồng «cài đặt server mới» từ tool.
- **Cài đặt lần đầu trên Ubuntu:** dùng gói `htql_server_v....zip` trong `phanmem\server\` và làm theo **`README_CAI_DAT_SSH.md`** (SCP + SSH + `setup_server.sh`).

## 3. RÀ SOÁT & LÀM SẠCH TRƯỚC KHI BUILD (CLEAN BUILD)
- **Code:** Xóa code chết, biến không dùng, console.log.
- **Database Audit:** Kiểm tra các cột/bảng dư thừa. **Phải liệt kê cho Anh Trí duyệt trước khi xóa.**
- **Exclusion:** Loại trừ toàn bộ folder `attachments/`, dữ liệu demo, file `.env` cá nhân khỏi file nén .zip.

## 4. CHIẾN LƯỢC BACKUP & TỰ ĐỘNG KHỞI ĐỘNG
- **Lịch:** 01:00 sáng hằng ngày — script `/usr/local/bin/htql550-backup.sh` (đăng ký bởi `setup_server.sh`).
- **Hệ thống + CSDL:** Thư mục con `daily_system/` trong thư mục backup HDD — `pg_dump` + nén `data/` theo ngày; **giữ tối đa 10 bản**, bản cũ hơn tự xóa.
- **Đính kèm (thiết kế + chứng từ):** Đồng bộ gia tăng bằng `rsync` từ đúng đường `HTQL_PATH_THIET_KE` / `HTQL_PATH_HOADON_CHUNG_TU` vào `backup_ct_tk/thietke` và `backup_ct_tk/hdct` trên HDD backup (chỉ file mới hoặc thay đổi). `setup_server.sh` hiện tại **không** còn luồng `attachments_incremental/`.
- **Log backup:** `${HTQL_ROOT}/logs/htql550-backup.log`.
- **PM2 / Node API:** `pm2 startup` + `pm2 save` (khởi động lại cùng phiên đăng nhập user; tương đương dịch vụ sau reboot).
- **Xuất build zip:** Gói vào `HTQL_550\phanmem\server\` — **một file `.zip`** và **`README_CAI_DAT_SSH.md`** (hướng dẫn SSH); script: `scripts\package-htql-server.ps1` (xóa mọi file khác trong thư mục đó).