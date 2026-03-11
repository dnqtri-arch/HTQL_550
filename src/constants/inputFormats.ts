/**
 * Khai báo các định dạng nhập liệu dùng chung.
 * Dùng để gọi tên khi cấu hình trường nhập liệu (form fields, grid columns, v.v.).
 *
 * Quy ước số (VN): phân cách hàng nghìn = dấu chấm (.), thập phân = dấu phẩy (,).
 * Logic format/parse: src/utils/numberFormat.ts (formatSoTien, formatSoNguyenInput, formatPhanTramInput, ...).
 * Số tiền: nhập chỉ số → chấm nghìn; chủ động gõ chấm (.) hoặc phẩy (,) → thập phân (hiển thị thành phẩy). Chi tiết: .cursor/rules/number-format.mdc.
 */

/** Các loại định dạng nhập liệu */
export const InputFormat = {
  /** Số tiền – VND: chấm nghìn, phẩy thập phân (tối đa 2 chữ số). Gõ chấm hoặc phẩy = thập phân (hiển thị phẩy). */
  SO_TIEN: 'so_tien',
  /** Số nguyên – có thể âm, phân cách hàng nghìn bằng dấu chấm (VD: -1.234 hoặc 1.234) */
  SO_NGUYEN: 'so_nguyen',
  /** Số tự nhiên – số nguyên ≥ 0, phân cách hàng nghìn (VD: 0, 1.234) */
  SO_TU_NHIEN: 'so_tu_nhien',
  /** Số thập phân – có thể âm, dấu chấm nghìn, dấu phẩy thập phân (VD: 1.234,56) */
  SO_THAP_PHAN: 'so_thap_phan',
  /** Ngày tháng năm – định dạng ngày (dd/MM/yyyy hoặc theo cấu hình) */
  NGAY_THANG_NAM: 'ngay_thang_nam',
  /** Kiểu chữ – văn bản (text), không ép định dạng số */
  KIEU_CHU: 'kieu_chu',
  /** Số phần trăm (%) – chỉ số và dấu phẩy thập phân, không dấu chấm nghìn (VD: 15,5 hoặc 100) */
  SO_PHAN_TRAM: 'so_phan_tram',
  /** Email – chuỗi theo định dạng email */
  EMAIL: 'email',
  /** Số điện thoại – chuỗi số, có thể có khoảng trắng/dấu gạch */
  SO_DIEN_THOAI: 'so_dien_thoai',
  /** Mã – chuỗi mã (code), thường viết hoa hoặc không dấu */
  MA: 'ma',
} as const

/** Kiểu giá trị của InputFormat – dùng cho type-safe khi khai báo trường */
export type InputFormatType = (typeof InputFormat)[keyof typeof InputFormat]

/** Nhãn hiển thị (tiếng Việt) cho từng định dạng – dùng cho label, tooltip, báo lỗi */
export const InputFormatLabel: Record<InputFormatType, string> = {
  [InputFormat.SO_TIEN]: 'Số tiền (VND)',
  [InputFormat.SO_NGUYEN]: 'Số nguyên',
  [InputFormat.SO_TU_NHIEN]: 'Số tự nhiên',
  [InputFormat.SO_THAP_PHAN]: 'Số thập phân',
  [InputFormat.NGAY_THANG_NAM]: 'Ngày tháng năm',
  [InputFormat.KIEU_CHU]: 'Kiểu chữ',
  [InputFormat.SO_PHAN_TRAM]: 'Số %',
  [InputFormat.EMAIL]: 'Email',
  [InputFormat.SO_DIEN_THOAI]: 'Số điện thoại',
  [InputFormat.MA]: 'Mã',
}

/** Mô tả ngắn – dùng cho tài liệu hoặc placeholder gợi ý */
export const InputFormatDescription: Record<InputFormatType, string> = {
  [InputFormat.SO_TIEN]: 'Định dạng số tiền VND: dấu chấm nghìn, dấu phẩy thập phân. Gõ chấm (.) hoặc phẩy (,) = thập phân (hiển thị phẩy).',
  [InputFormat.SO_NGUYEN]: 'Số nguyên, có thể âm, phân cách hàng nghìn bằng dấu chấm',
  [InputFormat.SO_TU_NHIEN]: 'Số tự nhiên (≥ 0), nguyên, phân cách hàng nghìn',
  [InputFormat.SO_THAP_PHAN]: 'Số thập phân, dấu chấm nghìn, dấu phẩy thập phân',
  [InputFormat.NGAY_THANG_NAM]: 'Ngày tháng năm (vd: dd/MM/yyyy)',
  [InputFormat.KIEU_CHU]: 'Văn bản (chữ), không ép định dạng số',
  [InputFormat.SO_PHAN_TRAM]: 'Phần trăm (%), không dấu chấm nghìn',
  [InputFormat.EMAIL]: 'Địa chỉ email',
  [InputFormat.SO_DIEN_THOAI]: 'Số điện thoại',
  [InputFormat.MA]: 'Mã (code)',
}
