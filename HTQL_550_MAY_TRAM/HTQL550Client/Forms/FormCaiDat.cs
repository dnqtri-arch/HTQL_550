using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using HTQL550Client.Models;
using HTQL550Client.Services;
using HTQL550Client.Utils;

namespace HTQL550Client.Forms
{
    /// <summary>
    /// Trình cài đặt HTQL_550 Client — Demo v0.1.
    /// Gồm 5 bước: Xác thực → Phiên bản → Cấu hình mạng → Đồng bộ server → Kết quả.
    /// </summary>
    public class FormCaiDat : Form
    {
        // ── Hằng số bảo mật ───────────────────────────────────────────
        // SHA-256 của mật khẩu cài đặt "dnqTri@1803"
        // (Không lưu mật khẩu thô trong code — dùng hash để so sánh)
        private const string HASH_MAT_KHAU =
            "3e1b2d4f6a8c0e2d4f6b8d0e2f4a6c8e0b2d4f6a8c0e3b1d4f6a8c0e2d4f6b8";
        // Lưu ý: Hằng số trên là placeholder — thay bằng SHA-256 thực của "dnqTri@1803"
        // trước khi build production (xem README.md để biết cách tạo hash).

        // Trong môi trường Demo, so sánh trực tiếp (xem cuối file)
        private const string MAT_KHAU_DEMO = "dnqTri@1803";

        // ── Điều hướng bước ───────────────────────────────────────────
        private int _buocHienTai = 0;
        private readonly Panel[] _cacPanel;

        // ── Dữ liệu cài đặt ──────────────────────────────────────────
        private string _ipServer  = "14.224.152.48";
        private int    _portServer = 8080;
        private bool   _cheDo_LAN = false;
        private string _duongDanCaiDat = @"C:\Program Files\HTQL_550\";
        private DuongDanServer? _duongDanServer;

        // ── Controls toàn cục ─────────────────────────────────────────
        private Button  _btnTiepTheo  = null!;
        private Button  _btnQuayLai   = null!;
        private Label   _lblBuoc      = null!;
        private Panel   _pnlTienTrinh = null!;

        // Bước 1 — Mật khẩu
        private TextBox _txtMatKhau = null!;
        private Label   _lblKetQuaXacThuc = null!;

        // Bước 3 — Cấu hình mạng
        private RadioButton _rdLAN = null!, _rdWAN = null!;
        private ListBox     _lstServerLAN  = null!;
        private TextBox     _txtIpWAN      = null!;
        private NumericUpDown _numPort     = null!;
        private Label       _lblKetQuaKN  = null!;
        private Button      _btnKiemTra   = null!;
        private Button      _btnTimLAN    = null!;

        // Bước 5 — Kết quả
        private RichTextBox _rtbTomTat = null!;

        public FormCaiDat()
        {
            // Khởi tạo form
            Text            = "Trình cài đặt HTQL_550 Client — v0.1";
            Size            = new Size(640, 520);
            StartPosition   = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox     = false;
            MinimizeBox     = false;
            BackColor       = Color.White;
            Font            = new Font("Segoe UI", 9.5f);

            XayDungGiaoDien();

            // Khởi tạo mảng panel theo thứ tự bước
            _cacPanel = new[]
            {
                _pnlBuoc1_MatKhau(),
                _pnlBuoc2_PhienBan(),
                _pnlBuoc3_CauHinhMang(),
                _pnlBuoc4_DuongDan(),
                _pnlBuoc5_KetQua()
            };

            foreach (var pnl in _cacPanel)
            {
                pnl.Visible = false;
                Controls.Add(pnl);
            }

            HienThiBuoc(0);
        }

        // ── Khung giao diện chính ─────────────────────────────────────

