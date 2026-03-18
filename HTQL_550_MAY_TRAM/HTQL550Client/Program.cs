using System;
using System.Windows.Forms;
using HTQL550Client.Forms;
using HTQL550Client.Utils;

namespace HTQL550Client
{
    internal static class Program
    {
        [STAThread]
        static void Main()
        {
            // Bật hỗ trợ DPI cao và visual styles chuẩn Windows 11
            ApplicationConfiguration.Initialize();
            Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // Bắt lỗi toàn cục — ngăn chương trình crash thầm lặng
            Application.ThreadException += (s, e) => HienThiLoi("Lỗi luồng UI", e.Exception);
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
                HienThiLoi("Lỗi không xử lý được", e.ExceptionObject as Exception);

            // Kiểm tra xem máy trạm đã được cài đặt và cấu hình chưa
            var cauHinh = ConfigManager.TaiCauHinh();

            if (cauHinh == null || !cauHinh.DaCauHinhXong)
            {
                // Lần đầu chạy hoặc chưa cấu hình: mở trình cài đặt
                using var frmCaiDat = new FormCaiDat();
                var ket_qua = frmCaiDat.ShowDialog();

                if (ket_qua != DialogResult.OK)
                {
                    // Người dùng hủy cài đặt — thoát chương trình
                    return;
                }

                // Tải lại cấu hình vừa được lưu bởi trình cài đặt
                cauHinh = ConfigManager.TaiCauHinh();
            }

            // Nếu cấu hình hợp lệ: mở giao diện chính
            if (cauHinh != null && cauHinh.DaCauHinhXong)
            {
                Application.Run(new FormChinh(cauHinh));
            }
            else
            {
                MessageBox.Show(
                    "Không thể tải cấu hình. Vui lòng chạy lại chương trình và thực hiện cài đặt.",
                    "HTQL_550 — Lỗi cấu hình",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            }
        }

        /// <summary>Hiển thị hộp thoại lỗi thân thiện cho người dùng.</summary>
        private static void HienThiLoi(string tieuDe, Exception? ex)
        {
            var thong_bao = ex != null
                ? $"Chi tiết: {ex.Message}\n\nVui lòng liên hệ quản trị viên."
                : "Đã xảy ra lỗi không xác định.";

            MessageBox.Show(thong_bao, $"HTQL_550 — {tieuDe}",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
