/**
 * Danh sách chi nhánh theo ngân hàng (tên chi nhánh + tỉnh/thành phố).
 * Key = tên ngân hàng đúng với API VietQR (getBanksVietnam).
 */

export interface BankBranchItem {
  name: string
  province: string
}

const TP_HN = 'Thành phố Hà Nội'
const TP_HCM = 'Thành phố Hồ Chí Minh'
const TP_DN = 'Thành phố Đà Nẵng'
const TP_CT = 'Thành phố Cần Thơ'
const TP_HP = 'Thành phố Hải Phòng'

function b(name: string, province: string): BankBranchItem {
  return { name, province }
}

const BRANCHES_BY_BANK: Record<string, BankBranchItem[]> = {
  'Ngân hàng TMCP Công thương Việt Nam': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM), b('Chi nhánh Đà Nẵng', TP_DN), b('Chi nhánh Cần Thơ', TP_CT), b('Chi nhánh Hải Phòng', TP_HP), b('Chi nhánh Đồng Nai', 'Đồng Nai')],
  'Ngân hàng TMCP Ngoại Thương Việt Nam': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM), b('Chi nhánh Đà Nẵng', TP_DN), b('Chi nhánh Cần Thơ', TP_CT), b('Chi nhánh Hải Phòng', TP_HP)],
  'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM), b('Chi nhánh Đà Nẵng', TP_DN), b('Chi nhánh Cần Thơ', TP_CT), b('Chi nhánh Hải Phòng', TP_HP)],
  'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM), b('Chi nhánh Đà Nẵng', TP_DN), b('Chi nhánh Cần Thơ', TP_CT)],
  'Ngân hàng TMCP Phương Đông': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM), b('Chi nhánh Đà Nẵng', TP_DN)],
  'Ngân hàng TMCP Quân đội': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM), b('Chi nhánh Đà Nẵng', TP_DN)],
  'Ngân hàng TMCP Kỹ thương Việt Nam': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM), b('Chi nhánh Đà Nẵng', TP_DN)],
  'Ngân hàng TMCP Á Châu': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM), b('Chi nhánh Đà Nẵng', TP_DN)],
  'Ngân hàng TMCP Việt Nam Thịnh Vượng': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM), b('Chi nhánh Đà Nẵng', TP_DN)],
  'Ngân hàng TMCP Tiên Phong': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM)],
  'Ngân hàng TMCP Sài Gòn Thương Tín': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM), b('Chi nhánh Đà Nẵng', TP_DN)],
  'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM), b('Chi nhánh Đà Nẵng', TP_DN)],
  'Ngân hàng TMCP Bản Việt': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM)],
  'Ngân hàng TMCP Sài Gòn': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM)],
  'Ngân hàng TMCP Quốc tế Việt Nam': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM)],
  'Ngân hàng TMCP Sài Gòn - Hà Nội': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM)],
  'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM)],
  'Ngân hàng TMCP Hàng Hải Việt Nam': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM)],
  'Ngân hàng TMCP Đại Chúng Việt Nam': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM)],
  'Ngân hàng TMCP Sài Gòn Công Thương': [b('Chi nhánh Hà Nội', TP_HN), b('Chi nhánh Thành phố Hồ Chí Minh', TP_HCM)],
}

export function getBranchesByBankName(bankName: string): BankBranchItem[] {
  const t = (bankName || '').trim()
  if (!t) return []
  if (BRANCHES_BY_BANK[t]) return BRANCHES_BY_BANK[t]
  const found = Object.keys(BRANCHES_BY_BANK).find((k) => k.includes(t) || t.includes(k))
  return found ? BRANCHES_BY_BANK[found] : []
}
