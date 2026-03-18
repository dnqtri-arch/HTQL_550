using System;

namespace HTQL550Client.Models
{
    /// <summary>
    /// Mô hình cấu hình kết nối và cài đặt của máy trạm HTQL_550.
    /// Được lưu tại C:\Program Files\HTQL_550\config.json
    /// </summary>
    public class CauHinh
    {
        // ── Thông tin phiên bản ──────────────────────────────────────
        /// <summary>Phiên bản phần mềm hiện tại trên máy trạm.</summary>
        public string PhienBan { get; set; } = "0.1";

        /// <summary>Phiên bản cũ trước khi nâng cấp (rỗng nếu cài lần đầu).</summary>
        public string PhienBanCu { get; set; } = "";

        // ── Cấu hình kết nối mạng ────────────────────────────────────
        /// <summary>Địa chỉ IP của máy chủ Ubuntu.</summary>
        public string IpServer { get; set; } = "14.224.152.48";

        /// <summary>Cổng kết nối API (mặc định 8080).</summary>
        public int PortServer { get; set; } = 8080;

        /// <summary>Sử dụng chế độ LAN (true) hay WAN (false).</summary>
        public bool CheDo_LAN { get; set; } = false;

        // ── Đường dẫn cài đặt trên máy trạm ─────────────────────────
        /// <summary>Thư mục cài đặt chương trình trên máy trạm.</summary>
        public string DuongDanCaiDat { get; set; } = @"C:\Program Files\HTQL_550\";

        // ── Đường dẫn lấy từ server sau khi kết nối ─────────────────
        /// <summary>Thư mục chứa cơ sở dữ liệu (trên server).</summary>
        public string ThuMucDatabase { get; set; } = "";

        /// <summary>Thư mục chứa file thiết kế (trên server).</summary>
        public string ThuMucThietKe { get; set; } = "";

        /// <summary>Thư mục chứa ảnh nặng (trên server).</summary>
        public string ThuMucAnh { get; set; } = "";

        /// <summary>Thư mục chứa bản cập nhật (trên server).</summary>
        public string ThuMucUpdate { get; set; } = "";

        // ── Thông tin hiển thị ───────────────────────────────────────
        /// <summary>Tên máy chủ hiển thị trên Status Bar.</summary>
        public string TenMayChu { get; set; } = "HTQL_550";

        /// <summary>Tên dữ liệu kế toán hiển thị trên Status Bar.</summary>
        public string TenDLKT { get; set; } = "HTQL_550_DL";

        /// <summary>Tên người dùng đang đăng nhập.</summary>
        public string TenNguoiDung { get; set; } = "Administrator";

        // ── Trạng thái ───────────────────────────────────────────────
        /// <summary>Đã hoàn thành cấu hình ban đầu hay chưa.</summary>
        public bool DaCauHinhXong { get; set; } = false;

        /// <summary>Ngày cài đặt hoặc lần cuối cập nhật cấu hình.</summary>
        public DateTime NgayCaiDat { get; set; } = DateTime.Now;
    }
}
