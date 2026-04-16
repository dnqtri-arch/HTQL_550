# HTQL_550 — Cài đặt / nâng cấp server Ubuntu qua SSH

- **File gói:** {{ZIP_NAME}}
- **Thư mục gốc trong zip:** {{FOLDER_NAME}}
- **Phiên bản:** {{VER}} (BUILD {{COUNTER}})

## Điều kiện

- Ubuntu **64-bit**, tài khoản có **sudo** (không chạy `setup_server.sh` trực tiếp bằng root).
- Đã cài **OpenSSH server** (`sshd`) để SSH/SCP.

## 1. Copy gói lên máy chủ (SCP)

Từ máy có lệnh `scp` (Git Bash, WSL, Linux, macOS) hoặc WinSCP tương đương:

```bash
scp /đường/dẫn/tới/{{ZIP_NAME}} ubuntu@ĐỊA_CHỈ_IP:/tmp/
```

## 2. Đăng nhập SSH

```bash
ssh ubuntu@ĐỊA_CHỈ_IP
```

## 3. Giải nén và quyền thực thi

```bash
cd /tmp
unzip -o {{ZIP_NAME}}
cd {{FOLDER_NAME}}
chmod +x setup_server.sh
```

## 4. Chạy cài đặt tương tác

```bash
./setup_server.sh
```

Script hỏi (hoặc Enter để nhận mặc định): thư mục code+DB, đính kèm, backup HDD, mật khẩu PostgreSQL, cài Node nếu thiếu. Chi tiết mạng/backup xem **BUILD_SERVER_INSTRUCTIONS.md** ở gốc repo dev.

## 5. Firewall (UFW) — gợi ý

Sau khi cài, mở cổng theo nhu cầu (ví dụ web 80, API 3001, PostgreSQL 5432, Samba 445):

```bash
sudo ufw allow 80/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 5432/tcp
sudo ufw allow 445/tcp
sudo ufw status
```

## 6. Nâng cấp khi đã có HTQL

- **Cách 1:** Dùng **HTQL_550 Control Center** (Windows): **Cập nhật server** và **Cập nhật client** — chọn file `{{ZIP_NAME}}`, ô *Tên thư mục sau giải nén* = `{{FOLDER_NAME}}`.
- **Cách 2:** Giải nén zip mới, chạy lại `setup_server.sh` hoặc quy trình rsync/PM2 theo tài liệu vận hành.

Trong zip có `PACKAGE_INFO.txt` và `VERSION.txt` để đối chiếu phiên bản.
