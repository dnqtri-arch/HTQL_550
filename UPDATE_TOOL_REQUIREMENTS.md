# 🛠 TÀI LIỆU YÊU CẦU PHÁT TRIỂN TOOL QUẢN TRỊ & CẬP NHẬT (CONTROL CENTER)

## 1. HỆ THỐNG GIÁM SÁT KẾT NỐI (CONNECTION MONITORING)
**YÊU CẦU:** Tool phải tự động kiểm tra trạng thái mạng mỗi 15 giây.
- **Đèn LED Tín hiệu (UI):** Hiển thị ở góc trên bên phải giao diện.
    - ● **MÀU XANH:** Đã kết nối IP Nội bộ `192.168.1.68` (Ưu tiên số 1 - Tốc độ cao).
    - ● **MÀU VÀNG:** Đang dùng IP Tĩnh `14.224.152.48` (Dùng khi ở ngoài xưởng).
    - ● **MÀU ĐỎ:** Mất kết nối hoàn toàn (Vô hiệu hóa các nút Cài đặt/Update).
- **Tính năng Smart-Switch:** Tự động chuyển đổi đường truyền dữ liệu dựa trên đèn tín hiệu.

## 2. CHẾ ĐỘ CÀI ĐẶT HỆ THỐNG MỚI (INSTALLER MODE)
- **Nhiệm vụ:** Dành cho việc thiết lập Server Ubuntu trắng từ xa.
- **Quy trình:** 1. Upload file `htql_server_v[VERSION].zip` lên Server.
    2. Giải nén và kích hoạt lệnh: `sudo ./setup_server.sh`.
    3. **Tương tác (Terminal Bridge):** Tool phải mở một cửa sổ console nhỏ để Anh Trí nhập các đường dẫn ổ cứng (NVME, SSD, HDD) khi kịch bản cài đặt yêu cầu.

## 3. CHẾ ĐỘ CẬP NHẬT PHIÊN BẢN (SMART UPDATE)
- **Phân loại:**
    - [Đẩy Server]: Chỉ cập nhật mã nguồn Node.js, không làm mất Database. Tự động Restart Service.
    - [Đẩy Client]: Cập nhật giao diện web vào thư mục Nginx.
- **Hiển thị:** Thanh tiến trình (%) và tốc độ truyền tải (MB/s) thời gian thực.

## 4. QUẢN TRỊ SERVER TỪ XA (REMOTE ADMIN)
- **Restart Service:** Nút bấm để khởi động lại nhanh PM2 trên Ubuntu.
- **Log Viewer:** Xem nhật ký hoạt động của Server để kiểm tra lỗi tra cứu CCCD hoặc đơn hàng.