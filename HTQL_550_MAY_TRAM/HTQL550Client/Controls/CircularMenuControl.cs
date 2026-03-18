using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Windows.Forms;

namespace HTQL550Client.Controls
{
    /// <summary>
    /// Control vẽ sơ đồ quy trình nghiệp vụ dạng vòng tròn (Circular Menu / Dashboard).
    /// Hiển thị các icon module xếp tròn quanh logo trung tâm, mỗi icon có Badge Count.
    /// </summary>
    public class CircularMenuControl : Panel
    {
        // ── Dữ liệu các mục menu ─────────────────────────────────────
        private List<MucMenu> _cacMuc = new();

        // Mục đang được hover
        private int _mucHover = -1;

        // Bán kính vòng tròn chứa các icon
        private const int BAN_KINH = 155;

        // Kích thước mỗi icon (hình tròn)
        private const int KICH_THUOC_ICON = 64;

        // Sự kiện khi người dùng click một mục
        public event EventHandler<MucMenuClickArgs>? MucMenuClick;

        // ── Màu sắc theme ─────────────────────────────────────────────
        private static readonly Color MAU_NEN_GIUA   = Color.FromArgb(240, 100, 30);   // cam đậm — logo giữa
        private static readonly Color MAU_ICON_CHINH = Color.FromArgb(255, 130, 50);   // cam sáng
        private static readonly Color MAU_ICON_HOVER = Color.FromArgb(220, 80, 10);    // cam tối khi hover
        private static readonly Color MAU_BADGE       = Color.FromArgb(220, 50, 50);   // đỏ badge
        private static readonly Color MAU_CHU_TRANG   = Color.White;

        public CircularMenuControl()
        {
            // Bật double buffering để tránh nhấp nháy khi vẽ lại
            DoubleBuffered    = true;
            SetStyle(ControlStyles.OptimizedDoubleBuffer
                   | ControlStyles.AllPaintingInWmPaint
                   | ControlStyles.ResizeRedraw, true);

            BackColor = Color.FromArgb(245, 245, 248);

            // Xử lý sự kiện hover và click
            MouseMove  += OnMouseMove;
            MouseClick += OnMouseClick;
        }

        // ── API công khai ─────────────────────────────────────────────

        /// <summary>Gán danh sách mục menu cần hiển thị.</summary>
        public void GanDanhSach(List<MucMenu> cacMuc)
        {
            _cacMuc = cacMuc;
            Invalidate(); // Vẽ lại
        }

        /// <summary>Cập nhật Badge Count cho một mục theo tên.</summary>
        public void CapNhatBadge(string tenMuc, int soBadge)
        {
            var muc = _cacMuc.Find(m => m.Ten == tenMuc);
            if (muc != null)
            {
                muc.BadgeCount = soBadge;
                Invalidate();
            }
        }

        // ── Vẽ giao diện ─────────────────────────────────────────────

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);

            var g = e.Graphics;
            g.SmoothingMode      = SmoothingMode.AntiAlias;
            g.TextRenderingHint  = TextRenderingHint.ClearTypeGridFit;
            g.InterpolationMode  = InterpolationMode.HighQualityBicubic;

            var tam_x  = Width  / 2;
            var tam_y  = Height / 2;

            // Vẽ các đường nối từ trung tâm ra các icon
            VeDuongNoi(g, tam_x, tam_y);

            // Vẽ các icon xung quanh
            for (int i = 0; i < _cacMuc.Count; i++)
            {
                var (x, y) = TinhViTri(i, _cacMuc.Count, tam_x, tam_y, BAN_KINH);
                VeIcon(g, _cacMuc[i], x, y, i == _mucHover);
            }

