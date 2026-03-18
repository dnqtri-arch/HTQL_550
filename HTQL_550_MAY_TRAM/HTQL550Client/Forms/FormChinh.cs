using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Threading.Tasks;
using System.Windows.Forms;
using HTQL550Client.Controls;
using HTQL550Client.Models;
using HTQL550Client.Services;
using HTQL550Client.Utils;

namespace HTQL550Client.Forms
{
    /// <summary>
    /// Giao diện chính của HTQL_550 Client.
    /// Gồm: Sidebar menu trái, Dashboard trung tâm (Circular Menu), Status Bar dưới.
    /// </summary>
    public class FormChinh : Form
    {
        private readonly CauHinh _cauHinh;

        // ── Controls chính ────────────────────────────────────────────
        private Panel              _pnlSidebar    = null!;
        private Panel              _pnlNoidung    = null!;
        private StatusStrip        _statusBar     = null!;
        private CircularMenuControl _circularMenu = null!;

        // Nhãn trên Status Bar
        private ToolStripStatusLabel _lblMayChu   = null!;
        private ToolStripStatusLabel _lblTenDLKT  = null!;
        private ToolStripStatusLabel _lblNgayGio  = null!;

        // Timer cập nhật ngày giờ
        private readonly System.Windows.Forms.Timer _timerGio = new() { Interval = 1000 };

        // Mục menu bên trái đang chọn
        private Button? _nutSidebarDangChon;

        public FormChinh(CauHinh cauHinh)
        {
            _cauHinh = cauHinh;

            Text            = $"HTQL_550 — {cauHinh.TenNguoiDung}";
            Size            = new Size(1280, 760);
            MinimumSize     = new Size(960, 600);
            StartPosition   = FormStartPosition.CenterScreen;
            BackColor       = Color.FromArgb(245, 245, 248);
            Font            = new Font("Segoe UI", 9.5f);

            XayDungGiaoDien();
            KhoiTaoCircularMenu();

            // Kiểm tra cập nhật khi khởi động (chạy nền)
            _ = KiemTraCapNhatKhoiDong();

            // Bắt đầu đồng hồ
            _timerGio.Tick += (s, e) =>
                _lblNgayGio.Text = DateTime.Now.ToString("dd/MM/yyyy  HH:mm:ss");
            _timerGio.Start();
        }

        // ── Xây dựng toàn bộ giao diện ───────────────────────────────

        private void XayDungGiaoDien()
        {
            // Loại bỏ padding mặc định
            Padding = new Padding(0);

            // ── Header ────────────────────────────────────────────────
            var pnlHeader = new Panel
            {
                Dock      = DockStyle.Top,
                Height    = 56,
                BackColor = Color.FromArgb(28, 35, 50)
            };

            var lblLogo = new Label
            {
                Text      = "HTQL_550",
                Font      = new Font("Segoe UI", 17, FontStyle.Bold),
                ForeColor = Color.FromArgb(255, 140, 60),
                Location  = new Point(16, 10),
                AutoSize  = true
            };
            var lblVersion = new Label
            {
                Text      = "v" + UpdateService.PHIEN_BAN_HIEN_TAI + " Demo",
                Font      = new Font("Segoe UI", 8),
                ForeColor = Color.FromArgb(150, 150, 170),
                Location  = new Point(130, 20),
                AutoSize  = true
            };
            var lblNguoiDung = new Label
            {
                Text      = $"👤 {_cauHinh.TenNguoiDung}",
                Font      = new Font("Segoe UI", 9),
                ForeColor = Color.FromArgb(200, 200, 215),
                AutoSize  = true
            };
            // Căn phải người dùng khi resize
            pnlHeader.SizeChanged += (s, e) =>
                lblNguoiDung.Location = new Point(pnlHeader.Width - lblNguoiDung.Width - 16, 18);
            pnlHeader.Controls.AddRange(new Control[] { lblLogo, lblVersion, lblNguoiDung });
            Controls.Add(pnlHeader);

            // ── Status Bar ────────────────────────────────────────────
            _statusBar = new StatusStrip
            {
                BackColor  = Color.FromArgb(28, 35, 50),
                ForeColor  = Color.White,
                SizingGrip = false,
                Font       = new Font("Segoe UI", 8.5f)
            };
            _lblMayChu = new ToolStripStatusLabel($"  Máy chủ: {_cauHinh.TenMayChu}")
            {
                ForeColor = Color.FromArgb(150, 210, 150),
                BorderSides = ToolStripStatusLabelBorderSides.Right
            };
            _lblTenDLKT = new ToolStripStatusLabel($"  DLKT: {_cauHinh.TenDLKT}")
            {
                ForeColor = Color.FromArgb(180, 200, 255),
                BorderSides = ToolStripStatusLabelBorderSides.Right
            };
            _lblNgayGio = new ToolStripStatusLabel(DateTime.Now.ToString("dd/MM/yyyy  HH:mm:ss"))
            {
                ForeColor = Color.FromArgb(220, 220, 220),
                Spring    = true,
                TextAlign = ContentAlignment.MiddleRight
            };
            _statusBar.Items.AddRange(new ToolStripItem[] { _lblMayChu, _lblTenDLKT, _lblNgayGio });
            Controls.Add(_statusBar);

            // ── Sidebar (menu trái) ───────────────────────────────────
            _pnlSidebar = new Panel
            {
                Dock      = DockStyle.Left,
                Width     = 200,
                BackColor = Color.FromArgb(36, 42, 58)
            };
            XayDungSidebar();
            Controls.Add(_pnlSidebar);

            // ── Vùng nội dung (bên phải) ─────────────────────────────
            _pnlNoidung = new Panel
            {
                Dock      = DockStyle.Fill,
                BackColor = Color.FromArgb(245, 245, 248),
                Padding   = new Padding(0)
            };
            Controls.Add(_pnlNoidung);
        }

