# HTQL_550 — Hướng dẫn cài đặt server trên Ubuntu (máy mới / cài lại OS)

Tài liệu nằm trong gói `htql_server_v….zip` (cùng cấp với `setup_server.sh` sau khi giải nén). Thực hiện **theo thứ tự** trên server sau khi cài lại Ubuntu.

**Tóm tắt kiến trúc lưu trữ**

| Vùng | Vai trò | Mặc định gợi ý |
|------|---------|----------------|
| **NVMe/SSD hệ thống** | Code API, `data/` JSON, `server/.env`, PM2 | `/opt/htql550` |
| **SSD dung lượng lớn** | Đính kèm chứng từ (`hdct`), thiết kế (`thietke`) — upload API | Gốc **`HTQL_ROOT_SSD`** (vd `/ssd_2tb/htql_550`); con cụ thể: **`…/hdct`**, **`…/thietke`**. Nếu `HTQL_SETUP_ATTACH` kết thúc `…/attachments` thì script vẫn suy **`HTQL_ROOT_SSD`** = thư mục cha (tương thích cài cũ). |
| **HDD / kho backup** | Backup định kỳ (cron), bản sao đính kèm gia tăng | Ví dụ `/hdd_4tb/htql_550` |

**Cơ sở dữ liệu:** API HTQL_550 dùng **MySQL do aaPanel quản lý** (kết nối TCP `127.0.0.1:3306`, database/user tạo trong panel — **Local server**). Script `setup_server.sh` **không** cài `mariadb-server` (tránh xung đột). **PostgreSQL** trong gói phục vụ schema tích hợp sau; backup script vẫn `pg_dump` nếu PG hoạt động.

**Schema MySQL tự động:** mỗi lần PM2 khởi động API, `server/db/ensureSchema.js` chạy **`CREATE TABLE IF NOT EXISTS`** cho các bảng phân hệ (DVT, NCC, KH, registry, workstation, `htql_kv_store`, …). Khi có **bản server mới** thêm bảng cho module: cập nhật `ensureSchema.js` → đóng gói zip → `pm2 restart` — **không** cần client tạo bảng. Đồng bộ khóa `htql*` (trừ bảng riêng) qua **`htql_kv_store`** + `/api/htql-kv`.

---

## Bước 0 — Chuẩn bị sau khi cài Ubuntu

### 0.1 Yêu cầu

| Mục | Ghi chú |
|-----|---------|
| Ubuntu Server **20.04 / 22.04 / 24.04** (LTS khuyến nghị) | Cập nhật gói trước khi triển khai |
| User có **sudo** | **Không** chạy `setup_server.sh` trực tiếp bằng `root` |
| Mạng | Truy cập internet để `apt`, NodeSource, `npm` |
| Ổ SSD/HDD phụ | Mount **trước** khi chạy script nếu dùng đường dẫn cố định (vd `/ssd_2tb`, `/hdd_4tb`) |

### 0.2 Cập nhật hệ thống (lần đầu)

```bash
sudo apt update
sudo apt upgrade -y
sudo reboot   # nếu kernel/ghi nhận ổ mới yêu cầu
```

### 0.3 Mount ổ SSD / HDD (nếu có)

1. Xác định thiết bị: `lsblk -f`
2. Tạo filesystem (chỉ lần đầu, **cẩn thận** đúng partition): ví dụ `sudo mkfs.ext4 /dev/sdX1`
3. Mount tạm: `sudo mkdir -p /ssd_2tb /hdd_4tb` (đặt tên thư mục đúng thực tế máy bạn)
4. Thêm vào `/etc/fstab` (ví dụ UUID — lấy bằng `blkid`):

```fstab
UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  /ssd_2tb  ext4  defaults,nofail  0  2
UUID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy  /hdd_4tb  ext4  defaults,nofail  0  2
```

5. `sudo mount -a` — kiểm tra không lỗi.

### 0.4 Tạo thư mục gốc trên SSD/HDD (khuyến nghị trước `setup_server.sh`)

Ví dụ khớp mặc định script:

```bash
sudo mkdir -p /ssd_2tb/htql_550/hdct /ssd_2tb/htql_550/thietke
sudo mkdir -p /hdd_4tb/htql_550
sudo chown -R "$USER:$USER" /ssd_2tb/htql_550 /hdd_4tb/htql_550
```

`setup_server.sh` cũng tự **`mkdir -p`** + **`chown`** cho gốc SSD đã nhập và các thư mục **`hdct`**, **`thietke`**. Điều chỉnh đường dẫn nếu bạn nhập khác khi chạy script (không bắt buộc tạo sẵn thư mục `attachments`).

### 0.5 Tường lửa và cổng (mở trước hoặc sau khi cài)

- **Mục tiêu:** máy trạm và **HTQL_550 Server** (tool Windows) gọi API **HTTP cổng 3001** ổn định; SSH (22) cho quản trị. Có thể **mở rule trước** khi chạy `setup_server.sh` (ví dụ `sudo ufw allow 22/tcp` và `sudo ufw allow 3001/tcp` nếu UFW đã bật), hoặc **sau khi** script cài xong — script thường cấu hình UFW và mở một số cổng; luôn kiểm tra: `sudo ufw status verbose`.
- **Router / NAT:** chuyển tiếp **TCP 3001** (và 22 nếu SSH từ WAN) tới IP tĩnh của server nếu truy cập từ ngoài LAN.
- **MySQL (3306)** và **PostgreSQL (5432)** mặc định **chỉ localhost** — không cần mở ra internet trừ khi bạn chủ động bind ngoài (không khuyến nghị).
- **Tối ưu kết nối Tool ↔ server:** nếu SSH được mà HTTP tới `host:3001` bị timeout từ Windows, ưu tiên sửa **firewall/NAT** cho **3001**; fallback SSH trong tool chỉ là đường dự phòng (xem `build.mdc`).
- **IP mặc định triển khai (đổi hạ tầng → cập nhật đồng bộ `build.mdc`, `phanmem/controlCenter/electron/main.cjs`, `src/config/htqlApiBase.ts`, `.env*`):** LAN **`192.168.1.68`**, WAN tĩnh nhà mạng **`14.224.152.48`** — Tool Windows và máy trạm **EXE/DMG** ưu tiên **LAN** rồi **WAN**, cổng **3001**. NAT/router: chuyển tiếp **3001** (và **22** nếu SSH từ ngoài) tới đúng IP server.

---

## Bước 1 — Đưa gói zip lên server

1. Trên máy build (Windows): file `htql_server_vYYYY.MM.BUILD.zip` nằm trong `phanmem/server/` (sau khi chạy `scripts/package-htql-server.ps1`).
2. Copy lên Ubuntu (SCP, WinSCP, FileZilla, …), ví dụ: `/home/ubuntu/htql_server_v….zip`.
3. Giải nén:

```bash
mkdir -p ~/htql_unpack && unzip -o ~/htql_server_v*.zip -d ~/htql_unpack
cd ~/htql_unpack/htql_server_v*
ls
# Kỳ vọng: setup_server.sh, server/, database/, deploy/, data/, VERSION.txt, PACKAGE_INFO.txt, HUONG_DAN_CAI_DAT_SERVER_UBUNTU.md
```

---

## Bước 1.5 — MySQL trên aaPanel (bắt buộc trước khi chạy setup)

1. Mở **aaPanel** → **Databases** → **Add DB**.
2. **DB name:** `htql_550_db` (utf8mb4), **Username:** `htql_550`, **Password:** (đặt và ghi nhớ).
3. **Permission:** **Local server** / **Add to:** `LocalServer (127.0.0.1)` — khớp cách API Node kết nối (TCP localhost).
4. Không cần cài thêm MariaDB qua `apt` trên Ubuntu — chỉ dùng MySQL của aaPanel.

---

## Bước 2 — Chạy `setup_server.sh`

