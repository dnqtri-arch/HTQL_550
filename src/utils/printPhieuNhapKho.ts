/**
 * In Phiếu Nhập kho — mẫu HTML chuyên nghiệp (Logo Nam Bac AD)
 * Gọi `inPhieuNhapKho(record, chiTiet)` để mở cửa sổ in.
 */

import type { NhanVatTuHangHoaRecord, NhanVatTuHangHoaChiTiet } from '../modules/kho/nhanVatTuHangHoa/nhanVatTuHangHoaApi'

function fmt(n: number): string {
  return n.toLocaleString('vi-VN')
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

export function inPhieuNhapKho(
  record: NhanVatTuHangHoaRecord,
  chiTiet: NhanVatTuHangHoaChiTiet[],
): void {
  const tongTien = chiTiet.reduce((s, ct) => s + (ct.thanh_tien ?? 0), 0)
  const tongThue = chiTiet.reduce((s, ct) => s + (ct.tien_thue_gtgt ?? 0), 0)
  const tongCong = tongTien + tongThue

  const rows = chiTiet.map((ct, i) => `
    <tr>
      <td style="text-align:center;padding:4px 6px;border:1px solid #ccc;">${i + 1}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${ct.ma_hang ?? ''}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${ct.ten_hang ?? ''}</td>
      <td style="text-align:center;padding:4px 6px;border:1px solid #ccc;">${ct.dvt ?? ''}</td>
      <td style="text-align:right;padding:4px 6px;border:1px solid #ccc;">${fmt(ct.so_luong ?? 0)}</td>
      <td style="text-align:right;padding:4px 6px;border:1px solid #ccc;">${fmt(ct.don_gia ?? 0)}</td>
      <td style="text-align:right;padding:4px 6px;border:1px solid #ccc;">${fmt(ct.thanh_tien ?? 0)}</td>
      <td style="text-align:right;padding:4px 6px;border:1px solid #ccc;">${ct.pt_thue_gtgt != null ? ct.pt_thue_gtgt + '%' : ''}</td>
      <td style="text-align:right;padding:4px 6px;border:1px solid #ccc;">${fmt(ct.tien_thue_gtgt ?? 0)}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <title>Phiếu Nhập Kho — ${record.so_don_hang}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #111; background: #fff; padding: 20mm 15mm; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .logo-area { flex: 1; }
    .logo-text { font-size: 20pt; font-weight: 900; color: #1a3c6e; letter-spacing: 2px; }
    .logo-sub { font-size: 9pt; color: #555; margin-top: 2px; }
    .doc-area { text-align: right; flex: 1; }
    .doc-title { font-size: 16pt; font-weight: 700; color: #1a3c6e; text-transform: uppercase; margin-bottom: 4px; }
    .doc-no { font-size: 11pt; font-weight: 600; }
    .info-table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11pt; }
    .info-table td { padding: 3px 6px; vertical-align: top; }
    .info-table .label { font-weight: 600; white-space: nowrap; width: 140px; }
    .divider { border-top: 2px solid #1a3c6e; margin: 10px 0; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-bottom: 10px; }
    .data-table th { background: #1a3c6e; color: #fff; padding: 5px 6px; text-align: center; border: 1px solid #1a3c6e; font-weight: 600; }
    .data-table td { border: 1px solid #ccc; }
    .data-table tr:nth-child(even) td { background: #f5f7fb; }
    .totals { text-align: right; margin: 8px 0; font-size: 11pt; }
    .totals div { margin-bottom: 2px; }
    .totals .grand { font-size: 12pt; font-weight: 700; color: #1a3c6e; border-top: 1px solid #ccc; padding-top: 4px; margin-top: 4px; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 28px; text-align: center; font-size: 10pt; }
    .sig-col { flex: 1; }
    .sig-title { font-weight: 700; margin-bottom: 60px; }
    .sig-name { font-style: italic; color: #555; }
    .footer-note { font-size: 9pt; color: #777; text-align: center; margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 8px; }
    @media print { body { padding: 0; } @page { size: A4; margin: 15mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-area">
      <div class="logo-text">NAM BAC AD</div>
      <div class="logo-sub">Công ty TNHH Nam Bắc AD</div>
      <div class="logo-sub">ĐC: TP. Hồ Chí Minh, Việt Nam</div>
      <div class="logo-sub">MST: 0000000000</div>
    </div>
    <div class="doc-area">
      <div class="doc-title">Phiếu Nhập Kho</div>
      <div class="doc-no">Số: ${record.so_don_hang}</div>
      <div class="doc-no">Ngày: ${fmtDate(record.ngay_don_hang)}</div>
    </div>
  </div>
  <div class="divider"></div>

  <table class="info-table">
    <tr>
      <td class="label">Nhà cung cấp:</td>
      <td>${record.nha_cung_cap ?? ''}</td>
      <td class="label" style="padding-left:20px;">Ngày giao hàng:</td>
      <td>${fmtDate(record.ngay_giao_hang)}</td>
    </tr>
    <tr>
      <td class="label">Địa chỉ:</td>
      <td colspan="3">${record.dia_chi ?? ''}</td>
    </tr>
    <tr>
      <td class="label">MST:</td>
      <td>${record.ma_so_thue ?? ''}</td>
      <td class="label" style="padding-left:20px;">Kho nhập:</td>
      <td>${record.kho_nhap_id ?? 'Kho chính'}</td>
    </tr>
    <tr>
      <td class="label">Điều khoản TT:</td>
      <td>${record.dieu_khoan_tt ?? ''}</td>
      <td class="label" style="padding-left:20px;">Số ngày được nợ:</td>
      <td>${record.so_ngay_duoc_no ?? '0'} ngày</td>
    </tr>
    <tr>
      <td class="label">Diễn giải:</td>
      <td colspan="3">${record.dien_giai ?? ''}</td>
    </tr>
  </table>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width:40px;">STT</th>
        <th style="width:90px;">Mã hàng</th>
        <th>Tên hàng hóa/Vật tư</th>
        <th style="width:54px;">ĐVT</th>
        <th style="width:72px;">Số lượng</th>
        <th style="width:100px;">Đơn giá</th>
        <th style="width:110px;">Thành tiền</th>
        <th style="width:56px;">% Thuế</th>
        <th style="width:100px;">Tiền thuế</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align:right;font-weight:700;padding:4px 6px;border:1px solid #ccc;">Cộng:</td>
        <td style="border:1px solid #ccc;"></td>
        <td style="border:1px solid #ccc;"></td>
        <td style="text-align:right;font-weight:700;padding:4px 6px;border:1px solid #ccc;">${fmt(tongTien)}</td>
        <td style="border:1px solid #ccc;"></td>
        <td style="text-align:right;font-weight:700;padding:4px 6px;border:1px solid #ccc;">${fmt(tongThue)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="totals">
    <div>Tổng tiền hàng: <strong>${fmt(tongTien)}</strong> đồng</div>
    <div>Tổng thuế GTGT: <strong>${fmt(tongThue)}</strong> đồng</div>
    <div class="grand">TỔNG CỘNG THANH TOÁN: <strong>${fmt(tongCong)}</strong> đồng</div>
  </div>

  <div class="sig-row">
    <div class="sig-col">
      <div class="sig-title">Người lập phiếu</div>
      <div class="sig-name">(Ký, ghi rõ họ tên)</div>
    </div>
    <div class="sig-col">
      <div class="sig-title">Thủ kho</div>
      <div class="sig-name">(Ký, ghi rõ họ tên)</div>
    </div>
    <div class="sig-col">
      <div class="sig-title">Kế toán</div>
      <div class="sig-name">(Ký, ghi rõ họ tên)</div>
    </div>
    <div class="sig-col">
      <div class="sig-title">Giám đốc</div>
      <div class="sig-name">(Ký, ghi rõ họ tên)</div>
    </div>
  </div>

  <div class="footer-note">
    Phiếu này được tạo tự động bởi hệ thống HTQL_550 — Nam Bac AD — ${new Date().toLocaleDateString('vi-VN')}
  </div>

  <script>window.addEventListener('load', () => window.print())</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Vui lòng cho phép mở popup để in phiếu.'); return }
  win.document.open()
  win.document.write(html)
  win.document.close()
}