            // Vẽ logo ở trung tâm
            VeTamGiua(g, tam_x, tam_y);
        }

        private void VeDuongNoi(Graphics g, int cx, int cy)
        {
            using var but = new Pen(Color.FromArgb(60, 200, 200, 200), 1.5f)
            {
                DashStyle = DashStyle.Dash
            };

            foreach (var muc in _cacMuc)
            {
                var idx = _cacMuc.IndexOf(muc);
                var (x, y) = TinhViTri(idx, _cacMuc.Count, cx, cy, BAN_KINH);
                g.DrawLine(but, cx, cy, x, y);
            }
        }

        private void VeIcon(Graphics g, MucMenu muc, int x, int y, bool dangHover)
        {
            var ban_kinh = KICH_THUOC_ICON / 2;
            var rect     = new Rectangle(x - ban_kinh, y - ban_kinh, KICH_THUOC_ICON, KICH_THUOC_ICON);

            // Bóng đổ nhẹ
            using (var bong = new SolidBrush(Color.FromArgb(30, 0, 0, 0)))
                g.FillEllipse(bong, rect.X + 3, rect.Y + 4, rect.Width, rect.Height);

            // Nền icon
            var mau_nen = dangHover ? MAU_ICON_HOVER : MAU_ICON_CHINH;
            using (var but = new SolidBrush(mau_nen))
                g.FillEllipse(but, rect);

            // Viền icon
            using (var but_vien = new Pen(Color.White, 2))
                g.DrawEllipse(but_vien, rect);

            // Emoji / ký hiệu icon
            using var font_icon = new Font("Segoe UI Emoji", 18, FontStyle.Regular, GraphicsUnit.Point);
            var icon_rect = new RectangleF(rect.X, rect.Y + 2, rect.Width, rect.Height - 16);
            var sf_icon   = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
            g.DrawString(muc.Icon, font_icon, Brushes.White, icon_rect, sf_icon);

            // Tên mục bên dưới icon
            using var font_ten = new Font("Segoe UI", 7.5f, FontStyle.Bold);
            var ten_rect = new RectangleF(x - 50, y + ban_kinh + 4, 100, 18);
            var sf_ten   = new StringFormat { Alignment = StringAlignment.Center };
            g.DrawString(muc.Ten, font_ten, new SolidBrush(Color.FromArgb(60, 60, 60)), ten_rect, sf_ten);

            // Badge Count (nếu > 0)
            if (muc.BadgeCount > 0)
            {
                var badge_text = muc.BadgeCount > 99 ? "99+" : muc.BadgeCount.ToString();
                var badge_rect = new Rectangle(x + ban_kinh - 14, y - ban_kinh - 4, 28, 18);

                using var but_badge = new SolidBrush(MAU_BADGE);
                using var gp        = RoundedRect(badge_rect, 9);
                g.FillPath(but_badge, gp);

                using var font_badge = new Font("Segoe UI", 7f, FontStyle.Bold);
                var sf_badge = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
                g.DrawString(badge_text, font_badge, Brushes.White, badge_rect, sf_badge);
            }
        }

        private void VeTamGiua(Graphics g, int cx, int cy)
        {
            const int R = 54;
            var rect = new Rectangle(cx - R, cy - R, R * 2, R * 2);

            // Vòng tròn ngoài (viền)
            using (var but = new SolidBrush(Color.FromArgb(230, 240, 240, 255)))
                g.FillEllipse(but, new Rectangle(cx - R - 4, cy - R - 4, (R + 4) * 2, (R + 4) * 2));

            // Vòng tròn chính (gradient cam)
            using var grad = new LinearGradientBrush(rect, Color.FromArgb(255, 140, 60), MAU_NEN_GIUA, 45f);
            g.FillEllipse(grad, rect);

            // Text "HTQL" và "550"
            using var font_tieu_de = new Font("Segoe UI", 14, FontStyle.Bold);
            using var font_phien   = new Font("Segoe UI", 8f, FontStyle.Regular);
            var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };

            g.DrawString("HTQL", font_tieu_de, Brushes.White,
                new RectangleF(cx - R, cy - R, R * 2, R + 6), sf);
            g.DrawString("550", font_phien, new SolidBrush(Color.FromArgb(255, 220, 180)),
                new RectangleF(cx - R, cy + 4, R * 2, R - 8), sf);
        }

        // ── Tính toán vị trí ─────────────────────────────────────────

        private static (int x, int y) TinhViTri(int chiSo, int tongSo, int cx, int cy, int banKinh)
        {
            // Bắt đầu từ phía trên (−90°), xếp đều theo chiều kim đồng hồ
            var goc = (2 * Math.PI * chiSo / tongSo) - Math.PI / 2;
            var x   = (int)(cx + banKinh * Math.Cos(goc));
            var y   = (int)(cy + banKinh * Math.Sin(goc));
            return (x, y);
        }

        private int TimMucTaiViTri(int mouseX, int mouseY)
        {
            var cx = Width  / 2;
            var cy = Height / 2;
            var r  = KICH_THUOC_ICON / 2 + 4;

            for (int i = 0; i < _cacMuc.Count; i++)
            {
                var (x, y) = TinhViTri(i, _cacMuc.Count, cx, cy, BAN_KINH);
                var kc = Math.Sqrt(Math.Pow(mouseX - x, 2) + Math.Pow(mouseY - y, 2));
                if (kc <= r) return i;
            }
            return -1;
        }

        // ── Sự kiện chuột ────────────────────────────────────────────

        private void OnMouseMove(object? sender, MouseEventArgs e)
        {
            var muc_moi = TimMucTaiViTri(e.X, e.Y);
            if (muc_moi != _mucHover)
            {
                _mucHover = muc_moi;
                Cursor    = _mucHover >= 0 ? Cursors.Hand : Cursors.Default;
                Invalidate();
            }
        }

        private void OnMouseClick(object? sender, MouseEventArgs e)
        {
            var idx = TimMucTaiViTri(e.X, e.Y);
            if (idx >= 0)
                MucMenuClick?.Invoke(this, new MucMenuClickArgs(_cacMuc[idx]));
        }

        // ── Tiện ích vẽ ──────────────────────────────────────────────

        private static GraphicsPath RoundedRect(Rectangle rect, int banKinh)
        {
            var gp = new GraphicsPath();
            gp.AddArc(rect.X, rect.Y, banKinh * 2, banKinh * 2, 180, 90);
            gp.AddArc(rect.Right - banKinh * 2, rect.Y, banKinh * 2, banKinh * 2, 270, 90);
            gp.AddArc(rect.Right - banKinh * 2, rect.Bottom - banKinh * 2, banKinh * 2, banKinh * 2, 0, 90);
            gp.AddArc(rect.X, rect.Bottom - banKinh * 2, banKinh * 2, banKinh * 2, 90, 90);
            gp.CloseFigure();
            return gp;
        }
    }

    // ── Data classes ─────────────────────────────────────────────────

    /// <summary>Thông tin một mục trong Circular Menu.</summary>
    public class MucMenu
    {
        public string Ten        { get; set; } = "";
        public string Icon       { get; set; } = "📋";   // Emoji làm icon
        public string ModuleId   { get; set; } = "";
        public int    BadgeCount { get; set; } = 0;
    }

    /// <summary>Đối số sự kiện khi click một mục trong Circular Menu.</summary>
    public class MucMenuClickArgs : EventArgs
    {
        public MucMenu Muc { get; }
        public MucMenuClickArgs(MucMenu muc) => Muc = muc;
    }
}
