"""
HTQL_550 — API Server cho máy trạm Windows
==========================================
- Cổng 2026 : Offline / LAN  (máy trạm cùng mạng nội bộ)
- Cổng 1803 : Online  / WAN  (máy trạm kết nối qua internet)
- UDP 50550 : Tự động phát hiện server (Broadcast Discovery)

Khởi động:
    python3 htql550_server.py

Hoặc chạy nền qua systemd — xem htql550.service
"""

import asyncio
import json
import os
import socket
import threading
from datetime import datetime
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

# ── Cấu hình đường dẫn ───────────────────────────────────────────────────────
# Đọc từ biến môi trường — KHÔNG hardcode đường dẫn trong code
DUONG_DAN_DB       = os.getenv("HTQL_PATH_DB",      "/ssd_2t/htql_550/db/")
DUONG_DAN_THIETKE  = os.getenv("HTQL_PATH_THIETKE", "/ssd_2t/htql_550/thietke/")
DUONG_DAN_ANH      = os.getenv("HTQL_PATH_ANH",     "/ssd_2t/htql_550/anh/")
DUONG_DAN_UPDATE   = os.getenv("HTQL_PATH_UPDATE",  "/ssd_2t/htql_550/update/")

# ── Cổng lắng nghe ───────────────────────────────────────────────────────────
CONG_LAN   = int(os.getenv("HTQL_PORT_LAN",  "2026"))   # Offline / LAN
CONG_WAN   = int(os.getenv("HTQL_PORT_WAN",  "1803"))   # Online  / WAN
CONG_UDP   = int(os.getenv("HTQL_PORT_UDP",  "50550"))  # UDP Broadcast Discovery

# ── Phiên bản ─────────────────────────────────────────────────────────────────
PHIEN_BAN  = "0.1"

# ── Tệp nhật ký ───────────────────────────────────────────────────────────────
FILE_NHAT_KY = Path("/ssd_2t/htql_550/logs/nhat_ky_may_tram.jsonl")

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="HTQL_550 API Server",
    version=PHIEN_BAN,
    description="API phục vụ máy trạm Windows HTQL_550 Client"
)

# Cho phép máy trạm Windows kết nối (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── /api/ping ─────────────────────────────────────────────────────────────────
@app.get("/api/ping")
async def ping():
    """Kiểm tra server còn hoạt động không."""
    return {
        "trang_thai": "ok",
        "thong_diep": "HTQL_550 Server đang chạy",
        "thoi_gian":  datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "phien_ban":  PHIEN_BAN,
    }


# ── /api/phien-ban ────────────────────────────────────────────────────────────
@app.get("/api/phien-ban")
async def phien_ban():
    """Trả về phiên bản mới nhất để máy trạm so sánh và tự cập nhật."""
    # Đọc từ file version.json nếu có
    file_version = Path(DUONG_DAN_UPDATE) / "version.json"
    if file_version.exists():
        try:
            return json.loads(file_version.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"phienBan": PHIEN_BAN}


# ── /api/cau-hinh ─────────────────────────────────────────────────────────────
@app.get("/api/cau-hinh")
async def cau_hinh():
    """Trả về đường dẫn lưu trữ trên server cho máy trạm đồng bộ."""
    return {
        "ThuMucDatabase": DUONG_DAN_DB,
        "ThuMucThietKe":  DUONG_DAN_THIETKE,
        "ThuMucAnh":      DUONG_DAN_ANH,
        "ThuMucUpdate":   DUONG_DAN_UPDATE,
    }


# ── /api/files ────────────────────────────────────────────────────────────────
@app.get("/api/files")
async def danh_sach_file():
    """Liệt kê danh sách file thiết kế cho máy trạm tải về."""
    thu_muc = Path(DUONG_DAN_THIETKE)
    if not thu_muc.exists():
        return []

    cac_file = []
    for f in sorted(thu_muc.iterdir()):
        if f.is_file():
            stat = f.stat()
            cac_file.append({
                "TenFile":    f.name,
                "DuongDan":   str(f),
                "KichThuoc":  stat.st_size,
                "NgaySuaDoi": datetime.fromtimestamp(stat.st_mtime).strftime("%d/%m/%Y %H:%M"),
                "MoTa":       "",
            })
    return cac_file


