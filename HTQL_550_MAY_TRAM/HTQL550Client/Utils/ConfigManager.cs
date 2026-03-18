using System;
using System.IO;
using System.Text;
using System.Text.Json;
using HTQL550Client.Models;

namespace HTQL550Client.Utils
{
    /// <summary>
    /// Quản lý đọc/ghi file cấu hình config.json của máy trạm.
    /// Đường dẫn mặc định: C:\Program Files\HTQL_550\config.json
    /// </summary>
    public static class ConfigManager
    {
        /// <summary>Đường dẫn đầy đủ tới file config.json.</summary>
        public static readonly string DuongDanFile =
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                "HTQL_550",
                "config.json"
            );

        private static readonly JsonSerializerOptions _tuyChonDoc = new()
        {
            PropertyNameCaseInsensitive = true,
            ReadCommentHandling = JsonCommentHandling.Skip
        };

        private static readonly JsonSerializerOptions _tuyChonGhi = new()
        {
            WriteIndented = true,       // Xuống dòng dễ đọc
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };

        // ── Đọc cấu hình ─────────────────────────────────────────────

        /// <summary>
        /// Tải cấu hình từ file config.json.
        /// Trả về null nếu file không tồn tại hoặc bị lỗi.
        /// </summary>
        public static CauHinh? TaiCauHinh()
        {
            try
            {
                if (!File.Exists(DuongDanFile)) return null;
                var json = File.ReadAllText(DuongDanFile, Encoding.UTF8);
                return JsonSerializer.Deserialize<CauHinh>(json, _tuyChonDoc);
            }
            catch
            {
                return null;
            }
        }

        // ── Ghi cấu hình ─────────────────────────────────────────────

        /// <summary>
        /// Lưu cấu hình vào file config.json.
        /// Tự động tạo thư mục nếu chưa tồn tại.
        /// </summary>
        public static bool LuuCauHinh(CauHinh cauHinh)
        {
            try
            {
                // Tạo thư mục nếu chưa có
                var thu_muc = Path.GetDirectoryName(DuongDanFile)!;
                if (!Directory.Exists(thu_muc))
                    Directory.CreateDirectory(thu_muc);

                var json = JsonSerializer.Serialize(cauHinh, _tuyChonGhi);
                File.WriteAllText(DuongDanFile, json, Encoding.UTF8);
                return true;
            }
            catch
            {
                return false;
            }
        }

        // ── Tiện ích ─────────────────────────────────────────────────

        /// <summary>Kiểm tra xem đã có file cấu hình và đã cấu hình xong chưa.</summary>
        public static bool DaCauHinh()
        {
            var cau_hinh = TaiCauHinh();
            return cau_hinh != null && cau_hinh.DaCauHinhXong;
        }

        /// <summary>Xóa file cấu hình (dùng khi cần cài đặt lại từ đầu).</summary>
        public static bool XoaCauHinh()
        {
            try
            {
                if (File.Exists(DuongDanFile)) File.Delete(DuongDanFile);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