Script cài: **`mariadb-client`** (chỉ lệnh `mysql` để kiểm tra), **Node.js 20.x**, **PM2**, **UFW**, **PostgreSQL** (schema mẫu), **Samba**, **ImageMagick**, **cron**, **rsync**, **unzip** — **không apt install nginx** (aaPanel đã có Nginx); script kiểm tra và hướng dẫn snippet `deploy/nginx-htql550-location-snippet.conf.example` — triển khai `/opt/htql550`, **kiểm tra kết nối MySQL aaPanel**, ghi **`server/.env`**, tạo thư mục SSD `/ssd_2tb/htql_550/...` với quyền ghi cho user triển khai, khởi động API bằng PM2.

### 2.1 Chế độ tương tác (hỏi đường dẫn)

```bash
chmod +x setup_server.sh
./setup_server.sh
```

Trả lời hoặc **Enter** để giữ mặc định:

| Câu hỏi | Mặc định | Ý nghĩa |
|---------|----------|---------|
| Hệ thống + API + `data` | `/opt/htql550` | Gốc cài HTQL |
| Đính kèm / file lớn (SSD) | `/ssd_2tb/htql_550/attachments` | Nếu đường dẫn kết thúc bằng `/attachments`, script suy **`HTQL_ROOT_SSD`** = thư mục cha (vd `/ssd_2tb/htql_550`) |
| Backup (HDD) | `/hdd_4tb/htql_550` | Cron 01:00 + đường backup trong `.env` |

Sau đó nhập **mật khẩu MySQL** user `htql_550` (đã tạo trong aaPanel), hoặc đặt trước `export HTQL_SETUP_MYSQL_PASSWORD='...'` để không gõ tay.

Cuối phần hỏi: xác nhận **Tiếp tục cài đặt? (y/n)**.

### 2.2 Chế độ không tương tác (CI / Control Center)

```bash
export HTQL_SETUP_NONINTERACTIVE=1
export HTQL_SETUP_ROOT=/opt/htql550
export HTQL_SETUP_ATTACH=/ssd_2tb/htql_550
export HTQL_SETUP_BACKUP=/hdd_4tb/htql_550
export HTQL_SETUP_MYSQL_PASSWORD='MẬT_KHẨU_USER_htql_550_TRONG_AAPANEL'
chmod +x setup_server.sh
./setup_server.sh
```

(Tuỳ chọn) Cài Node nếu chưa có: `export HTQL_SETUP_INSTALL_NODE=y` (mặc định y). Đổi tên DB/user: `HTQL_SETUP_MYSQL_DATABASE`, `HTQL_SETUP_MYSQL_USER`.

### 2.3 MySQL aaPanel (bắt buộc hiểu)

- Script **không** cài `mariadb-server` và **không** tạo DB/user bằng `sudo mysql` — chỉ kết nối tới MySQL do aaPanel quản lý.
- Tạo DB trong aaPanel (bước 1.5) **trước**; biến **`HTQL_SETUP_MYSQL_PASSWORD`** bắt buộc khi `HTQL_SETUP_NONINTERACTIVE=1`.
- Nếu cần sửa tay sau cài: chỉnh `/opt/htql550/server/.env` (`HTQL_MYSQL_*`) rồi `pm2 restart htql550-api --update-env`.

### 2.4 Nginx (aaPanel) — tái sử dụng, không cài trùng
1. **Không** cần bước «cài Nginx mới» nếu server đã có **aaPanel** (Nginx do panel quản lý).
2. Sau `setup_server.sh`, mở **aaPanel** → **Website** → chọn domain/site dùng cho HTQL (hoặc site mặc định) → **Conf**.
3. Trong khối `server { ... }`, dán nội dung **`location /api/ { ... }`** từ file **`deploy/nginx-htql550-location-snippet.conf.example`** (trong gói zip hoặc `/opt/htql550/deploy/` sau khi cài).
4. **Reload Nginx** trong aaPanel. Kiểm tra: `curl -sS http://127.0.0.1/api/htql-meta` (cổng 80) hoặc vẫn gọi trực tiếp **`http://IP:3001`** cho API Node.
5. **Cập nhật server lần sau:** nếu đã cấu hình proxy trong aaPanel, **không** cần cài lại Nginx — chỉ cần đồng bộ mã API (`rsync`/`zip`) và `pm2 restart`.

### 2.5 File sinh ra sau cài

