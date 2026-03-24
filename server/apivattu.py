# -*- coding: utf-8 -*-
"""
API danh mục Vật tư hàng hóa - HTQL_550.
Toàn bộ tên biến và xử lý dùng Tiếng Việt.
Hình ảnh lưu tại: /ssd_2t/htql_550/thietke/vattu/ — Database chỉ lưu tên file.
"""

import os
from pathlib import Path

try:
    from flask import Flask, request, jsonify
except ImportError:
    Flask = None
    request = jsonify = None

from cauhinh import DUONG_DAN_VAT_TU, tao_thu_muc_vat_tu

# Danh sách vật tư mẫu (khi chưa kết nối DB)
danh_sach_vat_tu = [
    {
        "id": 1,
        "ma": "CPMH",
        "ten": "Chi phí mua hàng",
        "tinh_chat": "Hàng hóa",
        "nhom_vthh": "Nhóm chung",
        "dvt_chinh": "Cái",
        "so_luong_ton": 0,
        "gia_tri_ton": 0,
        "kho_ngam_dinh": "Kho chính",
        "tai_khoan_kho": "156",
        "thue_suat_gtgt": 10,
        "duong_dan_hinh_anh": None,
    },
]


def tao_ung_dung():
    tao_thu_muc_vat_tu()
    ung_dung = Flask(__name__)
    ung_dung.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024  # 8MB cho hình ảnh

    @ung_dung.route("/api/vat-tu/danh-sach", methods=["GET"])
    def lay_danh_sach_vat_tu():
        """Lấy danh sách vật tư hàng hóa."""
        return jsonify({"du_lieu": danh_sach_vat_tu, "tong_so": len(danh_sach_vat_tu)})

    @ung_dung.route("/api/vat-tu/them", methods=["POST"])
    def them_vat_tu():
        """Thêm vật tư hàng hóa mới."""
        thong_tin = request.get_json() or {}
        ma = thong_tin.get("ma") or ""
        ten = thong_tin.get("ten") or ""
        if not ma or not ten:
            return jsonify({"loi": "Thiếu Mã hoặc Tên"}), 400
        id_moi = max((v["id"] for v in danh_sach_vat_tu), default=0) + 1
        vat_tu_moi = {
            "id": id_moi,
            "ma": ma,
            "ten": ten,
            "tinh_chat": thong_tin.get("tinh_chat", ""),
            "nhom_vthh": thong_tin.get("nhom_vthh", ""),
            "dvt_chinh": thong_tin.get("dvt_chinh", ""),
            "so_luong_ton": float(thong_tin.get("so_luong_ton", 0)),
            "gia_tri_ton": float(thong_tin.get("gia_tri_ton", 0)),
            "kho_ngam_dinh": thong_tin.get("kho_ngam_dinh", ""),
            "tai_khoan_kho": thong_tin.get("tai_khoan_kho", ""),
            "thue_suat_gtgt": float(thong_tin.get("thue_suat_gtgt", 0)),
            "duong_dan_hinh_anh": None,
        }
        danh_sach_vat_tu.append(vat_tu_moi)
        return jsonify({"thanh_cong": True, "vat_tu": vat_tu_moi})

    @ung_dung.route("/api/vat-tu/hinh-anh", methods=["POST"])
    def tai_len_hinh_anh():
        """Tải lên hình ảnh vật tư. Lưu vào /ssd_2t/htql_550/thietke/vattu/. DB chỉ lưu tên file."""
        ma_vat_tu = request.form.get("ma_vat_tu") or "unknown"
        file_hinh = request.files.get("file")
        if not file_hinh or not file_hinh.filename:
            return jsonify({"loi": "Không có file hình ảnh"}), 400
        phan_mo_rong = Path(file_hinh.filename).suffix or ".jpg"
        ten_file = f"{ma_vat_tu}_{os.urandom(4).hex()}{phan_mo_rong}"
        duong_dan_day_du = os.path.join(DUONG_DAN_VAT_TU, ten_file)
        try:
            file_hinh.save(duong_dan_day_du)
            return jsonify({
                "thanh_cong": True,
                "duong_dan": duong_dan_day_du,
                "ten_file": ten_file,
            })
        except OSError as e:
            return jsonify({"loi": f"Không ghi được file: {e}"}), 500

    return ung_dung


if __name__ == "__main__":
    app = tao_ung_dung()
    app.run(host="0.0.0.0", port=5000, debug=True)