        // ── Sidebar menu ──────────────────────────────────────────────

        private void XayDungSidebar()
        {
            var tieuDe = new Label
            {
                Text      = "PHÂN HỆ",
                Font      = new Font("Segoe UI", 7.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(120, 130, 155),
                Location  = new Point(16, 14),
                AutoSize  = true
            };
            _pnlSidebar.Controls.Add(tieuDe);

            // Danh sách mục menu
            var cac_muc = new[]
            {
                ("🏠", "Bàn làm việc",   "ban_lam_viec"),
                ("📋", "CÔNG VIỆC",      "cong_viec"),
                ("👥", "CRM",            "crm"),
                ("💰", "TÀI CHÍNH",      "tai_chinh"),
                ("📦", "KHO VÀ HÀNG HÓA","kho"),
                ("👔", "HRM",            "hrm"),
                ("🧾", "HÓA ĐƠN",        "hoa_don"),
                ("📁", "FILE THIẾT KẾ",  "file_thiet_ke"),
            };

            int y = 40;
            foreach (var (icon, ten, id) in cac_muc)
            {
                var btn = TaoNutSidebar(icon, ten, id, y);
                _pnlSidebar.Controls.Add(btn);

                // Mặc định chọn "Bàn làm việc"
                if (id == "ban_lam_viec")
                    ChonNutSidebar(btn, id);

                y += 44;
            }

            // Nút cài đặt ở cuối sidebar
            var btnCaiDat = TaoNutSidebar("⚙", "Cài đặt", "cai_dat", _pnlSidebar.Height - 90);
            btnCaiDat.Dock = DockStyle.None;
            _pnlSidebar.Controls.Add(btnCaiDat);
            _pnlSidebar.SizeChanged += (s, e) =>
                btnCaiDat.Location = new Point(0, _pnlSidebar.Height - 90);
        }

        private Button TaoNutSidebar(string icon, string ten, string moduleId, int y)
        {
            var btn = new Button
            {
                Text      = $"  {icon}  {ten}",
                TextAlign = ContentAlignment.MiddleLeft,
                Location  = new Point(0, y),
                Size      = new Size(200, 42),
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.Transparent,
                ForeColor = Color.FromArgb(180, 190, 210),
                Font      = new Font("Segoe UI", 9.5f),
                Cursor    = Cursors.Hand,
                Tag       = moduleId
            };
            btn.FlatAppearance.BorderSize  = 0;
            btn.FlatAppearance.MouseOverBackColor = Color.FromArgb(50, 58, 80);

            btn.Click += (s, e) => ChonNutSidebar(btn, moduleId);
            return btn;
        }

        private void ChonNutSidebar(Button btn, string moduleId)
        {
            // Bỏ highlight nút cũ
            if (_nutSidebarDangChon != null)
            {
                _nutSidebarDangChon.BackColor = Color.Transparent;
                _nutSidebarDangChon.ForeColor = Color.FromArgb(180, 190, 210);
            }

            // Highlight nút mới
            btn.BackColor      = Color.FromArgb(220, 80, 20);
            btn.ForeColor      = Color.White;
            _nutSidebarDangChon = btn;

            // Hiển thị nội dung tương ứng
            HienThiModule(moduleId);
        }

        // ── Hiển thị nội dung theo module ────────────────────────────

        private void HienThiModule(string moduleId)
        {
            _pnlNoidung.Controls.Clear();

            switch (moduleId)
            {
                case "ban_lam_viec":
                    HienThiDashboard();
                    break;

                case "file_thiet_ke":
                    HienThiModuleFile();
                    break;

                default:
                    HienThiModuleDangPhatTrien(moduleId);
                    break;
            }
        }

        // ── Dashboard — Bàn làm việc ─────────────────────────────────

        private void HienThiDashboard()
        {
            // Tiêu đề
            var lblTieuDe = new Label
            {
                Text      = "BÀN LÀM VIỆC",
                Font      = new Font("Segoe UI", 13, FontStyle.Bold),
                ForeColor = Color.FromArgb(60, 60, 80),
                Location  = new Point(24, 20),
                AutoSize  = true
            };

            var lblPhuDe = new Label
            {
                Text      = "Sơ đồ quy trình nghiệp vụ HTQL_550",
                Font      = new Font("Segoe UI", 9),
                ForeColor = Color.FromArgb(140, 140, 160),
                Location  = new Point(26, 48),
                AutoSize  = true
            };

            // Circular Menu control
            _circularMenu = new CircularMenuControl
            {
                Location    = new Point((_pnlNoidung.Width  - 480) / 2, 70),
                Size        = new Size(480, 480),
                Anchor      = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };
            _circularMenu.MucMenuClick += OnCircularMenuClick;

            // Tự căn giữa khi resize
            _pnlNoidung.SizeChanged += (s, e) =>
            {
                _circularMenu.Location = new Point(
                    (_pnlNoidung.Width  - 480) / 2,
                    Math.Max(70, (_pnlNoidung.Height - 500) / 2)
                );
            };

            GanDanhSachMenuCircular();

            _pnlNoidung.Controls.AddRange(new Control[] { lblTieuDe, lblPhuDe, _circularMenu });

            // Tải badge count từ server (chạy nền)
            _ = TaiBadgeCountTuServer();
        }

        private void KhoiTaoCircularMenu()
        {
            // Sẽ được gọi lại khi HienThiDashboard() khởi tạo control
        }

        private void GanDanhSachMenuCircular()
        {
            if (_circularMenu == null) return;

            var cac_muc = new List<MucMenu>
            {
                new() { Ten = "Ngân sách",   Icon = "💵", ModuleId = "ngan_sach",   BadgeCount = 0 },
                new() { Ten = "Quỹ tiền",    Icon = "🏦", ModuleId = "quy_tien",    BadgeCount = 0 },
                new() { Ten = "Ngân hàng",   Icon = "🏧", ModuleId = "ngan_hang",   BadgeCount = 0 },
                new() { Ten = "Bán hàng",    Icon = "🛒", ModuleId = "ban_hang",    BadgeCount = 0 },
                new() { Ten = "Mua hàng",    Icon = "📥", ModuleId = "mua_hang",    BadgeCount = 0 },
                new() { Ten = "Kho",         Icon = "📦", ModuleId = "kho",         BadgeCount = 0 },
                new() { Ten = "Nhân sự",     Icon = "👔", ModuleId = "nhan_su",     BadgeCount = 0 },
                new() { Ten = "Công việc",   Icon = "✅", ModuleId = "cong_viec",   BadgeCount = 0 },
            };
            _circularMenu.GanDanhSach(cac_muc);
        }

        private async Task TaiBadgeCountTuServer()
        {
            try
            {
                // TODO: Gọi API GET /api/thong-bao để lấy số badge thực tế
                // Tạm thời dùng dữ liệu mẫu
                await Task.Delay(800);
                if (_circularMenu == null) return;

                _circularMenu.CapNhatBadge("Mua hàng",  3);
                _circularMenu.CapNhatBadge("Công việc", 7);
                _circularMenu.CapNhatBadge("Bán hàng",  1);
            }
            catch { /* Bỏ qua lỗi badge — không ảnh hưởng giao diện */ }
        }

        private void OnCircularMenuClick(object? sender, MucMenuClickArgs e)
        {
            // Tìm và click nút sidebar tương ứng
            foreach (Control ctrl in _pnlSidebar.Controls)
            {
                if (ctrl is Button btn && btn.Tag?.ToString() == e.Muc.ModuleId)
                {
                    btn.PerformClick();
                    return;
                }
            }
            // Nếu không có trong sidebar: hiển thị trực tiếp
            HienThiModule(e.Muc.ModuleId);
        }

        // ── Module File thiết kế ─────────────────────────────────────

        private void HienThiModuleFile()
        {
            var lblTieuDe = new Label
            {
                Text      = "FILE THIẾT KẾ",
                Font      = new Font("Segoe UI", 13, FontStyle.Bold),
                ForeColor = Color.FromArgb(60, 60, 80),
                Location  = new Point(24, 20),
                AutoSize  = true
            };

            // Nút tải danh sách file
            var btnTai = new Button
            {
                Text      = "🔄 Tải danh sách file",
                Location  = new Point(24, 60),
                Size      = new Size(180, 34),
                BackColor = Color.FromArgb(220, 80, 20),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font      = new Font("Segoe UI", 9.5f, FontStyle.Bold)
            };
            btnTai.FlatAppearance.BorderSize = 0;

            // Danh sách file
            var lstFile = new ListView
            {
                Location        = new Point(24, 104),
                Size            = new Size(680, 400),
                View            = View.Details,
                FullRowSelect   = true,
                GridLines       = true,
                Font            = new Font("Segoe UI", 9)
            };
            lstFile.Columns.Add("Tên file",    280);
            lstFile.Columns.Add("Kích thước",   100);
            lstFile.Columns.Add("Ngày sửa",     150);
            lstFile.Columns.Add("Mô tả",        150);

            // Nút mở CorelDRAW
            var btnMoCorel = new Button
            {
                Text      = "🖌 Mở bằng CorelDRAW",
                Location  = new Point(24, 514),
                Size      = new Size(200, 34),
                BackColor = Color.FromArgb(40, 110, 40),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font      = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                Enabled   = false
            };
            btnMoCorel.FlatAppearance.BorderSize = 0;

            lstFile.SelectedIndexChanged += (s, e) =>
                btnMoCorel.Enabled = lstFile.SelectedItems.Count > 0;

            var lblTrangThai = new Label
            {
                Location  = new Point(24, 554),
                Width     = 680,
                AutoSize  = false,
                ForeColor = Color.Gray,
                Text      = "Nhấn \"Tải danh sách file\" để xem các file thiết kế trên server."
            };

            // Sự kiện tải danh sách
            btnTai.Click += async (s, e) =>
            {
                btnTai.Enabled  = false;
                btnTai.Text     = "Đang tải...";
                lstFile.Items.Clear();

                var danh_sach = await FileService.LayDanhSachFile(_cauHinh.IpServer, _cauHinh.PortServer);

                foreach (var f in danh_sach)
                {
                    var item = new ListViewItem(f.TenFile);
                    item.SubItems.Add(f.KichThuoc > 0 ? $"{f.KichThuoc / 1024:N0} KB" : "—");
                    item.SubItems.Add(f.NgaySuaDoi);
                    item.SubItems.Add(f.MoTa);
                    item.Tag = f;
                    lstFile.Items.Add(item);
                }

                lblTrangThai.Text = danh_sach.Count > 0
                    ? $"Đã tải {danh_sach.Count} file."
                    : "Không có file nào trên server.";

                btnTai.Enabled  = true;
                btnTai.Text     = "🔄 Tải danh sách file";
            };

            // Sự kiện mở CorelDRAW
            btnMoCorel.Click += async (s, e) =>
            {
                if (lstFile.SelectedItems.Count == 0) return;
                var ten_file = lstFile.SelectedItems[0].Text;

                btnMoCorel.Enabled = false;
                lblTrangThai.Text  = $"Đang tải file \"{ten_file}\" về máy...";

                var (ok, ket_qua) = await FileService.TaiFile(_cauHinh.IpServer, _cauHinh.PortServer, ten_file);

                if (ok)
                {
                    lblTrangThai.Text = $"Đã tải về: {ket_qua}. Đang mở CorelDRAW...";
                    var (mo_ok, mo_tb) = FileService.MoVoiCorel(ket_qua);
                    lblTrangThai.ForeColor = mo_ok ? Color.Green : Color.Red;
                    lblTrangThai.Text      = mo_tb;

                    // Ghi nhật ký
                    await FileService.GhiNhatKy(_cauHinh.IpServer, _cauHinh.PortServer,
                        ten_file, _cauHinh.TenNguoiDung, "Mở CorelDRAW");
                }
                else
                {
                    lblTrangThai.ForeColor = Color.Red;
                    lblTrangThai.Text      = ket_qua;
                }

                btnMoCorel.Enabled = true;
            };

            _pnlNoidung.Controls.AddRange(new Control[]
            {
                lblTieuDe, btnTai, lstFile, btnMoCorel, lblTrangThai
            });
        }

        // ── Module chưa phát triển ────────────────────────────────────

        private void HienThiModuleDangPhatTrien(string moduleId)
        {
            var ten = System.Globalization.CultureInfo.CurrentCulture.TextInfo
                .ToTitleCase(moduleId.Replace("_", " "));

            var pnl = new Panel { Dock = DockStyle.Fill };

            var lbl = new Label
            {
                Text      = $"⚙  Module «{ten.ToUpper()}»\n\nĐang phát triển — sẽ được bổ sung trong phiên bản tiếp theo.",
                Font      = new Font("Segoe UI", 12),
                ForeColor = Color.FromArgb(140, 140, 160),
                TextAlign = ContentAlignment.MiddleCenter,
                Dock      = DockStyle.Fill
            };

            pnl.Controls.Add(lbl);
            _pnlNoidung.Controls.Add(pnl);
        }

        // ── Kiểm tra cập nhật khi khởi động ──────────────────────────

        private async Task KiemTraCapNhatKhoiDong()
        {
            try
            {
                await Task.Delay(2000); // Chờ form ổn định

                var (co_ban_moi, phien_ban_moi) =
                    await UpdateService.KiemTraCapNhat(_cauHinh.IpServer, _cauHinh.PortServer);

                if (!co_ban_moi) return;

                var ket_qua = MessageBox.Show(
                    $"🆕 Có phiên bản mới: v{phien_ban_moi}\n" +
                    $"Phiên bản hiện tại: v{UpdateService.PHIEN_BAN_HIEN_TAI}\n\n" +
                    $"Bạn có muốn tải về và cài đặt ngay bây giờ không?",
                    "Cập nhật phần mềm",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Information);

                if (ket_qua != DialogResult.Yes) return;

                // Hiển thị hộp thoại tải cập nhật
                using var frmCapNhat = new FormCapNhat(_cauHinh, phien_ban_moi);
                frmCapNhat.ShowDialog(this);
            }
            catch { /* Bỏ qua lỗi kiểm tra cập nhật */ }
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            _timerGio.Stop();
            base.OnFormClosed(e);
        }
    }

