/**
 * Cấu hình luồng quy trình nghiệp vụ Kho - khớp MISA SME 2026.
 * Luồng: Các node đầu vào → Thủ kho nhập/xuất kho → Kiểm kê → Báo cáo phân tích.
 */

export const WORKFLOW_NODE_IDS = [
  'lenh-sx',
  'xuat-kho',
  'chuyen-kho',
  'lap-ra',
  'nhap-kho',
  'tinh-gia',
  'thu-kho',
  'kiem-ke',
  'bao-cao',
] as const

export type WorkflowNodeId = (typeof WORKFLOW_NODE_IDS)[number]

/** Id tab tương ứng khi click vào node (nếu có). */
export const NODE_TO_TAB_ID: Partial<Record<WorkflowNodeId, string>> = {
  'lenh-sx': 'lenh-san-xuat',
  'xuat-kho': 'xuat-kho',
  'chuyen-kho': 'chuyen-kho',
  'nhap-kho': 'nhap-kho',
  'tinh-gia': 'tinh-gia-xuat',
  'kiem-ke': 'kiem-ke',
  'bao-cao': 'bao-cao-phan-tich',
}

/** Các cặp mũi tên [từ, đến]. Tất cả đầu vào hướng về Thủ kho; sau đó Thủ kho → Kiểm kê → Báo cáo. */
export const WORKFLOW_ARROWS: [WorkflowNodeId, WorkflowNodeId][] = [
  ['lenh-sx', 'thu-kho'],
  ['xuat-kho', 'thu-kho'],
  ['chuyen-kho', 'thu-kho'],
  ['lap-ra', 'thu-kho'],
  ['nhap-kho', 'thu-kho'],
  ['tinh-gia', 'thu-kho'],
  ['thu-kho', 'kiem-ke'],
  ['kiem-ke', 'bao-cao'],
]
