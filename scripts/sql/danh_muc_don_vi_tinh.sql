-- Bảng Danh mục Đơn vị tính (phân hệ Kho)
-- Chạy trong PostgreSQL khi triển khai backend.

CREATE TABLE IF NOT EXISTS "DanhMuc_DonViTinh" (
  id         SERIAL PRIMARY KEY,
  ma_dvt     VARCHAR(50)  NOT NULL UNIQUE,
  ten_dvt    VARCHAR(200) NOT NULL,
  dien_giai  TEXT         DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_donvitinh_ma ON "DanhMuc_DonViTinh" (ma_dvt);

COMMENT ON TABLE "DanhMuc_DonViTinh" IS 'Danh mục đơn vị tính - Kho';
COMMENT ON COLUMN "DanhMuc_DonViTinh".ma_dvt IS 'Mã đơn vị tính (bắt buộc, không trùng)';
COMMENT ON COLUMN "DanhMuc_DonViTinh".ten_dvt IS 'Tên đơn vị tính (bắt buộc)';
COMMENT ON COLUMN "DanhMuc_DonViTinh".dien_giai IS 'Diễn giải / ghi chú';