| File / thư mục | Nội dung |
| --- | --- |
| `/opt/htql550/server/.env` | `HTQL_MYSQL_*`, `HTQL_DATA_DIR`, `HTQL_ROOT_SSD`, đường đính kèm, backup, cổng 3001 |
| `/opt/htql550/.mysql_password` | Mật khẩu user ứng dụng MySQL (không đưa vào git) |
| `/opt/htql550/.pg_password` | Mật khẩu user PostgreSQL `htql550` |
| `/opt/htql550/HTQL_INSTALL_REPORT.txt` | Báo cáo tóm tắt đường dẫn và dịch vụ |

**Đồng bộ backup trong `.env`:** `HTQL_PATH_BACKUP_DU_LIEU` và `HTQL_PATH_BACKUP_CT_TK` được ghi dưới **`${HTQL_BACKUP}/backup_dulieu`** và **`${HTQL_BACKUP}/backup_ct_tk`** (cùng gốc với câu trả lời “Backup HDD”).

---

## Bước 3 — Đường dẫn lưu trữ (đối chiếu `server/.env`)

| Biến | Ý nghĩa | Ví dụ |
|------|---------|--------|
| `HTQL_INSTALL_ROOT` | Gốc cài | `/opt/htql550` |
| `HTQL_DATA_DIR` | JSON/registry trên máy chủ | `/opt/htql550/data` |
| `HTQL_ROOT_SSD` | Gốc SSD (file lớn) | `/ssd_2tb/htql_550` |
| `HTQL_PATH_THIET_KE` | Thiết kế (API upload) | `…/thietke` |
| `HTQL_PATH_HOADON_CHUNG_TU` | Đính kèm chứng từ | `…/hdct` |
| `HTQL_PATH_BACKUP_DU_LIEU` | Backup dữ liệu ứng dụng | `${HTQL_BACKUP}/backup_dulieu` |
| `HTQL_PATH_BACKUP_CT_TK` | Backup chứng từ/thiết kế (app) | `${HTQL_BACKUP}/backup_ct_tk` |

Sau khi sửa `.env`: **`pm2 restart htql550-api --update-env`**.

Nếu thư mục SSD chưa tồn tại hoặc lỗi quyền:

```bash
sudo mkdir -p /ssd_2tb/htql_550/thietke /ssd_2tb/htql_550/hdct
sudo chown -R "$USER:$USER" /ssd_2tb/htql_550
```

(User chạy PM2 phải ghi được các thư mục trên.)

---

## Bước 4 — MySQL: bảng tự động & cập nhật phân hệ

1. API gọi **`ensureSchema`** mỗi lần khởi động — **`CREATE TABLE IF NOT EXISTS`**.
2. Phát hành **server mới** có thêm bảng: cập nhật `server/db/ensureSchema.js` trong repo → build zip → triển khai → `pm2 restart` — bảng mới xuất hiện trên DB.
3. Đồng bộ key-value toàn phân hệ (khi không có bảng riêng): **`htql_kv_store`** + `GET/PUT /api/htql-kv`.
4. Log khởi động có dạng: `MySQL schema v…` và số bảng đảm bảo.

---

## Bước 5 — Kiểm tra API và dịch vụ

```bash
curl -s http://127.0.0.1:3001/api/htql-meta | head -c 800
echo
curl -s http://127.0.0.1:3001/api/don-vi-tinh | head -c 400
echo
pm2 status
pm2 logs htql550-api --lines 80
```

Trong log, tìm: `MySQL schema`, đường `PATH_THIET_KE`, `PATH_HOADON_CHUNG_TU`.

**Tường lửa (đã bật bởi script):** cổng **22** (SSH), **80** (HTTP), **3001** (API), **5432** (PostgreSQL), **445** (Samba). Kiểm tra: `sudo ufw status`.

**Nginx (aaPanel):** trong **Website → Conf**, dán khối `location /api/` từ file `deploy/nginx-htql550-location-snippet.conf.example`, rồi Reload Nginx. Máy không aaPanel: có thể dùng site `sites-available/htql550` như log của `setup_server.sh` (Nginx Debian).

