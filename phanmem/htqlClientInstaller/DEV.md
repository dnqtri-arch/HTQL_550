# Chạy HTQL_550 trong Electron (chế độ phát triển)

## Một lệnh (API + Vite + cửa sổ Electron)

Tại thư mục này (`phanmem\htqlClientInstaller`):

```powershell
npm run dev
```

Lệnh này chạy `npm run dev` ở **gốc repo** (Node API cổng 3001 + Vite 5173), đợi cổng 5173 sẵn sàng rồi mở Electron trỏ tới `http://localhost:5173`.

- Menu **View → Công cụ phát triển** (hoặc tương đương) để mở DevTools.
- Đóng cửa sổ Electron sẽ dừng toàn bộ tiến trình (theo cấu hình `concurrently -k`).

## Hai terminal (khi cần tách bước)

1. Gốc repo: `npm run dev`
2. Thư mục này: `npm run dev:electron`

## Ghi chú

- Cờ `--htql-dev` bật tải trang từ Vite; không cần thư mục `web-dist`.