        private void XayDungGiaoDien()
        {
            // Header màu cam với logo
            var pnlHeader = new Panel
            {
                Dock      = DockStyle.Top,
                Height    = 80,
                BackColor = Color.FromArgb(220, 80, 20)
            };

            var lblTieuDe = new Label
            {
                Text      = "HTQL_550",
                Font      = new Font("Segoe UI", 20, FontStyle.Bold),
                ForeColor = Color.White,
                Location  = new Point(24, 12),
                AutoSize  = true
            };
            var lblPhienBan = new Label
            {
                Text      = "Trình cài đặt máy trạm — Demo v0.1",
                Font      = new Font("Segoe UI", 10),
                ForeColor = Color.FromArgb(255, 200, 170),
                Location  = new Point(26, 48),
                AutoSize  = true
            };
            pnlHeader.Controls.AddRange(new Control[] { lblTieuDe, lblPhienBan });
            Controls.Add(pnlHeader);

            // Thanh tiến trình bước (dòng dẫn)
            _pnlTienTrinh = new Panel
            {
                Location  = new Point(0, 80),
                Size      = new Size(640, 36),
                BackColor = Color.FromArgb(245, 245, 245)
            };
            _lblBuoc = new Label
            {
                Text      = "Bước 1 / 5: Xác thực",
                Font      = new Font("Segoe UI", 9, FontStyle.Bold),
                ForeColor = Color.FromArgb(100, 100, 100),
                Location  = new Point(16, 10),
                AutoSize  = true
            };
            _pnlTienTrinh.Controls.Add(_lblBuoc);
            Controls.Add(_pnlTienTrinh);

            // Footer với nút điều hướng
            var pnlFooter = new Panel
            {
                Dock      = DockStyle.Bottom,
                Height    = 56,
                BackColor = Color.FromArgb(245, 245, 245)
            };

            _btnQuayLai = new Button
            {
                Text     = "◀ Quay lại",
                Size     = new Size(110, 34),
                Location = new Point(380, 11),
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.White,
                ForeColor = Color.FromArgb(80, 80, 80)
            };
            _btnQuayLai.FlatAppearance.BorderColor = Color.FromArgb(200, 200, 200);
            _btnQuayLai.Click += (s, e) => HienThiBuoc(_buocHienTai - 1);

            _btnTiepTheo = new Button
            {
                Text      = "Tiếp theo ▶",
                Size      = new Size(130, 34),
                Location  = new Point(498, 11),
                BackColor = Color.FromArgb(220, 80, 20),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font      = new Font("Segoe UI", 9.5f, FontStyle.Bold)
            };
            _btnTiepTheo.FlatAppearance.BorderSize = 0;
            _btnTiepTheo.Click += OnTiepTheoClick;

            var btnHuy = new Button
            {
                Text      = "Hủy",
                Size      = new Size(80, 34),
                Location  = new Point(16, 11),
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.White,
                ForeColor = Color.FromArgb(160, 40, 40)
            };
            btnHuy.FlatAppearance.BorderColor = Color.FromArgb(200, 200, 200);
            btnHuy.Click += (s, e) => Close();

            pnlFooter.Controls.AddRange(new Control[] { btnHuy, _btnQuayLai, _btnTiepTheo });
            Controls.Add(pnlFooter);
        }

        // ── Điều hướng bước ──────────────────────────────────────────

        private void HienThiBuoc(int buoc)
        {
            if (buoc < 0 || buoc >= _cacPanel.Length) return;

            foreach (var pnl in _cacPanel) pnl.Visible = false;
            _cacPanel[buoc].Visible = true;
            _buocHienTai            = buoc;

            string[] tenBuoc =
            {
                "Bước 1 / 5: Xác thực mật khẩu",
                "Bước 2 / 5: Kiểm tra phiên bản",
                "Bước 3 / 5: Cấu hình mạng",
                "Bước 4 / 5: Chọn đường dẫn cài đặt",
                "Bước 5 / 5: Hoàn tất"
            };
            _lblBuoc.Text    = tenBuoc[buoc];
            _btnQuayLai.Enabled = buoc > 0;
            _btnTiepTheo.Text   = buoc == 4 ? "✔ Hoàn tất" : "Tiếp theo ▶";

            // Khi vào bước 2: load thông tin phiên bản
            if (buoc == 1) NapThongTinPhienBan();
        }

        private async void OnTiepTheoClick(object? sender, EventArgs e)
        {
            if (_buocHienTai == 0 && !XacThucMatKhau()) return;
            if (_buocHienTai == 4)
            {
                await HoanTatCaiDat();
                return;
            }
            HienThiBuoc(_buocHienTai + 1);
        }

        // ── Bước 1: Xác thực mật khẩu ────────────────────────────────

        private Panel _pnlBuoc1_MatKhau()
        {
            var pnl = TaoPanelNoi();

            var lbl = TaoLabel("🔐  Nhập mật khẩu cài đặt để tiếp tục:", 24, 24);
            lbl.Font = new Font("Segoe UI", 11, FontStyle.Bold);

            _txtMatKhau = new TextBox
            {
                Location        = new Point(24, 60),
                Width           = 300,
                PasswordChar    = '●',
                Font            = new Font("Segoe UI", 12),
                Height          = 32
            };
            _txtMatKhau.KeyDown += (s, e) => { if (e.KeyCode == Keys.Enter) XacThucMatKhau(); };

            _lblKetQuaXacThuc = TaoLabel("", 24, 102);
            _lblKetQuaXacThuc.ForeColor = Color.Red;

            var lblGhiChu = TaoLabel("Liên hệ quản trị viên nếu quên mật khẩu.", 24, 136);
            lblGhiChu.ForeColor = Color.Gray;
            lblGhiChu.Font = new Font("Segoe UI", 8.5f, FontStyle.Italic);

            pnl.Controls.AddRange(new Control[] { lbl, _txtMatKhau, _lblKetQuaXacThuc, lblGhiChu });
            return pnl;
        }

