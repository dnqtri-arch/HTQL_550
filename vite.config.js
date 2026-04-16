import { readFileSync } from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
var rootPkg = JSON.parse(readFileSync('./package.json', 'utf8'));
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var apiTarget = env.VITE_HTTP_PROXY_API_TARGET || 'http://localhost:3001';
    return {
        base: './',
        plugins: [react()],
        define: {
            'import.meta.env.VITE_APP_VERSION': JSON.stringify(rootPkg.version || '0.0.0'),
        },
        server: {
            /** Dev: mặc định 5174 (theo triển khai kiểm tra module Kết nối máy chủ); override: `VITE_DEV_PORT` */
            port: Number(env.VITE_DEV_PORT || 5174),
            proxy: {
                '/api': { target: apiTarget, changeOrigin: true },
            },
        },
        resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    };
});
