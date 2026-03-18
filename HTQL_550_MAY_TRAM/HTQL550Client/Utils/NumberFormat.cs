using System;
using System.Globalization;

namespace HTQL550Client.Utils
{
    /// <summary>
    /// Định dạng số theo chuẩn Việt Nam: dấu chấm (.) phân cách hàng nghìn, dấu phẩy (,) thập phân.
    /// Tuân thủ number-format.mdc: hiển thị dấu phẩy cho người dùng, convert sang dấu chấm khi tính toán.
    /// Ví dụ: 1.250.000 | 1.250.000,50 | 99,5%
    /// </summary>
    public static class NumberFormat
    {
        // Locale Việt Nam: dấu chấm hàng nghìn, dấu phẩy thập phân
        private static readonly CultureInfo VN = new CultureInfo("vi-VN");

        // ── Định dạng để hiển thị ────────────────────────────────────

        /// <summary>Định dạng số tiền nguyên (không thập phân). VD: 1250000 → "1.250.000"</summary>
        public static string DinhDangTien(decimal soTien) =>
            soTien.ToString("N0", VN);

        /// <summary>Định dạng số tiền có 2 chữ số thập phân. VD: 1250000.5 → "1.250.000,50"</summary>
        public static string DinhDangTienChiTiet(decimal soTien) =>
            soTien.ToString("N2", VN);

        /// <summary>Định dạng số lượng, bỏ số 0 thừa sau dấu phẩy. VD: 1,50 → "1,5"</summary>
        public static string DinhDangSoLuong(decimal soLuong)
        {
            if (soLuong == Math.Floor(soLuong))
                return soLuong.ToString("N0", VN);
            return soLuong.ToString("N2", VN).TrimEnd('0').TrimEnd(',');
        }

        /// <summary>Định dạng phần trăm. VD: 10.5 → "10,50%"</summary>
        public static string DinhDangPhanTram(decimal giaTri) =>
            giaTri.ToString("N2", VN) + "%";

        // ── Phân tích (parse) từ chuỗi VN về số ─────────────────────

        /// <summary>
        /// Chuyển chuỗi định dạng VN về decimal để tính toán nội bộ.
        /// Chấp nhận: "1.250.000" → 1250000M | "1.250,50" → 1250.5M
        /// </summary>
        public static decimal PhanTichSo(string chuoi)
        {
            if (string.IsNullOrWhiteSpace(chuoi)) return 0;

            // Xóa dấu chấm hàng nghìn, đổi dấu phẩy thập phân thành chấm
            var chuan_hoa = chuoi.Replace(".", "").Replace(",", ".");
            return decimal.TryParse(chuan_hoa, NumberStyles.Any, CultureInfo.InvariantCulture, out var ket_qua)
                ? ket_qua
                : 0;
        }

        // ── Xử lý ô TextBox nhập số ──────────────────────────────────

        /// <summary>
        /// Gắn sự kiện vào TextBox để tự động định dạng số tiền khi người dùng nhập.
        /// Dùng trong Form: NumberFormat.GanSuKienNhapTien(txtGiaTri);
        /// </summary>
        public static void GanSuKienNhapTien(System.Windows.Forms.TextBox txt)
        {
            txt.Leave += (s, e) =>
            {
                var so = PhanTichSo(txt.Text);
                if (so != 0) txt.Text = DinhDangTien(so);
            };
            txt.Enter += (s, e) =>
            {
                // Khi focus vào: hiển thị số thuần để dễ sửa
                var so = PhanTichSo(txt.Text);
                txt.Text = so == 0 ? "" : so.ToString(CultureInfo.InvariantCulture);
                txt.SelectAll();
            };
        }
    }
}