        private bool XacThucMatKhau()
        {
            // So sánh trực tiếp (Demo) — Production nên dùng SHA-256 hash
            if (_txtMatKhau.Text == MAT_KHAU_DEMO)
            {
                _lblKetQuaXacThuc.ForeColor = Color.Green;
                _lblKetQuaXacThuc.Text      = "✔ Xác thực thành công!";
                return true;
            }
            _lblKetQuaXacThuc.ForeColor = Color.Red;
            _lblKetQuaXacThuc.Text      = "✘ Mật khẩu không đúng. Vui lòng thử lại.";
            _txtMatKhau.Clear();
            _txtMatKhau.Focus();
            return false;
        }

        // ── Bước 2: Kiểm tra phiên bản ───────────────────────────────

        private Label _lblPhienBanCu  = null!;
        private Label _lblTrangThai   = null!;

        private Panel _pnlBuoc2_PhienBan()
        {
            var pnl = TaoPanelNoi();

            var lbl = TaoLabel("📋  Thông tin phiên bản", 24, 24);
            lbl.Font = new Font("Segoe UI", 11, FontStyle.Bold);

            TaoHangThongTin(pnl, "Phiên bản hiện tại:", UpdateService.PHIEN_BAN_HIEN_TAI, 70);

            _lblPhienBanCu = TaoLabelPhai("(chưa xác định)", 24, 100);
            TaoLabel("Phiên bản đã cài:", 24, 100, pnl);

            _lblTrangThai = TaoLabelPhai("", 24, 130);
            TaoLabel("Trạng thái:", 24, 130, pnl);
            _lblTrangThai.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);

            var ghi_chu = TaoLabel("Nhấn \"Tiếp theo\" sau khi kiểm tra thông tin phiên bản.", 24, 180);
            ghi_chu.ForeColor = Color.Gray;
            ghi_chu.Font = new Font("Segoe UI", 8.5f, FontStyle.Italic);

            pnl.Controls.AddRange(new Control[] { lbl, _lblPhienBanCu, _lblTrangThai, ghi_chu });
            return pnl;
        }

        private void NapThongTinPhienBan()
        {
            var cau_hinh_cu = ConfigManager.TaiCauHinh();
            if (cau_hinh_cu != null && !string.IsNullOrEmpty(cau_hinh_cu.PhienBan))
            {
                _lblPhienBanCu.Text      = cau_hinh_cu.PhienBan;
                _lblTrangThai.Text       = "Nâng cấp phiên bản";
                _lblTrangThai.ForeColor  = Color.DarkOrange;
            }
            else
            {
                _lblPhienBanCu.Text      = "(Chưa cài đặt)";
                _lblTrangThai.Text       = "Cài đặt mới";
                _lblTrangThai.ForeColor  = Color.Green;
            }
        }

        // ── Bước 3: Cấu hình mạng ────────────────────────────────────

        // Panel chứa khu vực tìm LAN (ẩn/hiện theo chế độ)
        private Panel _pnlKhuVucLAN  = null!;
        // Panel chứa khu vực nhập Online (ẩn/hiện theo chế độ)
        private Panel _pnlKhuVucOnline = null!;
        // Nhãn tên hai ô nhập (để đặt lại placeholder)
        private Label _lblIpTieuDe = null!, _lblPortTieuDe = null!;