# ── /api/files/{ten_file} ─────────────────────────────────────────────────────
@app.get("/api/files/{ten_file}")
async def tai_file(ten_file: str):
    """Tải một file thiết kế về máy trạm."""
    duong_dan = Path(DUONG_DAN_THIETKE) / ten_file

    # Chỉ cho tải file trong thư mục thiết kế (chống path traversal)
    if not duong_dan.resolve().is_relative_to(Path(DUONG_DAN_THIETKE).resolve()):
        return JSONResponse({"loi": "Không được phép truy cập file ngoài thư mục thiết kế."}, 403)

    if not duong_dan.exists():
        return JSONResponse({"loi": f"File '{ten_file}' không tồn tại."}, 404)

    return FileResponse(str(duong_dan), filename=ten_file)


# ── /api/logs ─────────────────────────────────────────────────────────────────
@app.post("/api/logs")
async def ghi_nhat_ky(request: Request):
    """Nhận nhật ký từ máy trạm (ai mở, file nào, lúc nào)."""
    try:
        du_lieu = await request.json()
        du_lieu["_server_time"] = datetime.now().isoformat()

        # Đảm bảo thư mục log tồn tại
        FILE_NHAT_KY.parent.mkdir(parents=True, exist_ok=True)

        # Ghi dạng JSON Lines (mỗi dòng 1 bản ghi)
        with open(FILE_NHAT_KY, "a", encoding="utf-8") as f:
            f.write(json.dumps(du_lieu, ensure_ascii=False) + "\n")

        return {"trang_thai": "ok"}
    except Exception as loi:
        return JSONResponse({"loi": str(loi)}, 500)


# ── /update/{ten_file} ────────────────────────────────────────────────────────
@app.get("/update/{ten_file}")
async def tai_cap_nhat(ten_file: str):
    """Tải file cập nhật phần mềm máy trạm."""
    duong_dan = Path(DUONG_DAN_UPDATE) / ten_file
    if not duong_dan.exists():
        return JSONResponse({"loi": f"File cập nhật '{ten_file}' không tồn tại."}, 404)
    return FileResponse(str(duong_dan), filename=ten_file)


# ── UDP Broadcast Discovery (Offline / LAN) ───────────────────────────────────
def chay_udp_discovery():
    """
    Lắng nghe gói UDP Broadcast từ máy trạm đang tìm server.
    Khi nhận 'HTQL550_DISCOVER' → phản hồi 'HTQL550_SERVER:' kèm thông tin.
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.bind(("", CONG_UDP))

        print(f"[UDP] Đang lắng nghe Broadcast Discovery tại port {CONG_UDP}...")

        while True:
            du_lieu, dia_chi = sock.recvfrom(1024)
            tin_nhan = du_lieu.decode("utf-8", errors="ignore").strip()

            if tin_nhan == "HTQL550_DISCOVER":
                # Phản hồi kèm thông tin IP và cổng LAN
                ip_server  = socket.gethostbyname(socket.gethostname())
                phan_hoi   = f"HTQL550_SERVER:ip={ip_server};port={CONG_LAN};version={PHIEN_BAN}"
                sock.sendto(phan_hoi.encode("utf-8"), dia_chi)
                print(f"[UDP] Đã phản hồi máy trạm {dia_chi[0]}: {phan_hoi}")

    except Exception as loi:
        print(f"[UDP] Lỗi UDP Discovery: {loi}")


# ── Khởi động server ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print(" HTQL_550 API Server — v" + PHIEN_BAN)
    print(f" Cổng LAN  (Offline): {CONG_LAN}")
    print(f" Cổng WAN  (Online) : {CONG_WAN}")
    print(f" Cổng UDP  (Discovery): {CONG_UDP}")
    print("=" * 60)

    # Chạy UDP Discovery trong luồng riêng (không block API)
    udp_thread = threading.Thread(target=chay_udp_discovery, daemon=True)
    udp_thread.start()

    # Chạy FastAPI trên cả hai cổng song song
    async def chay_ca_hai_cong():
        config_lan = uvicorn.Config(
            app, host="0.0.0.0", port=CONG_LAN,
            log_level="info", access_log=True
        )
        config_wan = uvicorn.Config(
            app, host="0.0.0.0", port=CONG_WAN,
            log_level="info", access_log=True
        )
        server_lan = uvicorn.Server(config_lan)
        server_wan = uvicorn.Server(config_wan)

        # Tắt signal handler mặc định của uvicorn để chạy song song
        server_lan.install_signal_handlers = lambda: None
        server_wan.install_signal_handlers = lambda: None

        print(f"[LAN] Khởi động API tại http://0.0.0.0:{CONG_LAN}")
        print(f"[WAN] Khởi động API tại http://0.0.0.0:{CONG_WAN}")

        await asyncio.gather(
            server_lan.serve(),
            server_wan.serve(),
        )

    asyncio.run(chay_ca_hai_cong())
