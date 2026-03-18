# Cài đặt HTQL_550 API Server trên Ubuntu

## Cổng sử dụng
| Chế độ | Cổng | Dùng cho |
|--------|------|----------|
| **Offline (LAN)** | `2026` | Máy trạm cùng mạng nội bộ |
| **Online (WAN)**  | `1803` | Máy trạm kết nối qua Internet |
| **UDP Discovery** | `50550` | Tự động tìm server (Broadcast) |

---

## Bước 1: Tạo thư mục và copy file

```bash
# Tạo thư mục server
sudo mkdir -p /ssd_2t/htql_550/server/
sudo mkdir -p /ssd_2t/htql_550/thietke/
sudo mkdir -p /ssd_2t/htql_550/db/
sudo mkdir -p /ssd_2t/htql_550/anh/
sudo mkdir -p /ssd_2t/htql_550/update/
sudo mkdir -p /ssd_2t/htql_550/logs/

# Cấp quyền sở hữu cho user dnqtri
sudo chown -R dnqtri:dnqtri /ssd_2t/htql_550/

# Copy file server vào đúng vị trí
cp htql550_server.py /ssd_2t/htql_550/server/
cp requirements.txt  /ssd_2t/htql_550/server/
```

---

## Bước 2: Cài đặt Python và thư viện

```bash
# Kiểm tra Python3 (server của bạn đã có)
python3 --version

# Cài pip nếu chưa có
sudo apt install python3-pip -y

# Cài các thư viện cần thiết
cd /ssd_2t/htql_550/server/
pip3 install -r requirements.txt
```

---

## Bước 3: Mở cổng Firewall

```bash
# Mở cổng LAN (2026) và WAN (1803) trên UFW
sudo ufw allow 2026/tcp comment "HTQL_550 LAN"
sudo ufw allow 1803/tcp comment "HTQL_550 WAN"
sudo ufw allow 50550/udp comment "HTQL_550 UDP Discovery"

# Kiểm tra lại
sudo ufw status
```

> **Nếu dùng aaPanel / firewall panel:** Vào Firewall → Add Port → nhập `2026`, `1803`, `50550`.

---

## Bước 4: Chạy thử (kiểm tra trực tiếp)

```bash
cd /ssd_2t/htql_550/server/
python3 htql550_server.py
```

Mở trình duyệt kiểm tra:
- `http://192.168.1.68:2026/api/ping`  → LAN
- `http://14.xxx.xxx.xxx:1803/api/ping` → WAN (thay IP thật của bạn)

---

## Bước 5: Cài đặt chạy tự động khi khởi động (systemd)

```bash
# Copy file service
sudo cp htql550.service /etc/systemd/system/

# Reload systemd và kích hoạt
sudo systemctl daemon-reload
sudo systemctl enable htql550
sudo systemctl start htql550

# Kiểm tra trạng thái
sudo systemctl status htql550
```

---

## Bước 6: Kiểm tra log

```bash
# Xem log realtime
sudo journalctl -u htql550 -f

# Xem nhật ký thao tác file từ máy trạm
tail -f /ssd_2t/htql_550/logs/nhat_ky_may_tram.jsonl
```

---

## Bước 7: Tạo file version.json (phiên bản cập nhật)

```bash
cat > /ssd_2t/htql_550/update/version.json << 'EOF'
{
  "phienBan": "0.1",
  "ngayPhatHanh": "2026-03-18",
  "ghiChu": "Phiên bản Demo"
}
EOF
```

---

## Kiểm tra nhanh tất cả endpoint

```bash
# Ping server
curl http://localhost:2026/api/ping

# Lấy cấu hình đường dẫn
curl http://localhost:2026/api/cau-hinh

# Lấy phiên bản
curl http://localhost:2026/api/phien-ban

# Danh sách file thiết kế
curl http://localhost:2026/api/files
```

---

## Cấu trúc thư mục hoàn chỉnh trên server

```
/ssd_2t/htql_550/
├── server/
│   ├── htql550_server.py     ← File chính API server
│   └── requirements.txt
├── db/                        ← Cơ sở dữ liệu
├── thietke/                   ← File thiết kế CorelDRAW
├── anh/                       ← Ảnh nặng
├── update/
│   ├── version.json           ← Thông tin phiên bản
│   └── HTQL550Client.zip      ← File cập nhật máy trạm
└── logs/
    └── nhat_ky_may_tram.jsonl ← Nhật ký thao tác
```
