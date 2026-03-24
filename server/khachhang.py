# -*- coding: utf-8 -*-
"""
API danh mục Khách hàng — HTQL_550 Phân hệ Bán hàng.
Độc lập hoàn toàn với api/nhacungcap.
Endpoint: /api/khach-hang
Tuân thủ htql-core-standards.mdc: viết liền, không gạch ngang trong định danh Python.
"""

import json
import os
from pathlib import Path

try:
    from flask import Flask, request, jsonify, Blueprint
    FLASK_OK = True
except ImportError:
    FLASK_OK = False
    Blueprint = None

# ─── Đường dẫn lưu file JSON ────────────────────────────────────────────────
DUONG_DAN_DU_LIEU = Path(os.environ.get("HTQL_DATA_DIR", "/ssd_2t/htql_550/data"))
FILE_KHACH_HANG = DUONG_DAN_DU_LIEU / "khach_hang.json"

# ─── Dữ liệu mẫu ────────────────────────────────────────────────────────────
DU_LIEU_MAU = [
    {
        "id": 1,
        "ma_kh": "KH00001",
        "ten_kh": "CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ MIỀN NAM",
        "loai_kh": "to_chuc",
        "isNhaCungCap": False,
        "dia_chi": "123 Nguyễn Huệ, Quận 1, TP Hồ Chí Minh",
        "ma_so_thue": "0312345678",
        "dien_thoai": "0901234567",
        "ngung_theo_doi": False,
    }
]


def doc_du_lieu():
    """Đọc danh sách khách hàng từ file JSON; trả về dữ liệu mẫu nếu chưa có file."""
    try:
        if FILE_KHACH_HANG.exists():
            with open(FILE_KHACH_HANG, encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                return data
    except Exception:
        pass
    return list(DU_LIEU_MAU)


def ghi_du_lieu(danh_sach: list):
    """Ghi danh sách khách hàng xuống file JSON."""
    try:
        DUONG_DAN_DU_LIEU.mkdir(parents=True, exist_ok=True)
        with open(FILE_KHACH_HANG, "w", encoding="utf-8") as f:
            json.dump(danh_sach, f, ensure_ascii=False, indent=2)
    except Exception as ex:
        print(f"[HTQL_550] Lỗi ghi khách hàng: {ex}")


def tao_ma_tiep_theo(danh_sach: list) -> str:
    """Sinh mã KH tiếp theo: KH00001, KH00002, ..."""
    so_max = 0
    for kh in danh_sach:
        ma = str(kh.get("ma_kh", "")).replace("KH", "").replace("-", "")
        try:
            so_max = max(so_max, int(ma))
        except ValueError:
            pass
    return f"KH{so_max + 1:05d}"


# ─── Blueprint Flask ─────────────────────────────────────────────────────────
def tao_blueprint():
    """Tạo Blueprint /api/khach-hang cho ứng dụng Flask chính."""
    if not FLASK_OK:
        return None

    bp = Blueprint("khachhang", __name__, url_prefix="/api/khach-hang")

    @bp.route("", methods=["GET"])
    def lay_tat_ca():
        return jsonify(doc_du_lieu())

    @bp.route("/<int:id_kh>", methods=["GET"])
    def lay_mot(id_kh: int):
        ds = doc_du_lieu()
        kh = next((r for r in ds if r.get("id") == id_kh), None)
        if kh is None:
            return jsonify({"error": "Không tìm thấy"}), 404
        return jsonify(kh)

    @bp.route("", methods=["POST"])
    def them_moi():
        ds = doc_du_lieu()
        body = request.get_json(force=True, silent=True) or {}
        id_moi = max((r.get("id", 0) for r in ds), default=0) + 1
        body["id"] = id_moi
        if not body.get("ma_kh"):
            body["ma_kh"] = tao_ma_tiep_theo(ds)
        body.setdefault("ngung_theo_doi", False)
        body.setdefault("isNhaCungCap", False)
        body.setdefault("loai_kh", "to_chuc")
        ds.append(body)
        ghi_du_lieu(ds)
        return jsonify(body), 201

    @bp.route("/<int:id_kh>", methods=["PUT"])
    def cap_nhat(id_kh: int):
        ds = doc_du_lieu()
        idx = next((i for i, r in enumerate(ds) if r.get("id") == id_kh), None)
        if idx is None:
            return jsonify({"error": "Không tìm thấy"}), 404
        body = request.get_json(force=True, silent=True) or {}
        body["id"] = id_kh
        ds[idx] = body
        ghi_du_lieu(ds)
        return jsonify(body)

    @bp.route("/<int:id_kh>", methods=["DELETE"])
    def xoa(id_kh: int):
        ds = doc_du_lieu()
        truoc = len(ds)
        ds = [r for r in ds if r.get("id") != id_kh]
        if len(ds) == truoc:
            return jsonify({"error": "Không tìm thấy"}), 404
        ghi_du_lieu(ds)
        return "", 204

    return bp


# ─── Chạy độc lập (thử nghiệm) ───────────────────────────────────────────────
if __name__ == "__main__" and FLASK_OK:
    ung_dung = Flask(__name__)
    bp = tao_blueprint()
    if bp:
        ung_dung.register_blueprint(bp)
    ung_dung.run(host="0.0.0.0", port=3003, debug=True)
    print("[HTQL_550] API Khách hàng: http://localhost:3003/api/khach-hang")
