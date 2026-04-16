# 📑 YÊU CẦU ĐÓNG GÓI PHẦN MỀM MÁY TRẠM HTQL_550 (.EXE)

## 1. THÔNG SỐ CẤU HÌNH (ENVIRONMENT)
- **Phiên bản:** v2026.04.01 (Hiển thị tại Footer phần mềm).
- **Cơ chế Kết nối thông minh (Smart Connect):**
    - Ưu tiên 1 (LAN): `http://192.168.1.68:3001`
    - Ưu tiên 2 (WAN/IP Tĩnh): `http://14.224.152.48:3001`
    - Timeout: 4.5 giây (Nếu LAN không phản hồi sẽ tự động chuyển sang WAN).

## 2. KỊCH BẢN CÀI ĐẶT 8 BƯỚC (INSTALLATION WIZARD)
1. **Khởi tạo:** Kiểm tra môi trường Node.js và chạy `npm run build` (Vite).
2. **Đóng gói:** Sử dụng **Electron-Builder** để nén toàn bộ thành 1 file Setup duy nhất.
3. **Nhận diện:** Tích hợp Logo công ty Nam Bắc AD vào Icon ứng dụng (.ico).
4. **Cài đặt:** Cho phép người dùng chọn thư mục cài đặt (C:\Program Files\HTQL_550).
5. **Shortcut:** Tự động tạo biểu tượng phần mềm ngoài Desktop và Start Menu.
6. **Quyền hạn:** Tự động yêu cầu quyền Administrator để đảm bảo ghi log và cập nhật mượt mà.
7. **Kiểm tra (Self-Check):** Lần đầu mở, phần mềm tự kiểm tra kết nối tới Server. Nếu thông suốt mới hiện màn hình Đăng nhập.
8. **Auto-Update:** Tích hợp logic kiểm tra file `version.json` trên Server mỗi khi khởi động máy trạm.

## 3. ĐẦU RA (OUTPUT)
- **Tên file:** `HTQL_550_Setup_v2026.04.01.exe`
- **Vị trí:** Xuất thẳng ra màn hình **Desktop** của máy tính Build.