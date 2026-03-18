using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Win32;

namespace HTQL550Client.Services
{
    /// <summary>
    /// Dịch vụ file: liệt kê file từ server, tải về máy trạm, mở bằng CorelDRAW, ghi nhật ký.
    /// Thư mục tạm cục bộ: C:\HTQL_550_Temp\
    /// </summary>
    public static class FileService
    {
        private static readonly HttpClient _http = new() { Timeout = TimeSpan.FromMinutes(5) };

        /// <summary>Thư mục tạm để chứa file tải về trên máy trạm.</summary>
        public const string THU_MUC_TAM = @"C:\HTQL_550_Temp\";

        // ── Liệt kê file từ server ────────────────────────────────────

        /// <summary>
        /// Lấy danh sách file thiết kế từ API GET /api/files.
        /// </summary>
        public static async Task<List<ThongTinFile>> LayDanhSachFile(string ip, int port)
        {
            try
            {
                var url  = $"http://{ip}:{port}/api/files";
                var json = await _http.GetStringAsync(url);
                return JsonSerializer.Deserialize<List<ThongTinFile>>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                    ?? new List<ThongTinFile>();
            }
            catch
            {
                return new List<ThongTinFile>();
            }
        }

        // ── Tải file về máy trạm ──────────────────────────────────────

        /// <summary>
        /// Tải một file thiết kế từ server về thư mục tạm C:\HTQL_550_Temp\.
        /// </summary>
        /// <returns>(ThanhCong, đường dẫn file hoặc thông báo lỗi)</returns>
        public static async Task<(bool ThanhCong, string DuongDanHoacLoi)> TaiFile(
            string ip, int port, string tenFile, IProgress<int>? tienTrinh = null)
        {
            try
            {
                // Đảm bảo thư mục tạm tồn tại
                if (!Directory.Exists(THU_MUC_TAM))
                    Directory.CreateDirectory(THU_MUC_TAM);

                tienTrinh?.Report(10);

                var url      = $"http://{ip}:{port}/api/files/{Uri.EscapeDataString(tenFile)}";
                var du_lieu  = await _http.GetByteArrayAsync(url);

                tienTrinh?.Report(80);

                var duong_dan = Path.Combine(THU_MUC_TAM, tenFile);
                await File.WriteAllBytesAsync(duong_dan, du_lieu);

                tienTrinh?.Report(100);
                return (true, duong_dan);
            }
            catch (Exception ex)
            {
                return (false, $"Lỗi tải file: {ex.Message}");
            }
        }

        // ── Tìm CorelDRAW trong Registry ─────────────────────────────

        /// <summary>
        /// Quét Registry Windows để tìm đường dẫn file thực thi CorelDRAW.
        /// Kiểm tra các phiên bản từ mới đến cũ: X9 (v21) → v24 (2022).
        /// </summary>
        public static string? TimCorelDRAW()
        {
            // Các khóa Registry cần kiểm tra (ưu tiên phiên bản mới trước)
            string[] cac_khoa =
            {
                @"SOFTWARE\Corel\CorelDRAW\25",  // 2023
                @"SOFTWARE\Corel\CorelDRAW\24",  // 2022
                @"SOFTWARE\Corel\CorelDRAW\23",  // 2021
                @"SOFTWARE\Corel\CorelDRAW\22",  // 2020
                @"SOFTWARE\Corel\CorelDRAW\21",  // X9
                @"SOFTWARE\Corel\CorelDRAW",
                @"SOFTWARE\WOW6432Node\Corel\CorelDRAW",
            };

            foreach (var khoa in cac_khoa)
            {
                using var reg = Registry.LocalMachine.OpenSubKey(khoa);
                if (reg == null) continue;

                // Thử các tên giá trị khác nhau tùy phiên bản
                foreach (var tenGiaTri in new[] { "ExecPath", "InstallPath", "AppPath" })
                {
                    var thu_muc = reg.GetValue(tenGiaTri) as string;
                    if (string.IsNullOrEmpty(thu_muc)) continue;

                    foreach (var tenExe in new[] { "CorelDRW.exe", "CDRAW.exe", "CorelDraw.exe" })
                    {
                        var duong_dan = Path.Combine(thu_muc, tenExe);
                        if (File.Exists(duong_dan)) return duong_dan;
                    }
                }
            }
            return null;
        }

        // ── Mở file bằng CorelDRAW ────────────────────────────────────

        /// <summary>
        /// Mở một file thiết kế bằng CorelDRAW đã cài trên máy.
        /// </summary>
        public static (bool ThanhCong, string ThongBao) MoVoiCorel(string duongDanFile)
        {
            var corel = TimCorelDRAW();
            if (corel == null)
                return (false, "Không tìm thấy CorelDRAW trên máy này. Vui lòng cài đặt CorelDRAW.");

            if (!File.Exists(duongDanFile))
                return (false, $"File không tồn tại: {duongDanFile}");

            try
            {
                Process.Start(new ProcessStartInfo(corel, $"\"{duongDanFile}\"")
                {
                    UseShellExecute = false
                });
                return (true, $"Đã mở file bằng CorelDRAW.\nFile: {duongDanFile}");
            }
            catch (Exception ex)
            {
                return (false, $"Không thể khởi động CorelDRAW: {ex.Message}");
            }
        }

        // ── Ghi nhật ký thao tác ─────────────────────────────────────

        /// <summary>
        /// Gửi nhật ký về server qua API POST /api/logs.
        /// Ghi lại: ai mở, file nào, lúc nào, hành động gì.
        /// </summary>
        public static async Task GhiNhatKy(
            string ip, int port,
            string tenFile, string nguoiDung, string hanhDong)
        {
            try
            {
                var nhat_ky = new
                {
                    NguoiDung = nguoiDung,
                    TenFile   = tenFile,
                    HanhDong  = hanhDong,
                    ThoiGian  = DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"),
                    MayTram   = Environment.MachineName
                };

                var json    = JsonSerializer.Serialize(nhat_ky);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                await _http.PostAsync($"http://{ip}:{port}/api/logs", content);
            }
            catch
            {
                // Nhật ký không gửi được: bỏ qua, không làm gián đoạn luồng chính
            }
        }
    }

    /// <summary>Thông tin một file thiết kế trả về từ server.</summary>
    public class ThongTinFile
    {
        public string TenFile    { get; set; } = "";
        public string DuongDan   { get; set; } = "";
        public long   KichThuoc  { get; set; } = 0;
        public string NgaySuaDoi { get; set; } = "";
        public string MoTa       { get; set; } = "";
    }
}