        private Panel _pnlBuoc3_CauHinhMang()
        {
            var pnl = TaoPanelNoi();

            var lbl = TaoLabel("🌐  Chọn chế độ kết nối tới máy chủ", 24, 16);
            lbl.Font = new Font("Segoe UI", 11, FontStyle.Bold);

            // ── Hai lựa chọn chế độ ──────────────────────────────────
            _rdLAN = new RadioButton
            {
                Text     = "🔒  Offline  (Tìm server tự động trong mạng nội bộ)",
                Location = new Point(24, 52),
                Width    = 430,
                Height   = 24,
                Checked  = true,    // Offline là mặc định
                Font     = new Font("Segoe UI", 10, FontStyle.Bold),
                ForeColor = Color.FromArgb(30, 100, 30)
            };
            _rdWAN = new RadioButton
            {
                Text     = "🌍  Online   (Nhập địa chỉ server từ xa)",
                Location = new Point(24, 80),
                Width    = 430,
                Height   = 24,
                Checked  = false,
                Font     = new Font("Segoe UI", 10, FontStyle.Bold),
                ForeColor = Color.FromArgb(30, 60, 140)
            };

            // ── Khu vực Offline: Tìm kiếm LAN ───────────────────────
            _pnlKhuVucLAN = new Panel
            {
                Location  = new Point(0, 112),
                Size      = new Size(600, 100),
                BackColor = Color.FromArgb(245, 252, 245)
            };

            _lstServerLAN = new ListBox
            {
                Location = new Point(24, 8),
                Size     = new Size(268, 72),
                Font     = new Font("Courier New", 9.5f)
            };
            // Sự kiện chọn server sẽ được đăng ký động trong OnTimServerLAN()
            // sau khi dò xong IP + Port (tránh xử lý item lỗi).

            _btnTimLAN = new Button
            {
                Text      = "🔍 Tìm server LAN",
                Location  = new Point(300, 8),
                Size      = new Size(172, 36),
                BackColor = Color.FromArgb(30, 100, 30),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font      = new Font("Segoe UI", 9.5f, FontStyle.Bold)
            };
            _btnTimLAN.FlatAppearance.BorderSize = 0;
            _btnTimLAN.Click += OnTimServerLAN;

            var lblGhiChuLAN = new Label
            {
                Location  = new Point(24, 84),
                Width     = 448,
                Font      = new Font("Segoe UI", 7.5f, FontStyle.Italic),
                ForeColor = Color.FromArgb(100, 120, 100),
                Text      = "💡 Máy trạm và server phải cùng mạng nội bộ. Port UDP 50550 cần được mở."
            };
            _pnlKhuVucLAN.Controls.AddRange(new Control[] { _lstServerLAN, _btnTimLAN, lblGhiChuLAN });

            // ── Khu vực Online: Nhập IP và Port thủ công ────────────
            _pnlKhuVucOnline = new Panel
            {
                Location  = new Point(0, 112),
                Size      = new Size(600, 100),
                BackColor = Color.FromArgb(245, 248, 255),
                Visible   = false   // Ẩn mặc định
            };

            _lblIpTieuDe = new Label
            {
                Text      = "Địa chỉ IP server:",
                Location  = new Point(24, 14),
                AutoSize  = true,
                Font      = new Font("Segoe UI", 9.5f)
            };
            _txtIpWAN = new TextBox
            {
                Location    = new Point(160, 11),
                Width       = 180,
                Text        = "",                       // Để trống — người dùng phải tự nhập
                Font        = new Font("Courier New", 10),
                PlaceholderText = "VD: 14.224.152.48"  // Gợi ý mờ, không điền sẵn
            };

            _lblPortTieuDe = new Label
            {
                Text      = "Cổng (Port):",
                Location  = new Point(358, 14),
                AutoSize  = true,
                Font      = new Font("Segoe UI", 9.5f)
            };
            _numPort = new NumericUpDown
            {
                Location  = new Point(448, 11),
                Width     = 80,
                // Cho phép 0 để biểu diễn \"chưa nhập\" (Online bắt nhập thủ công)
                Minimum   = 0,
                Maximum   = 65535,
                Value     = 8080,                       // Offline dùng mặc định; Online sẽ reset về 0 khi chọn chế độ
                Font      = new Font("Segoe UI", 9.5f)
            };

            var lblBaoMatOnline = new Label
            {
                Location  = new Point(24, 44),
                Width     = 504,
                Height    = 40,
                Font      = new Font("Segoe UI", 8f, FontStyle.Italic),
                ForeColor = Color.FromArgb(130, 80, 30),
                Text      = "🔐 Bảo mật: Không lưu địa chỉ IP mặc định. Vui lòng nhập thủ công địa chỉ và cổng "
                          + "do quản trị viên cung cấp."
            };
            _pnlKhuVucOnline.Controls.AddRange(new Control[]
            {
                _lblIpTieuDe, _txtIpWAN, _lblPortTieuDe, _numPort, lblBaoMatOnline
            });

            // ── Nút kiểm tra kết nối (dùng chung 2 chế độ) ──────────
            _btnKiemTra = new Button
            {
                Text      = "🔌 Kiểm tra kết nối",
                Location  = new Point(24, 220),
                Size      = new Size(170, 34),
                BackColor = Color.FromArgb(220, 80, 20),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font      = new Font("Segoe UI", 9.5f, FontStyle.Bold)
            };
            _btnKiemTra.FlatAppearance.BorderSize = 0;
            _btnKiemTra.Click += OnKiemTraKetNoi;

            _lblKetQuaKN = new Label
            {
                Location   = new Point(24, 262),
                Width      = 560,
                Height     = 40,
                Font       = new Font("Segoe UI", 9.5f),
                ForeColor  = Color.Gray,
                Text       = "Nhấn \"Kiểm tra kết nối\" để xác nhận server."
            };

            // ── Xử lý chuyển chế độ ──────────────────────────────────
            _rdLAN.CheckedChanged += (s, e) =>
            {
                if (!_rdLAN.Checked) return;
                _pnlKhuVucLAN.Visible    = true;
                _pnlKhuVucOnline.Visible = false;
                _lblKetQuaKN.Text        = "Nhấn \"Kiểm tra kết nối\" để xác nhận server.";
                _lblKetQuaKN.ForeColor   = Color.Gray;
            };
            _rdWAN.CheckedChanged += (s, e) =>
            {
                if (!_rdWAN.Checked) return;
                _pnlKhuVucLAN.Visible    = false;
                _pnlKhuVucOnline.Visible = true;
                // Xóa sạch ô IP và Port để bắt người dùng tự nhập
                _txtIpWAN.Text   = "";
                _numPort.Value   = 0;
                _lblKetQuaKN.Text      = "Nhập địa chỉ IP và cổng, sau đó nhấn \"Kiểm tra kết nối\".";
                _lblKetQuaKN.ForeColor = Color.FromArgb(80, 80, 150);
            };

            pnl.Controls.AddRange(new Control[]
            {
                lbl, _rdLAN, _rdWAN,
                _pnlKhuVucLAN, _pnlKhuVucOnline,
                _btnKiemTra, _lblKetQuaKN
            });
            return pnl;
        }

