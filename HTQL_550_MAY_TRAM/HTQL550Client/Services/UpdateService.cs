using System;
using System.IO;
using System.IO.Compression;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace HTQL550Client.Services
{
    /// <summary>
    /// Dịch vụ cập nhật tự động: kiểm tra phiên bản mới trên server và tải về cài đè.
    /// Khi khởi động, chương trình gọi KiemTraCapNhat() và thông báo nếu có bản mới.
    /// </summary>
    public static class UpdateService
    {
        private static readonly HttpClient _http = new() { Timeout = TimeSpan.FromMinutes(15) };

        /// <summary>Phiên bản hiện tại của phần mềm máy trạm.</summary>
        public const string PHIEN_BAN_HIEN_TAI = "0.1";

        // ── Kiểm tra phiên bản ────────────────────────────────────────

        /// <summary>
        /// Gọi API GET /api/phien-ban để so sánh với phiên bản hiện tại.
        /// </summary>
        /// <returns>(CoBanMoi, chuỗi phiên bản mới nếu có)</returns>
        public static async Task<(bool CoBanMoi, string PhienBanMoi)> KiemTraCapNhat(string ip, int port)
        {
            try
            {
                var url  = $"http://{ip}:{port}/api/phien-ban";
                var json = await _http.GetStringAsync(url);

                using var doc         = JsonDocument.Parse(json);
                var       phien_ban_moi = doc.RootElement.GetProperty("phienBan").GetString() ?? "";

                // So sánh chuỗi phiên bản (VD: "0.2" > "0.1")
                var co_ban_moi = string.Compare(phien_ban_moi, PHIEN_BAN_HIEN_TAI,
                    StringComparison.Ordinal) > 0;

                return (co_ban_moi, phien_ban_moi);
            }
            catch
            {
                // Không kết nối được: coi như chưa có bản mới
                return (false, "");
            }
        }

        // ── Tải và cài bản cập nhật ───────────────────────────────────

        /// <summary>
        /// Tải file ZIP cập nhật từ /update/ trên server, giải nén và cài đè vào thư mục cài đặt.
        /// </summary>
        /// <param name="tienTrinh">Callback báo cáo tiến trình 0–100%.</param>
        public static async Task<(bool ThanhCong, string ThongBao)> TaiVaCapNhat(
            string ip, int port, string duongDanCaiDat,
            IProgress<int>? tienTrinh = null)
        {
            var duong_dan_zip = Path.Combine(Path.GetTempPath(), "HTQL550_Update.zip");

            try
            {
                // Bước 1: Tải file ZIP từ server
                tienTrinh?.Report(10);
                var url      = $"http://{ip}:{port}/update/HTQL550Client.zip";
                var du_lieu  = await _http.GetByteArrayAsync(url);
                tienTrinh?.Report(50);

                // Bước 2: Lưu file ZIP tạm
                await File.WriteAllBytesAsync(duong_dan_zip, du_lieu);
                tienTrinh?.Report(70);

                // Bước 3: Giải nén vào thư mục cài đặt (ghi đè file cũ)
                if (!Directory.Exists(duongDanCaiDat))
                    Directory.CreateDirectory(duongDanCaiDat);

                ZipFile.ExtractToDirectory(duong_dan_zip, duongDanCaiDat, overwriteFiles: true);
                tienTrinh?.Report(95);

                // Bước 4: Dọn file tạm
                File.Delete(duong_dan_zip);
                tienTrinh?.Report(100);

                return (true, "Cập nhật thành công! Vui lòng khởi động lại chương trình để áp dụng.");
            }
            catch (Exception ex)
            {
                // Dọn file tạm nếu có lỗi
                if (File.Exists(duong_dan_zip))
                    try { File.Delete(duong_dan_zip); } catch { }

                return (false, $"Lỗi cập nhật: {ex.Message}");
            }
        }
    }
}
