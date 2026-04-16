# -*- coding: utf-8 -*-
"""
Cấu hình backend HTQL_550.
Đường dẫn lưu hình ảnh vật tư: /ssd_2t/htql_550/thietke/vattu/
"""

import os

# Đường dẫn lưu hình ảnh vật tư (Ubuntu server). Database chỉ lưu tên file.
# Dùng biến môi trường HTQL_550_VATTU hoặc PATH_SSD_2T từ .env
DUONG_DAN_VAT_TU = os.environ.get("HTQL_550_VATTU") or (
    (os.environ.get("PATH_SSD_2T") or "/ssd_2t/htql_550") + "/thietke/vattu/"
)

# Kết nối PostgreSQL (tiếng Việt: biến môi trường)
CSDL_HOST = os.environ.get("HTQL_550_DB_HOST", "localhost")
CSDL_PORT = int(os.environ.get("HTQL_550_DB_PORT", "5432"))
CSDL_TEN = os.environ.get("HTQL_550_DB_NAME", "htql_550")
CSDL_USER = os.environ.get("HTQL_550_DB_USER", "postgres")
CSDL_MAT_KHAU = os.environ.get("HTQL_550_DB_PASSWORD", "")

def tao_thu_muc_vat_tu():
    """Tạo thư mục lưu hình ảnh vật tư nếu chưa có."""
    os.makedirs(DUONG_DAN_VAT_TU, exist_ok=True)
