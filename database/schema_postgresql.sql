-- HTQL_550 - Schema PostgreSQL (Tiếng Việt)
-- Khởi tạo tất cả các bảng cần thiết cho các phân hệ

-- ========== DANH MỤC DÙNG CHUNG ==========

-- Danh mục Đối tượng: Khách hàng, Nhà cung cấp, Nhân viên
CREATE TABLE IF NOT EXISTS "DanhMuc_DoiTuong" (
  "id" SERIAL PRIMARY KEY,
  "ma" VARCHAR(50) UNIQUE NOT NULL,
  "ten" VARCHAR(255) NOT NULL,
  "loai" VARCHAR(50) NOT NULL, -- 'Khách hàng', 'Nhà cung cấp', 'Nhân viên'
  "dia_chi" TEXT,
  "ma_so_thue" VARCHAR(20),
  "dien_thoai" VARCHAR(20),
  "email" VARCHAR(100),
  "phong_ban" VARCHAR(100),
  "chuc_vu" VARCHAR(100),
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "ngay_sua" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Danh mục Vật tư: Vật tư hàng hóa, Kho, Đơn vị tính
CREATE TABLE IF NOT EXISTS "DanhMuc_VatTu" (
  "id" SERIAL PRIMARY KEY,
  "ma" VARCHAR(50) UNIQUE NOT NULL,
  "ten" VARCHAR(255) NOT NULL,
  "ma_kho" VARCHAR(50),
  "don_vi_tinh" VARCHAR(20),
  "ton_kho" NUMERIC(18,4) DEFAULT 0,
  "gia" NUMERIC(18,4) DEFAULT 0,
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "ngay_sua" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DanhMuc_Kho" (
  "id" SERIAL PRIMARY KEY,
  "ma" VARCHAR(50) UNIQUE NOT NULL,
  "ten" VARCHAR(255) NOT NULL,
  "dia_diem" TEXT,
  "thu_kho" VARCHAR(100),
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DanhMuc_DonViTinh" (
  "id" SERIAL PRIMARY KEY,
  "ma" VARCHAR(20) UNIQUE NOT NULL,
  "ten" VARCHAR(50) NOT NULL
);

-- Danh mục Tài khoản: Ngân hàng, Hệ thống tài khoản
CREATE TABLE IF NOT EXISTS "DanhMuc_NganHang" (
  "id" SERIAL PRIMARY KEY,
  "ma" VARCHAR(50) UNIQUE NOT NULL,
  "ten" VARCHAR(255) NOT NULL,
  "chi_nhanh" VARCHAR(255),
  "so_tai_khoan" VARCHAR(50),
  "dia_chi" TEXT,
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DanhMuc_HeThongTaiKhoan" (
  "id" SERIAL PRIMARY KEY,
  "ma" VARCHAR(20) UNIQUE NOT NULL,
  "ten" VARCHAR(255) NOT NULL,
  "cap" INTEGER DEFAULT 1,
  "tk_cha" VARCHAR(20)
);

-- ========== NHÓM 1: BÀN LÀM VIỆC, CÔNG VIỆC ==========

CREATE TABLE IF NOT EXISTS "BanLamViec_ThongBao" (
  "id" SERIAL PRIMARY KEY,
  "tieu_de" VARCHAR(255),
  "noi_dung" TEXT,
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "da_xem" BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "CongViec" (
  "id" SERIAL PRIMARY KEY,
  "ma" VARCHAR(50) UNIQUE NOT NULL,
  "tieu_de" VARCHAR(255) NOT NULL,
  "mo_ta" TEXT,
  "nguoi_giao" VARCHAR(50),
  "nguoi_thuc_hien" VARCHAR(50),
  "trang_thai" VARCHAR(50) DEFAULT 'Chưa thực hiện',
  "ngay_het_han" DATE,
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "ngay_sua" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== NHÓM 2: BÁN HÀNG, MUA HÀNG, HỢP ĐỒNG ==========

CREATE TABLE IF NOT EXISTS "BanHang_HoaDon" (
  "id" SERIAL PRIMARY KEY,
  "so_hoa_don" VARCHAR(50) UNIQUE NOT NULL,
  "ngay_hd" DATE NOT NULL,
  "ma_khach_hang" VARCHAR(50),
  "tong_tien" NUMERIC(18,4) DEFAULT 0,
  "da_thanh_toan" NUMERIC(18,4) DEFAULT 0,
  "trang_thai" VARCHAR(50) DEFAULT 'Tạm',
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "ghi_chu" TEXT
);

CREATE TABLE IF NOT EXISTS "BanHang_ChiTietHoaDon" (
  "id" SERIAL PRIMARY KEY,
  "id_hoa_don" INTEGER NOT NULL REFERENCES "BanHang_HoaDon"("id") ON DELETE CASCADE,
  "ma_vat_tu" VARCHAR(50),
  "so_luong" NUMERIC(18,4) NOT NULL,
  "don_gia" NUMERIC(18,4) NOT NULL,
  "thanh_tien" NUMERIC(18,4) NOT NULL
);

CREATE TABLE IF NOT EXISTS "MuaHang_HoaDon" (
  "id" SERIAL PRIMARY KEY,
  "so_hoa_don" VARCHAR(50) UNIQUE NOT NULL,
  "ngay_hd" DATE NOT NULL,
  "ma_nha_cung_cap" VARCHAR(50),
  "tong_tien" NUMERIC(18,4) DEFAULT 0,
  "trang_thai" VARCHAR(50) DEFAULT 'Tạm',
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "ghi_chu" TEXT
);

CREATE TABLE IF NOT EXISTS "MuaHang_ChiTietHoaDon" (
  "id" SERIAL PRIMARY KEY,
  "id_hoa_don" INTEGER NOT NULL REFERENCES "MuaHang_HoaDon"("id") ON DELETE CASCADE,
  "ma_vat_tu" VARCHAR(50),
  "so_luong" NUMERIC(18,4) NOT NULL,
  "don_gia" NUMERIC(18,4) NOT NULL,
  "thanh_tien" NUMERIC(18,4) NOT NULL
);

CREATE TABLE IF NOT EXISTS "HopDong" (
  "id" SERIAL PRIMARY KEY,
  "so_hop_dong" VARCHAR(50) UNIQUE NOT NULL,
  "ten_hop_dong" VARCHAR(255),
  "ma_doi_tuong" VARCHAR(50),
  "loai_doi_tuong" VARCHAR(50),
  "ngay_ky" DATE,
  "ngay_het_han" DATE,
  "gia_tri" NUMERIC(18,4),
  "trang_thai" VARCHAR(50) DEFAULT 'Đang thực hiện',
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "ghi_chu" TEXT
);

-- ========== NHÓM 3: QUỸ, NGÂN HÀNG, THỦ QUỸ ==========

CREATE TABLE IF NOT EXISTS "Quy_PhieuThu" (
  "id" SERIAL PRIMARY KEY,
  "so_phieu" VARCHAR(50) UNIQUE NOT NULL,
  "ngay_thu" DATE NOT NULL,
  "ma_doi_tuong" VARCHAR(50),
  "so_tien" NUMERIC(18,4) NOT NULL,
  "ly_do" TEXT,
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Quy_PhieuChi" (
  "id" SERIAL PRIMARY KEY,
  "so_phieu" VARCHAR(50) UNIQUE NOT NULL,
  "ngay_chi" DATE NOT NULL,
  "ma_doi_tuong" VARCHAR(50),
  "so_tien" NUMERIC(18,4) NOT NULL,
  "ly_do" TEXT,
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "NganHang_SoPhieu" (
  "id" SERIAL PRIMARY KEY,
  "so_phieu" VARCHAR(50) UNIQUE NOT NULL,
  "ngay_gd" DATE NOT NULL,
  "ma_ngan_hang" VARCHAR(50),
  "so_tai_khoan" VARCHAR(50),
  "loai" VARCHAR(20), -- 'Thu', 'Chi'
  "so_tien" NUMERIC(18,4) NOT NULL,
  "noi_dung" TEXT,
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== NHÓM 4: KHO, THỦ KHO, CÔNG CỤ DỤNG CỤ, TÀI SẢN CỐ ĐỊNH ==========

CREATE TABLE IF NOT EXISTS "Kho_PhieuNhap" (
  "id" SERIAL PRIMARY KEY,
  "so_phieu" VARCHAR(50) UNIQUE NOT NULL,
  "ngay_nhap" DATE NOT NULL,
  "ma_kho" VARCHAR(50),
  "ma_nha_cung_cap" VARCHAR(50),
  "trang_thai" VARCHAR(50) DEFAULT 'Tạm',
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "ghi_chu" TEXT
);

CREATE TABLE IF NOT EXISTS "Kho_PhieuXuat" (
  "id" SERIAL PRIMARY KEY,
  "so_phieu" VARCHAR(50) UNIQUE NOT NULL,
  "ngay_xuat" DATE NOT NULL,
  "ma_kho" VARCHAR(50),
  "ma_khach_hang" VARCHAR(50),
  "trang_thai" VARCHAR(50) DEFAULT 'Tạm',
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "ghi_chu" TEXT
);

CREATE TABLE IF NOT EXISTS "Kho_ChiTietPhieuNhap" (
  "id" SERIAL PRIMARY KEY,
  "id_phieu_nhap" INTEGER NOT NULL REFERENCES "Kho_PhieuNhap"("id") ON DELETE CASCADE,
  "ma_vat_tu" VARCHAR(50),
  "so_luong" NUMERIC(18,4) NOT NULL,
  "don_gia" NUMERIC(18,4),
  "thanh_tien" NUMERIC(18,4)
);

CREATE TABLE IF NOT EXISTS "Kho_ChiTietPhieuXuat" (
  "id" SERIAL PRIMARY KEY,
  "id_phieu_xuat" INTEGER NOT NULL REFERENCES "Kho_PhieuXuat"("id") ON DELETE CASCADE,
  "ma_vat_tu" VARCHAR(50),
  "so_luong" NUMERIC(18,4) NOT NULL,
  "don_gia" NUMERIC(18,4),
  "thanh_tien" NUMERIC(18,4)
);

-- Bảng Kho (danh mục kho)
CREATE TABLE IF NOT EXISTS "Kho_Hang" (
  "id" SERIAL PRIMARY KEY,
  "ma" VARCHAR(50) UNIQUE NOT NULL,
  "ten" VARCHAR(255) NOT NULL,
  "dia_diem" TEXT,
  "thu_kho" VARCHAR(100),
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "ngay_sua" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Vật tư hàng hóa (danh mục vật tư)
CREATE TABLE IF NOT EXISTS "Vat_Tu_Hang_Hoa" (
  "id" SERIAL PRIMARY KEY,
  "ma" VARCHAR(50) UNIQUE NOT NULL,
  "ten" VARCHAR(255) NOT NULL,
  "tinh_chat" VARCHAR(50),
  "nhom_vthh" VARCHAR(100),
  "dvt_chinh" VARCHAR(20),
  "so_luong_ton" NUMERIC(18,4) DEFAULT 0,
  "gia_tri_ton" NUMERIC(18,4) DEFAULT 0,
  "kho_ngam_dinh" VARCHAR(50),
  "tai_khoan_kho" VARCHAR(20),
  "tk_doanh_thu" VARCHAR(20),
  "tk_chi_phi" VARCHAR(20),
  "thue_suat_gtgt" NUMERIC(5,2) DEFAULT 0,
  "duong_dan_hinh_anh" TEXT,  -- Chỉ lưu tên file; file lưu tại /ssd_2tb/HTQL_550/thietke/vattu/
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "ngay_sua" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_Vat_Tu_Hang_Hoa_ma" ON "Vat_Tu_Hang_Hoa"("ma");
CREATE INDEX IF NOT EXISTS "idx_Kho_Hang_ma" ON "Kho_Hang"("ma");

CREATE TABLE IF NOT EXISTS "CongCuDungCu" (
  "id" SERIAL PRIMARY KEY,
  "ma" VARCHAR(50) UNIQUE NOT NULL,
  "ten" VARCHAR(255) NOT NULL,
  "ma_kho" VARCHAR(50),
  "don_vi_tinh" VARCHAR(20),
  "so_luong" NUMERIC(18,4) DEFAULT 0,
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TaiSanCoDinh" (
  "id" SERIAL PRIMARY KEY,
  "ma" VARCHAR(50) UNIQUE NOT NULL,
  "ten" VARCHAR(255) NOT NULL,
  "nguyen_gia" NUMERIC(18,4),
  "hao_mon_luy_ke" NUMERIC(18,4) DEFAULT 0,
  "ngay_ghi_tang" DATE,
  "thoi_gian_sd" INTEGER,
  "trang_thai" VARCHAR(50) DEFAULT 'Đang sử dụng',
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== NHÓM 5: TIỀN LƯƠNG, THUẾ, GIÁ THÀNH, TỔNG HỢP ==========

CREATE TABLE IF NOT EXISTS "TienLuong_BangLuong" (
  "id" SERIAL PRIMARY KEY,
  "thang" INTEGER NOT NULL,
  "nam" INTEGER NOT NULL,
  "ma_nhan_vien" VARCHAR(50),
  "luong_cung" NUMERIC(18,4),
  "phu_cap" NUMERIC(18,4) DEFAULT 0,
  "tam_ung" NUMERIC(18,4) DEFAULT 0,
  "thuc_linh" NUMERIC(18,4),
  "trang_thai" VARCHAR(50) DEFAULT 'Tạm',
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Thue_ToKhai" (
  "id" SERIAL PRIMARY KEY,
  "loai_thue" VARCHAR(50),
  "ky_thue" VARCHAR(20),
  "ngay_nop" DATE,
  "so_tien" NUMERIC(18,4),
  "trang_thai" VARCHAR(50) DEFAULT 'Chưa nộp',
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "GiaThanh_SanPham" (
  "id" SERIAL PRIMARY KEY,
  "ma" VARCHAR(50) UNIQUE NOT NULL,
  "ten" VARCHAR(255) NOT NULL,
  "gia_thanh" NUMERIC(18,4),
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TongHop_SoCai" (
  "id" SERIAL PRIMARY KEY,
  "ma_tai_khoan" VARCHAR(20) NOT NULL,
  "ngay_ht" DATE NOT NULL,
  "chung_tu" VARCHAR(50),
  "dien_giai" TEXT,
  "no" NUMERIC(18,4) DEFAULT 0,
  "co" NUMERIC(18,4) DEFAULT 0,
  "so_du" NUMERIC(18,4) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "TongHop_ChungTu" (
  "id" SERIAL PRIMARY KEY,
  "so_ct" VARCHAR(50) UNIQUE NOT NULL,
  "ngay_ct" DATE NOT NULL,
  "loai_ct" VARCHAR(50),
  "dien_giai" TEXT,
  "trang_thai" VARCHAR(50) DEFAULT 'Tạm',
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TongHop_ChiTietChungTu" (
  "id" SERIAL PRIMARY KEY,
  "id_chung_tu" INTEGER NOT NULL REFERENCES "TongHop_ChungTu"("id") ON DELETE CASCADE,
  "ma_tai_khoan" VARCHAR(20),
  "ma_doi_tuong" VARCHAR(50),
  "dien_giai" TEXT,
  "no" NUMERIC(18,4) DEFAULT 0,
  "co" NUMERIC(18,4) DEFAULT 0
);

-- ========== NHÓM 6: HÓA ĐƠN ĐIỆN TỬ, QUẢN LÝ HÓA ĐƠN, TÀI LIỆU ==========

CREATE TABLE IF NOT EXISTS "HoaDonDienTu" (
  "id" SERIAL PRIMARY KEY,
  "so_hoa_don" VARCHAR(50) UNIQUE NOT NULL,
  "ma_so_thue" VARCHAR(20),
  "ngay_phat_hanh" DATE,
  "loai_hd" VARCHAR(50),
  "trang_thai_ky" VARCHAR(50),
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "QuanLyHoaDon_DanhSach" (
  "id" SERIAL PRIMARY KEY,
  "so_hoa_don" VARCHAR(50),
  "ngay_hd" DATE,
  "loai" VARCHAR(50),
  "ma_doi_tuong" VARCHAR(50),
  "tong_tien" NUMERIC(18,4),
  "nguon" VARCHAR(50),
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TaiLieu" (
  "id" SERIAL PRIMARY KEY,
  "ma" VARCHAR(50),
  "ten" VARCHAR(255) NOT NULL,
  "duong_dan" TEXT,
  "loai_file" VARCHAR(20),
  "kich_thuoc" BIGINT,
  "thu_muc" VARCHAR(255),
  "ngay_tao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chỉ mục hỗ trợ tra cứu
CREATE INDEX IF NOT EXISTS "idx_DoiTuong_loai" ON "DanhMuc_DoiTuong"("loai");
CREATE INDEX IF NOT EXISTS "idx_BanHang_ngay" ON "BanHang_HoaDon"("ngay_hd");
CREATE INDEX IF NOT EXISTS "idx_MuaHang_ngay" ON "MuaHang_HoaDon"("ngay_hd");
CREATE INDEX IF NOT EXISTS "idx_Kho_Nhap_ngay" ON "Kho_PhieuNhap"("ngay_nhap");
CREATE INDEX IF NOT EXISTS "idx_Kho_Xuat_ngay" ON "Kho_PhieuXuat"("ngay_xuat");
CREATE INDEX IF NOT EXISTS "idx_TongHop_SoCai_tk_ngay" ON "TongHop_SoCai"("ma_tai_khoan", "ngay_ht");