**PM2 trống sau reboot (`pm2 status` không có `htql550-api`):** `setup_server.sh` ghi lệnh cần chạy **một lần** có `sudo` vào `deploy/PM2_STARTUP_SUDO_ONCE.txt` (dưới gốc cài, ví dụ `/opt/htql550/deploy/`). Chạy đúng dòng `sudo env PATH=…` mà `pm2 startup` in ra để systemd khởi động lại PM2 và `pm2 resurrect`. Có thể thử khôi phục tay: `bash /opt/htql550/deploy/ensure-pm2-boot.sh` (hoặc `cd /opt/htql550/server && pm2 start ecosystem.config.cjs && pm2 save`).

---

## Bước 6 — Phần mềm phụ trợ đã cài bởi `setup_server.sh`

- **mariadb-client** (lệnh `mysql` — **không** cài **mariadb-server**; MySQL do **aaPanel** cung cấp), **nodejs 20.x** (NodeSource), **pm2**, **ufw**, **postgresql**, **samba**, **imagemagick**, **cron**, **rsync**, **unzip**, **ca-certificates**, **curl**, **openssl** — **không** `apt install nginx` (Nginx do **aaPanel** hoặc cài tay; script chỉ **kiểm tra** và hướng dẫn snippet proxy).

---

## Bước 7 — Cập nhật server sau này (zip mới)

1. Tải `htql_server_v….zip` lên `/opt/htql550/update/server/` (hoặc giải nén và `rsync` như tài liệu SSH nội bộ).
2. Đồng bộ code: `rsync -a …/server/ /opt/htql550/server/` (giữ `.env`).
3. `cd /opt/htql550/server && npm install --omit=dev`
4. `pm2 restart htql550-api --update-env`

Sau khi zip mới có **`ensureSchema.js`** mở rộng — chỉ cần restart PM2 để tạo bảng mới.

---

## Bước 8 — Sự cố thường gặp

| Hiện tượng | Hướng xử lý |
|------------|-------------|
| Sau reboot, `pm2 status` trống (không có `htql550-api`) | Chạy **một lần** lệnh `sudo` trong `deploy/PM2_STARTUP_SUDO_ONCE.txt`; hoặc `bash deploy/ensure-pm2-boot.sh`; hoặc `cd …/server && pm2 start ecosystem.config.cjs && pm2 save`. |
| Client vẫn đọc `khachHang.json` local | Trên server thiếu `HTQL_MYSQL_*` trong `.env` hoặc MySQL không chạy — xem `pm2 logs`. |
| Không lưu file lên SSD | Kiểm tra `HTQL_ROOT_SSD`, quyền `chown`, và `POST /api/htql-upload` (LAN/proxy). |
| Lỗi kết nối MySQL | Khớp host `127.0.0.1`, user `@localhost`, mật khẩu trong `.env` = `/opt/htql550/.mysql_password`. |
| `unzip` báo cảnh báo | Dùng zip tạo bởi `package-htql-server.ps1` (đường dẫn `/` trong entry). |
| `./setup_server.sh: /bin/bash^M: bad interpreter` (hoặc lỗi tương tự do CRLF) | Trên Ubuntu, tại thư mục đã giải nén: `sed -i 's/\r$//' setup_server.sh` rồi `chmod +x setup_server.sh` và chạy lại. |
| Tool Windows hoặc máy trạm timeout tới cổng **3001** trong khi SSH vẫn vào được | Mở **UFW** (và NAT/router nếu cần) cho **TCP 3001** tới mạng máy quản trị / máy trạm. Trên server: `curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/api/htql-meta` — kỳ vọng `200`. |

**Cổng khuyến nghị mở (tường lửa / NAT):** **22** (SSH), **3001** (API HTQL), **80** / **443** (Nginx nếu dùng), **3306** (MySQL — thường chỉ localhost), **5432** (PostgreSQL — thường chỉ localhost).

---

*Tài liệu đồng bộ với repo HTQL_550 (`deploy/HUONG_DAN_CAI_DAT_SERVER_UBUNTU.md`). `setup_server.sh` tại gốc gói là nguồn sự thật cho lệnh cài đặt.*
