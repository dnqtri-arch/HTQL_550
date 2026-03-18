using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace HTQL550Client.Services
{
    /// <summary>
    /// Dịch vụ mạng: tìm server qua UDP Broadcast (LAN), kiểm tra kết nối API, đồng bộ cấu hình từ server.
    /// </summary>
    public static class NetworkService
    {
        private static readonly HttpClient _http = new()
        {
            Timeout = TimeSpan.FromSeconds(10)
        };

        // Port UDP dùng để phát hiện server trong LAN
        private const int PORT_BROADCAST = 50550;

        // ── Tìm server qua UDP Broadcast (chế độ LAN) ────────────────

        /// <summary>
        /// Gửi gói UDP Broadcast trong mạng nội bộ để tìm server HTQL_550.
        /// Server cần lắng nghe port 50550 và phản hồi chuỗi "HTQL550_SERVER:".
        /// </summary>
        /// <param name="thoiGianMs">Thời gian chờ tối đa (ms).</param>
        /// <returns>Danh sách IP server tìm được trong LAN.</returns>
        public static async Task<List<string>> TimServerLAN(int thoiGianMs = 3000)
        {
            var danh_sach_ip = new List<string>();

            try
            {
                using var udp = new UdpClient();
                udp.EnableBroadcast = true;

                // Gửi gói tìm kiếm đến tất cả thiết bị trong mạng
                var tin_nhan = Encoding.UTF8.GetBytes("HTQL550_DISCOVER");
                await udp.SendAsync(tin_nhan, tin_nhan.Length,
                    new IPEndPoint(IPAddress.Broadcast, PORT_BROADCAST));

                // Lắng nghe phản hồi trong khoảng thời gian cho phép
                using var cts = new CancellationTokenSource(thoiGianMs);
                while (!cts.IsCancellationRequested)
                {
                    var ket_qua = await udp.ReceiveAsync(cts.Token);
                    var phan_hoi = Encoding.UTF8.GetString(ket_qua.Buffer);

                    if (phan_hoi.StartsWith("HTQL550_SERVER:"))
                    {
                        var ip = ket_qua.RemoteEndPoint.Address.ToString();
                        if (!danh_sach_ip.Contains(ip))
                            danh_sach_ip.Add(ip);
                    }
                }
            }
            catch (OperationCanceledException) { /* Hết thời gian chờ — bình thường */ }
            catch { /* Bỏ qua lỗi mạng khác */ }

            return danh_sach_ip;
        }

        // ── Kiểm tra kết nối tới server ──────────────────────────────

        /// <summary>
        /// Gọi API GET /api/ping để xác nhận server đang hoạt động.
        /// </summary>
        /// <returns>Cặp (ThanhCong, ThongBao mô tả kết quả hoặc nguyên nhân lỗi).</returns>
        public static async Task<(bool ThanhCong, string ThongBao)> KiemTraKetNoi(string ip, int port)
        {
            try
            {
                var url = $"http://{ip}:{port}/api/ping";
                var phan_hoi = await _http.GetAsync(url);

                if (phan_hoi.IsSuccessStatusCode)
                    return (true, $"✔ Kết nối thành công! (HTTP {(int)phan_hoi.StatusCode})");

                return (false, $"✘ Server phản hồi mã lỗi HTTP {(int)phan_hoi.StatusCode}.");
            }
            catch (HttpRequestException ex) when (ex.Message.Contains("refused"))
            {
                return (false, "✘ Thất bại: Server từ chối kết nối — kiểm tra lại Firewall hoặc Port.");
            }
            catch (TaskCanceledException)
            {
                return (false, "✘ Thất bại: Timeout — Server không phản hồi trong 10 giây.");
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("No such host"))
                    return (false, "✘ Thất bại: Sai địa chỉ IP hoặc host không tồn tại.");
                return (false, $"✘ Lỗi: {ex.Message}");
            }
        }

        // ── Lấy cấu hình đường dẫn từ server ────────────────────────

        /// <summary>
        /// Gọi API GET /api/cau-hinh để lấy các đường dẫn lưu trữ trên server.
        /// </summary>
        public static async Task<DuongDanServer?> LayDuongDanTuServer(string ip, int port)
        {
            try
            {
                var url = $"http://{ip}:{port}/api/cau-hinh";
                var json = await _http.GetStringAsync(url);
                return JsonSerializer.Deserialize<DuongDanServer>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }
            catch
            {
                return null;
            }
        }

        // ── Kiểm tra phiên bản mới ───────────────────────────────────

        /// <summary>
        /// Gọi API GET /api/phien-ban để lấy phiên bản mới nhất trên server.
        /// </summary>
        public static async Task<string?> LayPhienBanMoi(string ip, int port)
        {
            try
            {
                var url = $"http://{ip}:{port}/api/phien-ban";
                var json = await _http.GetStringAsync(url);
                using var doc = JsonDocument.Parse(json);
                return doc.RootElement.GetProperty("phienBan").GetString();
            }
            catch
            {
                return null;
            }
        }
    }

    /// <summary>Model chứa đường dẫn lưu trữ trả về từ server.</summary>
    public class DuongDanServer
    {
        public string ThuMucDatabase { get; set; } = "";
        public string ThuMucThietKe { get; set; } = "";
        public string ThuMucAnh      { get; set; } = "";
        public string ThuMucUpdate   { get; set; } = "";
    }
}