    // ── Form cập nhật phần mềm (nhỏ, nội tuyến) ──────────────────────

    /// <summary>Hộp thoại hiển thị tiến trình tải và cài bản cập nhật.</summary>
    internal class FormCapNhat : Form
    {
        private readonly CauHinh _cauHinh;
        private readonly string  _phienBanMoi;
        private ProgressBar _progressBar = null!;
        private Label       _lblTrangThai = null!;

        internal FormCapNhat(CauHinh cauHinh, string phienBanMoi)
        {
            _cauHinh     = cauHinh;
            _phienBanMoi = phienBanMoi;

            Text            = $"Cập nhật lên v{phienBanMoi}";
            Size            = new Size(480, 200);
            StartPosition   = FormStartPosition.CenterParent;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox     = false;
            MinimizeBox     = false;

            _progressBar = new ProgressBar
            {
                Location = new Point(20, 60),
                Size     = new Size(430, 28),
                Maximum  = 100
            };
            _lblTrangThai = new Label
            {
                Location  = new Point(20, 100),
                Width     = 430,
                Text      = "Đang chuẩn bị tải bản cập nhật...",
                ForeColor = Color.FromArgb(60, 100, 60)
            };

            Controls.AddRange(new Control[]
            {
                new Label { Text = $"Đang tải bản cập nhật v{_phienBanMoi}...",
                            Location = new Point(20, 20), AutoSize = true,
                            Font = new Font("Segoe UI", 10, FontStyle.Bold) },
                _progressBar, _lblTrangThai
            });

            Shown += async (s, e) => await BatDauCapNhat();
        }

        private async Task BatDauCapNhat()
        {
            var tien_trinh = new Progress<int>(pct =>
            {
                _progressBar.Value  = pct;
                _lblTrangThai.Text  = $"Đang tải: {pct}%";
            });

            var (thanh_cong, thong_bao) =
                await UpdateService.TaiVaCapNhat(
                    _cauHinh.IpServer, _cauHinh.PortServer,
                    _cauHinh.DuongDanCaiDat, tien_trinh);

            _lblTrangThai.Text     = thong_bao;
            _lblTrangThai.ForeColor = thanh_cong ? Color.Green : Color.Red;

            if (thanh_cong)
                await Task.Delay(1500);

            Close();
        }
    }
}
