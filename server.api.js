/**
 * VitalTrack - Dedicated Standalone REST API Server
 * 
 * Chạy máy chủ Backend API thuần túy 100%:
 * - KHÔNG chứa bất kỳ giao diện Client nào
 * - KHÔNG khởi động Vite development middleware
 * - KHÔNG phục vụ file tĩnh HTML / CSS / JS của client
 * - Trả về JSON thuần túy cho tất cả các request
 * - Cổng mặc định: 5000 (hoặc PORT được chỉ định trong môi trường)
 */

process.env.API_ONLY = 'true';
if (!process.env.PORT) {
    process.env.PORT = '5000';
}

import('./server.js').catch((err) => {
    console.error('Lỗi khởi động máy chủ REST API:', err);
    process.exit(1);
});
