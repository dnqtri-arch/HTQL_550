/**
 * Mặc định kết nối API Node (cổng 3001) — đồng bộ với:
 * - `.env.production` / `.env.development` (VITE_HTQL_IP_* , VITE_HTQL_API_PORT)
 * - `phanmem/controlCenter/electron/main.cjs` (IP_LAN / IP_WAN)
 * - `.cursor/rules/build.mdc` (triển khai)
 *
 * Đổi hạ tầng: sửa env khi build client + constants này + main.cjs cùng một đợt.
 */
export const HTQL_DEFAULT_API_PORT = '3001'
export const HTQL_DEFAULT_IP_LAN = '192.168.1.68'
export const HTQL_DEFAULT_IP_PUBLIC = '14.224.152.48'
