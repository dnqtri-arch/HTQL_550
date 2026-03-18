# HTQL_550 Client — Máy Trạm Windows
## Demo Version 0.1

Phần mềm máy trạm Windows cho hệ thống quản lý **HTQL_550**, xây dựng bằng **C# .NET 8 WinForms** (64-bit).

---

## Cấu trúc dự án

```
HTQL_550_MAY_TRAM/
├── HTQL550Client.sln                   ← Solution Visual Studio
└── HTQL550Client/
    ├── HTQL550Client.csproj            ← Project .NET 8 WinForms x64
    ├── Program.cs                      ← Điểm khởi động (entry point)
    ├── app.manifest                    ← Yêu cầu quyền Admin, DPI aware
    │
    ├── Models/
    │   └── CauHinh.cs                  ← Mô hình cấu hình kết nối
    │
    ├── Utils/
    │   ├── ConfigManager.cs            ← Đọc/ghi config.json
    │   └── NumberFormat.cs             ← Định dạng số Việt Nam (1.250.000)
    │
    ├── Services/
    │   ├── NetworkService.cs           ← UDP Broadcast, API ping, lấy cấu hình
    │   ├── FileService.cs              ← Liệt kê/tải file, mở CorelDRAW, ghi log
    │   └── UpdateService.cs           ← Kiểm tra và cài bản cập nhật tự động
    │
    ├── Controls/
    │   └── CircularMenuControl.cs      ← Control Dashboard dạng vòng tròn
    │
    └── Forms/
        ├── FormCaiDat.cs               ← Trình cài đặt (5 bước)
        └── FormChinh.cs                ← Giao diện chính + module File thiết kế
```

---

## Yêu cầu hệ thống

| Thành phần          | Yêu cầu tối thiểu                     |
|---------------------|----------------------------------------|
| Hệ điều hành        | Windows 10 (64-bit) trở lên           |
| .NET Runtime        | .NET 8 Desktop Runtime (x64)          |
| Quyền              | Administrator (để ghi vào Program Files)|
| Mạng               | Kết nối LAN hoặc WAN tới server Ubuntu |

---

## Hướng dẫn build và chạy

### 1. Cài đặt .NET 8 SDK
Tải tại: https://dotnet.microsoft.com/download/dotnet/8.0

### 2. Restore và Build
```powershell
# Di chuyển vào thư mục dự án
cd HTQL_550_MAY_TRAM

# Restore package
dotnet restore HTQL550Client/HTQL550Client.csproj

# Build Release (64-bit)
dotnet build HTQL550Client/HTQL550Client.csproj -c Release -r win-x64

# Chạy trực tiếp
dotnet run --project HTQL550Client/HTQL550Client.csproj
```

### 3. Publish (tạo file .exe chạy độc lập)
```powershell
dotnet publish HTQL550Client/HTQL550Client.csproj `
  -c Release -r win-x64 `
  --self-contained true `
  -p:PublishSingleFile=true `
  -o ./publish
```
File thực thi sẽ nằm tại `./publish/HTQL550Client.exe`.

---

## Luồng hoạt động

```
Khởi động
    │
    ├─ config.json tồn tại?
    │       │
    │      Không → Mở FormCaiDat (Trình cài đặt)
    │               Bước 1: Nhập mật khẩu "dnqTri@1803"
    │               Bước 2: Kiểm tra phiên bản
    │               Bước 3: Cấu hình mạng (LAN/WAN) + Kiểm tra kết nối
    │               Bước 4: Chọn đường dẫn cài đặt
    │               Bước 5: Lưu config.json → Mở FormChinh
    │
    └─── Có → Mở FormChinh (Giao diện chính)
              ├─ Sidebar: Bàn làm việc / CRM / Tài chính / Kho / HRM / Hóa đơn / File thiết kế
              ├─ Dashboard: CircularMenuControl (Vòng tròn + Badge Count)
              ├─ Module File thiết kế: Liệt kê → Tải → Mở CorelDRAW → Ghi log
              └─ Status Bar: Máy chủ | DLKT | Ngày giờ hệ thống
```

---

## Cấu hình mạng

### Chế độ LAN
- Gửi **UDP Broadcast** đến port `50550` để tìm server Ubuntu trong mạng nội bộ.
- Server Ubuntu cần lắng nghe UDP port 50550 và phản hồi chuỗi `HTQL550_SERVER:`.

### Chế độ WAN
- Nhập trực tiếp IP tĩnh (mặc định gợi ý: `14.224.152.48`) và Port `8080`.
- Nhấn **[Kiểm tra kết nối]** để gọi `GET /api/ping`.

---

## API Server cần có

| Method | Endpoint          | Mô tả                                |
|--------|-------------------|--------------------------------------|
| GET    | `/api/ping`       | Kiểm tra server còn hoạt động        |
| GET    | `/api/cau-hinh`   | Lấy đường dẫn lưu trữ (JSON)         |
| GET    | `/api/phien-ban`  | Lấy phiên bản mới nhất               |
| GET    | `/api/files`      | Danh sách file thiết kế              |
| GET    | `/api/files/{ten}`| Tải nội dung file                    |
| POST   | `/api/logs`       | Ghi nhật ký thao tác file            |
| GET    | `/update/HTQL550Client.zip` | File cập nhật              |

---

## Bảo mật

- **Mật khẩu cài đặt** (`dnqTri@1803`) hiện đang lưu dạng so sánh trực tiếp trong `FormCaiDat.cs`.
  Trước khi đưa vào production, cần:
  1. Tính SHA-256 hash của mật khẩu:
     ```powershell
     [System.BitConverter]::ToString(
       [System.Security.Cryptography.SHA256]::Create().ComputeHash(
         [System.Text.Encoding]::UTF8.GetBytes("dnqTri@1803")
       )
     ).Replace("-","").ToLower()
     ```
  2. Thay hằng số `HASH_MAT_KHAU` trong `FormCaiDat.cs` bằng giá trị hash thu được.
  3. Đổi logic so sánh sang `HashMatKhau(input) == HASH_MAT_KHAU`.

- **IP và mật khẩu database** KHÔNG được hardcode trong code — đọc từ biến môi trường hoặc `.env`.

---

## Định dạng số (tuân thủ number-format.mdc)

| Kiểu       | Hiển thị cho user | Tính toán nội bộ |
|------------|-------------------|-----------------|
| Số tiền    | `1.250.000`       | `1250000M`      |
| Số thập phân | `1.250,50`      | `1250.5M`       |
| Phần trăm  | `10,50%`          | `0.105M`        |

Dùng `NumberFormat.DinhDangTien()` và `NumberFormat.PhanTichSo()` từ `Utils/NumberFormat.cs`.

---

## Đường dẫn lưu trữ (tuân thủ cursorrules.mdc)

| Loại dữ liệu        | Đường dẫn server         |
|---------------------|--------------------------|
| Database            | `/ssd_2t/htql_550/db/`   |
| File thiết kế       | `/ssd_2t/htql_550/thietke/` |
| Ảnh nặng            | `/ssd_2t/htql_550/anh/`  |
| Backup              | `/hdd_4t/htql_550/`      |
| File tạm máy trạm   | `C:\HTQL_550_Temp\`      |
| Cấu hình máy trạm   | `C:\Program Files\HTQL_550\config.json` |

---

*Phát triển bởi đội HTQL_550 — Demo v0.1 — Tháng 3/2026*
