# -*- coding: utf-8 -*-
"""
Cấu hình kết nối mạng HTQL_550.
Tự động nhận diện: nếu ping thấy 192.168.1.68 thì dùng IP LAN, không thì dùng IP Public 14.224.152.48.
"""

import os
import subprocess
import sys

# IP LAN và Public đọc từ biến môi trường, có giá trị mặc định an toàn cho môi trường demo.
IP_LAN = os.getenv("HTQL_IP_LAN", "192.168.1.68")
IP_PUBLIC = os.getenv("HTQL_IP_PUBLIC", "14.224.152.48")
BASE_URL_LAN = f"http://{IP_LAN}:8888"
BASE_URL_PUBLIC = f"http://{IP_PUBLIC}:8888"

# Đường dẫn lưu file thiết kế cho phân hệ Bán hàng và Kho (Ubuntu server)
# Lưu chính tại SSD, backup tại HDD theo chuẩn /ssd_2t/htql_550 và /hdd_4t/htql_550.
PATH_THIETKE = "/ssd_2t/htql_550/thietke/"
PATH_THIETKE_BACKUP = "/hdd_4t/htql_550/thietke/"


def _ping(host: str, timeout_seconds: int = 2) -> bool:
    """Gửi ping tới host, trả về True nếu có phản hồi."""
    param = "-n" if sys.platform.lower() == "win32" else "-c"
    try:
        result = subprocess.run(
            ["ping", param, "1", host],
            capture_output=True,
            timeout=timeout_seconds + 1,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return False


def get_active_ip() -> str:
    """Trả về IP đang dùng: LAN (192.168.1.68) nếu ping được, ngược lại Public (14.224.152.48)."""
    if _ping(IP_LAN):
        return IP_LAN
    return IP_PUBLIC


def get_base_url() -> str:
    """Trả về base URL API tương ứng môi trường (LAN hoặc Public)."""
    if _ping(IP_LAN):
        return BASE_URL_LAN
    return BASE_URL_PUBLIC


def get_path_thietke() -> str:
    """Đường dẫn thư mục lưu file thiết kế (Bán hàng, Kho) trên server Ubuntu (ổ chính)."""
    return PATH_THIETKE


def get_path_thietke_backup() -> str:
    """Đường dẫn thư mục backup file thiết kế (Bán hàng, Kho) trên server Ubuntu (ổ backup)."""
    return PATH_THIETKE_BACKUP


# Cho phép import và dùng ngay
CURRENT_IP = get_active_ip()
BASE_URL = get_base_url()

if __name__ == "__main__":
    ip = get_active_ip()
    url = get_base_url()
    print(f"IP đang dùng: {ip}")
    print(f"Base URL: {url}")
    print(f"Đường dẫn thiết kế (chính): {get_path_thietke()}")
    print(f"Đường dẫn thiết kế (backup): {get_path_thietke_backup()}")