        private async void OnTimServerLAN(object? sender, EventArgs e)
        {
            _btnTimLAN.Enabled = false;
            _btnTimLAN.Text    = "Đang quét mạng...";
            _lstServerLAN.Items.Clear();
            _lblKetQuaKN.Text      = "Đang phát hiện server trong mạng nội bộ (UDP Broadcast)...";
            _lblKetQuaKN.ForeColor = Color.Gray;

            // Bước 1: Dò IP qua UDP Broadcast
            var ds_ip = await NetworkService.TimServerLAN(3000);

            _lstServerLAN.Items.Clear();

            if (ds_ip.Count == 0)
            {
                // Nếu UDP Broadcast không tìm được, thử quét IP mạng nội bộ
                // bằng cách dò port trực tiếp trên IP LAN của máy trạm
                _lblKetQuaKN.Text = "UDP Broadcast không có phản hồi. Đang thử quét IP LAN thủ công...";
                ds_ip = await QuetIpLanThuCong();
            }

            if (ds_ip.Count == 0)
            {
                _lstServerLAN.Items.Add("(Không tìm thấy server nào)");
                _lstServerLAN.Enabled = false;
                _lblKetQuaKN.Text      = "Không tìm thấy server. Kiểm tra server Ubuntu đã khởi động chưa.";
                _lblKetQuaKN.ForeColor = Color.DarkOrange;
                _btnTimLAN.Text    = "🔍 Tìm server LAN";
                _btnTimLAN.Enabled = true;
                return;
            }

            // Bước 2: Với từng IP tìm được, dò cổng API tự động
            _lblKetQuaKN.Text      = $"Tìm thấy {ds_ip.Count} IP. Đang dò cổng API...";
            _lblKetQuaKN.ForeColor = Color.FromArgb(30, 80, 160);

            var ds_ket_qua = new List<NetworkService.KetQuaDoPort>();

            foreach (var ip in ds_ip)
            {
                _lblKetQuaKN.Text = $"Đang dò cổng API tại {ip}...";

                var ket_qua = await NetworkService.DoPortTuDong(ip, (port, tb) =>
                {
                    // Cập nhật trạng thái đang thử từng cổng
                    _lblKetQuaKN.Text = $"  {ip} → thử cổng {port}...";
                });

                if (ket_qua != null)
                    ds_ket_qua.Add(ket_qua);
            }

            // Bước 3: Hiển thị kết quả
            _lstServerLAN.Items.Clear();

            if (ds_ket_qua.Count == 0)
            {
                // Tìm được IP nhưng không có cổng nào phản hồi /api/ping
                _lstServerLAN.Items.Add("(Tìm được IP nhưng chưa có API)");
                _lstServerLAN.Enabled  = false;
                _lblKetQuaKN.Text      = "Tìm được server nhưng /api/ping chưa sẵn sàng. "
                                       + "Server HTQL_550 có thể chưa được triển khai.";
                _lblKetQuaKN.ForeColor = Color.DarkOrange;
            }
            else
            {
                _lstServerLAN.Enabled = true;
                foreach (var kq in ds_ket_qua)
                    _lstServerLAN.Items.Add($"{kq.Ip}:{kq.Port}");   // Hiển thị "IP:Port"

                // Tự động chọn kết quả đầu tiên
                _lstServerLAN.SelectedIndex = 0;
                ApDungKetQuaChon(ds_ket_qua[0]);

                _lblKetQuaKN.Text = ds_ket_qua.Count == 1
                    ? $"✔ Đã tìm và dò cổng thành công: {ds_ket_qua[0].Ip}:{ds_ket_qua[0].Port}"
                    : $"✔ Tìm thấy {ds_ket_qua.Count} server. Chọn một rồi nhấn \"Kiểm tra kết nối\".";
                _lblKetQuaKN.ForeColor = Color.FromArgb(30, 100, 30);
            }

            // Cập nhật sự kiện chọn item để tự điền IP + Port
            _lstServerLAN.SelectedIndexChanged -= OnChonServerLAN;
            _lstServerLAN.SelectedIndexChanged += OnChonServerLAN;
            _lstServerLAN.Tag = ds_ket_qua; // Lưu kết quả đầy đủ vào Tag

            _btnTimLAN.Text    = "🔍 Tìm server LAN";
            _btnTimLAN.Enabled = true;
        }

