/** [YC30+YC33] Mẫu không đơn giá: thêm 3 cột Kích thước (mD, mR, Lượng) trước Số lượng */
export const mau_hdbctkhongdongia = ['Mã', 'Tên Sản phẩm, Hàng hóa', 'Nội dung', 'ĐVT', 'mD', 'mR', 'Lượng', 'Số lượng', 'ĐCNH', 'Ghi chú'] as const

/** [YC30+YC33] Mẫu có đơn giá: thêm 3 cột Kích thước (mD, mR, Lượng) trước Số lượng */
export const mau_hdbctcodongia = ['Mã', 'Tên Sản phẩm, Hàng hóa', 'Nội dung', 'ĐVT', 'mD', 'mR', 'Lượng', 'Số lượng', 'Đơn giá', 'Thành tiền', 'ĐCNH', '% thuế GTGT', 'Tiền thuế GTGT', 'Tổng tiền'] as const

/** Có đơn giá nhưng không áp dụng VAT (ẩn % thuế, tiền thuế, tổng dòng) — YC44. */
export const mau_hdbctcodongia_khong_vat = ['Mã', 'Tên Sản phẩm, Hàng hóa', 'Nội dung', 'ĐVT', 'mD', 'mR', 'Lượng', 'Số lượng', 'Đơn giá', 'Thành tiền', 'ĐCNH'] as const