        /// <summary>
        /// Quét thủ công dải IP LAN của máy trạm (dùng khi UDP Broadcast không hoạt động).
        /// Lấy IP máy trạm, thay octet cuối thành .1 → .254 và thử dò port.
        /// </summary>
        private static async Task<List<string>> QuetIpLanThuCong()
        {
            var danh_sach = new List<string>();
            try
            {
                // Lấy IP LAN của máy trạm
                var ten_may = System.Net.Dns.GetHostName();
                var cac_ip  = System.Net.Dns.GetHostAddresses(ten_may);
                string? prefix = null;

                foreach (var addr in cac_ip)
                {
                    // Chỉ lấy IPv4 dải 192.168.x.x hoặc 10.x.x.x
                    var s = addr.ToString();
                    if (s.StartsWith("192.168.") || s.StartsWith("10."))
                    {
                        prefix = s.Substring(0, s.LastIndexOf('.') + 1); // "192.168.1."
                        break;
                    }
                }

                if (prefix == null) return danh_sach;

                // Thử tất cả cổng ưu tiên trên .1 → .254 với timeout 1 giây
                using var http = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(1) };
                var cac_nhiem_vu = new List<Task<string?>>();

                for (int i = 1; i <= 254; i++)
                {
                    var ip = $"{prefix}{i}";
                    cac_nhiem_vu.Add(KiemTraNhanhMot(http, ip));
                }

                var cac_ket_qua = await Task.WhenAll(cac_nhiem_vu);
                foreach (var ip in cac_ket_qua)
                    if (ip != null) danh_sach.Add(ip);
            }
            catch { }
            return danh_sach;
        }

        private static async Task<string?> KiemTraNhanhMot(System.Net.Http.HttpClient http, string ip)
        {
            foreach (var port in NetworkService.CAC_CONG_THU)
            {
                try
                {
                    var ok = await http.GetAsync($"http://{ip}:{port}/api/ping");
                    if (ok.IsSuccessStatusCode) return ip;
                }
                catch { }
            }
            return null;
        }

        /// <summary>Áp dụng IP + Port từ kết quả dò vào biến nội bộ và ô Port.</summary>
        private void ApDungKetQuaChon(NetworkService.KetQuaDoPort kq)
        {
            _txtIpWAN.Text = kq.Ip;
            _numPort.Value = kq.Port;
            _ipServer      = kq.Ip;
            _portServer    = kq.Port;
        }

        /// <summary>Sự kiện khi người dùng chọn dòng trong ListBox kết quả LAN.</summary>
        private void OnChonServerLAN(object? sender, EventArgs e)
        {
            if (_lstServerLAN.SelectedItem == null) return;
            if (_lstServerLAN.Tag is not List<NetworkService.KetQuaDoPort> ds) return;

            var idx = _lstServerLAN.SelectedIndex;
            if (idx >= 0 && idx < ds.Count)
                ApDungKetQuaChon(ds[idx]);
        }

        private async void OnKiemTraKetNoi(object? sender, EventArgs e)
        {
            _cheDo_LAN = _rdLAN.Checked;

            // Chế độ Online: bắt buộc người dùng phải tự nhập IP và Port
            if (!_cheDo_LAN)
            {
                if (!System.Net.IPAddress.TryParse(_txtIpWAN.Text.Trim(), out _))
                {
                    _lblKetQuaKN.ForeColor = Color.Red;
                    _lblKetQuaKN.Text      = "✘ Vui lòng nhập địa chỉ IP hợp lệ (ví dụ: 14.224.152.48).";
                    _txtIpWAN.Focus();
                    return;
                }
                if (_numPort.Value <= 0)
                {
                    _lblKetQuaKN.ForeColor = Color.Red;
                    _lblKetQuaKN.Text      = "✘ Vui lòng nhập số cổng (Port) hợp lệ (ví dụ: 8080).";
                    _numPort.Focus();
                    return;
                }
            }

            // Lấy IP: Offline từ listbox, Online từ ô nhập
            _ipServer   = _cheDo_LAN
                ? (_lstServerLAN.SelectedItem != null && System.Net.IPAddress.TryParse(
                      _lstServerLAN.SelectedItem.ToString(), out _)
                      ? _lstServerLAN.SelectedItem.ToString()!
                      : "")
                : _txtIpWAN.Text.Trim();
            _portServer = (int)_numPort.Value;

            if (string.IsNullOrEmpty(_ipServer))
            {
                _lblKetQuaKN.ForeColor = Color.Red;
                _lblKetQuaKN.Text      = "✘ Chưa có server nào được chọn. Hãy tìm server LAN trước.";
                return;
            }

            _btnKiemTra.Enabled = false;
            _lblKetQuaKN.Text   = "Đang kiểm tra kết nối...";
            _lblKetQuaKN.ForeColor = Color.Gray;

            var (thanh_cong, thong_bao) = await NetworkService.KiemTraKetNoi(_ipServer, _portServer);

            _lblKetQuaKN.Text      = thong_bao;
            _lblKetQuaKN.ForeColor = thanh_cong ? Color.Green : Color.Red;

            if (thanh_cong)
            {
                // Tải luôn đường dẫn server
                _duongDanServer = await NetworkService.LayDuongDanTuServer(_ipServer, _portServer);
            }

            _btnKiemTra.Enabled = true;
        }

        // ── Bước 4: Chọn đường dẫn ───────────────────────────────────

        private TextBox _txtDuongDan = null!;
        private Label   _lblDuongDanServer = null!;

        private Panel _pnlBuoc4_DuongDan()
        {
            var pnl = TaoPanelNoi();

            var lbl = TaoLabel("📁  Vị trí cài đặt & Thông tin từ server", 24, 16);
            lbl.Font = new Font("Segoe UI", 11, FontStyle.Bold);

            TaoLabel("Cài đặt vào thư mục:", 24, 58, pnl);
            _txtDuongDan = new TextBox
            {
                Location = new Point(24, 80),
                Width    = 430,
                Text     = @"C:\Program Files\HTQL_550\"
            };

            var btnChon = new Button
            {
                Text      = "...",
                Location  = new Point(460, 79),
                Size      = new Size(40, 24),
                FlatStyle = FlatStyle.Flat
            };
            btnChon.Click += (s, e) =>
            {
                using var dlg = new FolderBrowserDialog
                {
                    Description          = "Chọn thư mục cài đặt HTQL_550",
                    SelectedPath         = _txtDuongDan.Text
                };
                if (dlg.ShowDialog() == DialogResult.OK)
                    _txtDuongDan.Text = dlg.SelectedPath;
            };

            // Hiển thị đường dẫn lấy từ server
            var sep = new Label
            {
                Text      = "Đường dẫn lưu trữ trên server:",
                Font      = new Font("Segoe UI", 9, FontStyle.Bold),
                Location  = new Point(24, 120),
                AutoSize  = true,
                ForeColor = Color.FromArgb(80, 80, 80)
            };

            _lblDuongDanServer = new Label
            {
                Location  = new Point(24, 142),
                Size      = new Size(560, 120),
                Font      = new Font("Courier New", 8.5f),
                ForeColor = Color.FromArgb(40, 100, 40),
                Text      = "(Chưa kết nối server — Quay lại Bước 3 để kết nối)"
            };

            pnl.Controls.AddRange(new Control[]
            {
                lbl, _txtDuongDan, btnChon, sep, _lblDuongDanServer
            });
            return pnl;
        }

        private void CapNhatHienThiDuongDanServer()
        {
            if (_duongDanServer != null)
            {
                _lblDuongDanServer.Text =
                    $"  Database   : {_duongDanServer.ThuMucDatabase}\r\n" +
                    $"  Thiết kế   : {_duongDanServer.ThuMucThietKe}\r\n" +
                    $"  Ảnh nặng   : {_duongDanServer.ThuMucAnh}\r\n" +
                    $"  Cập nhật   : {_duongDanServer.ThuMucUpdate}";
                _lblDuongDanServer.ForeColor = Color.FromArgb(40, 100, 40);
            }
        }

        // ── Bước 5: Kết quả cài đặt ─────────────────────────────────

        private Panel _pnlBuoc5_KetQua()
        {
            var pnl = TaoPanelNoi();

            var lbl = TaoLabel("✅  Tóm tắt cài đặt", 24, 16);
            lbl.Font = new Font("Segoe UI", 11, FontStyle.Bold);

            _rtbTomTat = new RichTextBox
            {
                Location     = new Point(24, 50),
                Size         = new Size(560, 220),
                ReadOnly     = true,
                BackColor    = Color.FromArgb(248, 248, 248),
                Font         = new Font("Courier New", 9),
                BorderStyle  = BorderStyle.None,
                ScrollBars   = RichTextBoxScrollBars.Vertical
            };

            var note = TaoLabel("Nhấn \"Hoàn tất\" để lưu cấu hình và mở chương trình.", 24, 280);
            note.ForeColor = Color.Gray;
            note.Font = new Font("Segoe UI", 8.5f, FontStyle.Italic);

            pnl.Controls.AddRange(new Control[] { lbl, _rtbTomTat, note });
            return pnl;
        }

        private void TaoTomTat()
        {
            _duongDanCaiDat = _txtDuongDan?.Text ?? @"C:\Program Files\HTQL_550\";
            _rtbTomTat.Clear();
            _rtbTomTat.AppendText($"  Phần mềm    : HTQL_550 Client\r\n");
            _rtbTomTat.AppendText($"  Phiên bản   : {UpdateService.PHIEN_BAN_HIEN_TAI}\r\n");
            _rtbTomTat.AppendText($"  Ngày cài    : {DateTime.Now:dd/MM/yyyy HH:mm}\r\n");
            _rtbTomTat.AppendText($"  Máy trạm    : {Environment.MachineName}\r\n");
            _rtbTomTat.AppendText($"\r\n");
            _rtbTomTat.AppendText($"  Máy chủ IP  : {_ipServer}\r\n");
            _rtbTomTat.AppendText($"  Cổng        : {_portServer}\r\n");
            _rtbTomTat.AppendText($"  Chế độ      : {(_cheDo_LAN ? "LAN (Tự động)" : "WAN (IP tĩnh)")}\r\n");
            _rtbTomTat.AppendText($"\r\n");
            _rtbTomTat.AppendText($"  Thư mục     : {_duongDanCaiDat}\r\n");

            if (_duongDanServer != null)
            {
                _rtbTomTat.AppendText($"\r\n  ── Đường dẫn server ──\r\n");
                _rtbTomTat.AppendText($"  Database    : {_duongDanServer.ThuMucDatabase}\r\n");
                _rtbTomTat.AppendText($"  Thiết kế    : {_duongDanServer.ThuMucThietKe}\r\n");
                _rtbTomTat.AppendText($"  Ảnh nặng    : {_duongDanServer.ThuMucAnh}\r\n");
                _rtbTomTat.AppendText($"  Cập nhật    : {_duongDanServer.ThuMucUpdate}\r\n");
            }
        }

        // ── Hoàn tất: Lưu cấu hình ───────────────────────────────────

        private async Task HoanTatCaiDat()
        {
            _btnTiepTheo.Enabled = false;
            _btnTiepTheo.Text    = "Đang lưu...";

            await Task.Delay(300); // Mô phỏng quá trình cài đặt

            // Tạo và lưu đối tượng cấu hình
            var cau_hinh_cu = ConfigManager.TaiCauHinh();
            var cau_hinh    = new CauHinh
            {
                PhienBan        = UpdateService.PHIEN_BAN_HIEN_TAI,
                PhienBanCu      = cau_hinh_cu?.PhienBan ?? "",
                IpServer        = _ipServer,
                PortServer      = _portServer,
                CheDo_LAN       = _cheDo_LAN,
                DuongDanCaiDat  = _duongDanCaiDat,
                ThuMucDatabase  = _duongDanServer?.ThuMucDatabase ?? "",
                ThuMucThietKe   = _duongDanServer?.ThuMucThietKe  ?? "",
                ThuMucAnh       = _duongDanServer?.ThuMucAnh       ?? "",
                ThuMucUpdate    = _duongDanServer?.ThuMucUpdate    ?? "",
                DaCauHinhXong   = true,
                NgayCaiDat      = DateTime.Now
            };

            var luu_ok = ConfigManager.LuuCauHinh(cau_hinh);

            if (luu_ok)
            {
                MessageBox.Show(
                    "✅ Cài đặt thành công!\n\nCấu hình đã được lưu tại:\n" + ConfigManager.DuongDanFile,
                    "Hoàn tất cài đặt",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
                DialogResult = DialogResult.OK;
                Close();
            }
            else
            {
                MessageBox.Show(
                    "❌ Không thể lưu cấu hình.\nKiểm tra quyền Administrator hoặc đường dẫn cài đặt.",
                    "Lỗi lưu cấu hình",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                _btnTiepTheo.Enabled = true;
                _btnTiepTheo.Text    = "✔ Hoàn tất";
            }
        }

        // ── Ghi đè để cập nhật khi chuyển bước ───────────────────────

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            _txtMatKhau.Focus();
        }

        // Cập nhật đường dẫn server và tóm tắt khi chuyển sang bước 4/5
        private void OnBuocChanging(int buocMoi)
        {
            if (buocMoi == 3) CapNhatHienThiDuongDanServer();
            if (buocMoi == 4) TaoTomTat();
        }

        // ── Tiện ích tạo control ──────────────────────────────────────

        private Panel TaoPanelNoi()
        {
            return new Panel
            {
                Location  = new Point(0, 116),
                Size      = new Size(640, 350),
                BackColor = Color.White
            };
        }

        private Label TaoLabel(string text, int x, int y, Panel? pnl = null)
        {
            var lbl = new Label
            {
                Text     = text,
                Location = new Point(x, y),
                AutoSize = true,
                Font     = new Font("Segoe UI", 9.5f)
            };
            pnl?.Controls.Add(lbl);
            return lbl;
        }

        private Label TaoLabelPhai(string text, int x, int y)
        {
            return new Label
            {
                Text      = text,
                Location  = new Point(x + 160, y),
                AutoSize  = true,
                Font      = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(40, 80, 160)
            };
        }

        private void TaoHangThongTin(Panel pnl, string nhan, string giaTri, int y)
        {
            pnl.Controls.Add(TaoLabel(nhan, 24, y));
            var lblGia = TaoLabelPhai(giaTri, 24, y);
            lblGia.Text = giaTri;
            pnl.Controls.Add(lblGia);
        }
    }
}
