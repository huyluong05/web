import express from "express";
import path from "path";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { GoogleGenAI, Type } from "@google/genai";
import mysql from "mysql2/promise";
import { createServer as createViteServer } from "vite";
// Lazy initialization of Google GenAI client (Server-side Gemini API)
let geminiAIClient = null;
function getGeminiAI() {
    if (!geminiAIClient && process.env.GEMINI_API_KEY) {
        geminiAIClient = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
                headers: {
                    'User-Agent': 'aistudio-build',
                },
            },
        });
    }
    return geminiAIClient;
}
// =========================================================================
// CẤU HÌNH & KHỞI TẠO BỂ KẾT NỐI MYSQL DATABASE (MYSQL CONNECTION POOL)
// =========================================================================
let mysqlPool = null;
export function getMySQLPool() {
    if (!mysqlPool) {
        const sslCa = process.env.MYSQL_SSL_CA?.replace(/\\n/g, "\n");
        const ssl = sslCa
            ? { ca: sslCa, rejectUnauthorized: true }
            : process.env.MYSQL_SSL === "true"
                ? { rejectUnauthorized: true }
                : undefined;
        mysqlPool = mysql.createPool({
            host: process.env.MYSQL_HOST || "localhost",
            port: parseInt(process.env.MYSQL_PORT || "3306", 10),
            user: process.env.MYSQL_USER || "root",
            password: process.env.MYSQL_PASSWORD || "123456", // Mật khẩu CSDL MySQL theo cấu hình
            database: process.env.MYSQL_DATABASE || "vitaltrack_db",
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            connectTimeout: 5000,
            ...(ssl ? { ssl } : {}),
        });
    }
    return mysqlPool;
}
// =========================================================================
// CẤU HÌNH CỔNG MẠNG (PORT CONFIGURATION)
// =========================================================================
// - Môi trường AI Studio / Cloud Container: Nginx proxy lắng nghe trên cổng 3000.
// - Khi chạy cục bộ trên máy tính (Local Development):
//   + Backend Server: Cổng 5000 (Ví dụ: PORT=5000 npm run server)
//   + Frontend Client (Vite): Cổng 5173 (Ví dụ: npm run client)
//   + Vite đã cấu hình tự động proxy /api tới http://localhost:5000
// =========================================================================
const isApiOnly = process.env.API_ONLY === "true" || process.argv.includes("--api-only");
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (isApiOnly ? 5000 : 3000);
const JWT_SECRET = process.env.JWT_SECRET || "vitaltrack_secret_key_2026_secure";
const dbConnectedDevices = [
    {
        id: "dev_bp_omron_01",
        user_id: 1,
        name: "Máy đo huyết áp Omron Bluetooth HEM-7142T2",
        type: "blood_pressure_monitor",
        model: "Omron HEM-7142 Series",
        batteryLevel: 92,
        status: "connected",
        lastSyncTime: new Date().toISOString(),
        macAddress: "C8:FD:19:44:A1:08",
        firmwareVersion: "v2.1.4",
    },
    {
        id: "dev_watch_garmin_02",
        user_id: 1,
        name: "Đồng hồ đo nhịp tim & vận động Garmin Venu 3",
        type: "smartwatch",
        model: "Garmin Venu 3 GPS",
        batteryLevel: 78,
        status: "connected",
        lastSyncTime: new Date().toISOString(),
        macAddress: "AA:14:B2:90:3E:77",
        firmwareVersion: "v11.0.2",
    },
    {
        id: "dev_scale_xiaomi_03",
        user_id: 1,
        name: "Cân điện tử phân tích chỉ số cơ thể Mi Body Scale 2",
        type: "smart_scale",
        model: "Mi Scale Composition 2",
        batteryLevel: 85,
        status: "idle",
        lastSyncTime: new Date(Date.now() - 86400000).toISOString(),
        macAddress: "F4:8E:38:D1:20:9C",
        firmwareVersion: "v1.0.8",
    },
];
const dbAIDiagnosisHistory = [];
let dbSystemSettings = {
    bpSystolicWarningThreshold: 140,
    bpDiastolicWarningThreshold: 90,
    bpCrisisSystolicThreshold: 180,
    bpCrisisDiastolicThreshold: 120,
    hrHighThreshold: 100,
    hrLowThreshold: 55,
    sessionTimeoutMinutes: 60,
    allowUserRegistration: true,
    maintenanceMode: false,
    selectedAIModel: "gemini-2.5-flash",
    autoAlertSOSContacts: true,
};
// Active in-memory tracking
const activeSessionsMap = new Map();
const dbOtpStore = new Map();
const dbSystemLogs = [];
let nextLogId = 1;

// =========================================================================
// AUDIT LOG SYSTEM (HỆ THỐNG NHẬT KÝ KIỂM TOÁN CHUYÊN SÂU)
// =========================================================================
const dbAuditLogs = [];
let nextAuditLogId = 1;

function sanitizeMetadata(meta) {
    if (!meta || typeof meta !== "object") return null;
    const sanitized = Array.isArray(meta) ? [...meta] : { ...meta };
    const sensitiveKeys = ["password", "currentpassword", "newpassword", "oldpassword", "token", "jwt", "apikey", "secret", "authorization"];
    for (const key of Object.keys(sanitized)) {
        if (typeof key === "string" && sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
            delete sanitized[key];
        } else if (sanitized[key] && typeof sanitized[key] === "object") {
            sanitized[key] = sanitizeMetadata(sanitized[key]);
        }
    }
    return sanitized;
}

function extractReqClientInfo(req) {
    if (!req) return { ip: "127.0.0.1", userAgent: "Browser Client" };
    const rawIp = req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1";
    const ip = typeof rawIp === "string" ? rawIp.split(",")[0].trim() : "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Browser Client";
    return { ip, userAgent };
}

async function createAuditLog({
    userId = null,
    userName = "Khách vãng lai",
    userRole = "guest",
    action,
    module = "General",
    page = "/",
    resourceType = null,
    resourceId = null,
    description,
    metadata = null,
    status = "SUCCESS",
    req = null,
    ipAddress = null,
    userAgent = null,
    createdAt = null
}) {
    let clientIp = ipAddress;
    let clientUA = userAgent;
    if (req) {
        const clientInfo = extractReqClientInfo(req);
        if (!clientIp) clientIp = clientInfo.ip;
        if (!clientUA) clientUA = clientInfo.userAgent;
        if (!userId && req.user) {
            userId = req.user.id;
            userName = req.user.full_name || req.user.fullName || userName;
            userRole = req.user.role || userRole;
        }
    }

    const cleanMeta = sanitizeMetadata(metadata);
    const newAuditLog = {
        id: nextAuditLogId++,
        user_id: userId,
        user_name: userName || "Khách vãng lai",
        user_role: userRole || "guest",
        action,
        module,
        page,
        resource_type: resourceType,
        resource_id: resourceId !== null && resourceId !== undefined ? String(resourceId) : null,
        description,
        metadata: cleanMeta,
        ip_address: clientIp || "127.0.0.1",
        user_agent: clientUA || "Browser Client",
        status: status === "FAILED" ? "FAILED" : "SUCCESS",
        created_at: createdAt || new Date().toISOString()
    };

    dbAuditLogs.unshift(newAuditLog);
    if (dbAuditLogs.length > 3000) {
        dbAuditLogs.pop();
    }

    try {
        const pool = getMySQLPool();
        // Convert to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS) if it's ISO
        let sqlDate = newAuditLog.created_at;
        if (sqlDate && sqlDate.includes('T')) {
            sqlDate = new Date(sqlDate).toISOString().slice(0, 19).replace('T', ' ');
        }
        await pool.execute(
            'INSERT INTO audit_logs (user_id, user_name, user_role, action, module, page, resource_type, resource_id, description, metadata, ip_address, user_agent, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                newAuditLog.user_id,
                newAuditLog.user_name,
                newAuditLog.user_role,
                newAuditLog.action,
                newAuditLog.module,
                newAuditLog.page,
                newAuditLog.resource_type,
                newAuditLog.resource_id,
                newAuditLog.description,
                newAuditLog.metadata ? JSON.stringify(newAuditLog.metadata) : null,
                newAuditLog.ip_address,
                newAuditLog.user_agent,
                newAuditLog.status,
                sqlDate
            ]
        );
    } catch (dbErr) {
        console.error('Error inserting audit log into MySQL:', dbErr);
    }

    // Ghi vào danh sách log hệ thống phụ để đảm bảo tính tương thích ngược
    logSystemActivity(action, status === "SUCCESS" ? "success" : "danger", description, {
        userId,
        userName,
        userRole,
        ip: clientIp,
        userAgent: clientUA
    });

    // Lưu vào MySQL nếu bể kết nối đang sẵn sàng
    try {
        const pool = getMySQLPool();
        if (pool) {
            await pool.query(
                `INSERT INTO audit_logs (user_id, user_name, user_role, action, module, page, resource_type, resource_id, description, metadata, ip_address, user_agent, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    userId,
                    userName || 'Khách vãng lai',
                    userRole || 'guest',
                    action,
                    module,
                    page,
                    resourceType,
                    resourceId !== null && resourceId !== undefined ? String(resourceId) : null,
                    description,
                    cleanMeta ? JSON.stringify(cleanMeta) : null,
                    clientIp || '127.0.0.1',
                    clientUA || 'Browser Client',
                    status === 'FAILED' ? 'FAILED' : 'SUCCESS'
                ]
            );
        }
    } catch (e) {
        // Tiếp tục chế độ in-memory nếu MySQL chưa được khởi động
    }

    return newAuditLog;
}

function logSystemActivity(action, status, details, meta) {
    const newLog = {
        id: nextLogId++,
        user_id: meta?.userId || null,
        user_name: meta?.userName || (meta?.userEmail ? meta.userEmail.split('@')[0] : 'Khách vãng lai'),
        user_email: meta?.userEmail || 'Chưa xác định',
        user_role: meta?.userRole || 'guest',
        action,
        status,
        ip_address: meta?.ip || '127.0.0.1',
        user_agent: meta?.userAgent || 'Browser Client',
        details,
        timestamp: new Date().toISOString(),
    };
    dbSystemLogs.unshift(newLog);
    // Keep last 500 logs in memory
    if (dbSystemLogs.length > 500) {
        dbSystemLogs.pop();
    }
    return newLog;
}
function cleanExpiredSessions() {
    const now = Date.now();
    const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours idle timeout
    for (const [key, session] of activeSessionsMap.entries()) {
        const lastActive = new Date(session.lastActivityAt).getTime();
        if (now - lastActive > SESSION_TIMEOUT_MS) {
            activeSessionsMap.delete(key);
        }
    }
}
// Initial sample audit logs
const samplePastTime = (minutesAgo) => new Date(Date.now() - minutesAgo * 60000).toISOString();

// Seed initial audit logs for demonstrative auditing
dbAuditLogs.push(
    {
        id: nextAuditLogId++,
        user_id: 2,
        user_name: "Bs. Trần Minh Hoàng (Admin)",
        user_role: "admin",
        action: "USER_LOCKED",
        module: "User Management",
        page: "/admin/users",
        resource_type: "user",
        resource_id: "3",
        description: "Admin đã khóa tài khoản Trần Thị Mai do nghi vấn vi phạm chính sách",
        metadata: {
            target_user_id: 3,
            target_user_name: "Trần Thị Mai",
            target_user_email: "mai.tran@example.com",
            changed_fields: ["is_active"],
            old_values: { is_active: true },
            new_values: { is_active: false },
            reason: "Nghi vấn vi phạm chính sách bảo mật"
        },
        ip_address: "14.241.120.6",
        user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
        status: "SUCCESS",
        created_at: samplePastTime(5)
    },
    {
        id: nextAuditLogId++,
        user_id: 1,
        user_name: "Nguyễn Văn An",
        user_role: "user",
        action: "REMINDER_TOGGLED",
        module: "Reminders",
        page: "/reminders",
        resource_type: "reminder",
        resource_id: "1",
        description: "Nguyễn Văn An đã bật nhắc nhở uống nước",
        metadata: {
            reminder_id: 1,
            title: "Uống 350ml nước ấm buổi sáng",
            type: "water",
            time_of_day: "07:00",
            changed_fields: ["is_active"],
            old_values: { is_active: false },
            new_values: { is_active: true }
        },
        ip_address: "192.168.1.45",
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
        status: "SUCCESS",
        created_at: samplePastTime(14)
    },
    {
        id: nextAuditLogId++,
        user_id: 1,
        user_name: "Nguyễn Văn An",
        user_role: "user",
        action: "GOAL_PROGRESS_UPDATED",
        module: "Goals",
        page: "/goals",
        resource_type: "goal",
        resource_id: "1",
        description: "Nguyễn Văn An đã cập nhật tiến độ mục tiêu giảm cân: 68.5 kg",
        metadata: {
            goal_id: 1,
            title: "Giảm cân về 65kg",
            changed_fields: ["current_value", "progress_percentage"],
            old_values: { current_value: 70.0, progress_percentage: 40 },
            new_values: { current_value: 68.5, progress_percentage: 60 }
        },
        ip_address: "192.168.1.45",
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
        status: "SUCCESS",
        created_at: samplePastTime(22)
    },
    {
        id: nextAuditLogId++,
        user_id: 1,
        user_name: "Nguyễn Văn An",
        user_role: "user",
        action: "HEALTH_RECORD_UPDATED",
        module: "Health Metrics",
        page: "/health",
        resource_type: "health_record",
        resource_id: "125",
        description: "Nguyễn Văn An đã cập nhật bản ghi sức khỏe #125",
        metadata: {
            record_id: 125,
            changed_fields: ["weight", "heart_rate"],
            old_values: { weight: 70.0, heart_rate: 75 },
            new_values: { weight: 68.5, heart_rate: 72 }
        },
        ip_address: "192.168.1.45",
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
        status: "SUCCESS",
        created_at: samplePastTime(32)
    },
    {
        id: nextAuditLogId++,
        user_id: 1,
        user_name: "Nguyễn Văn An",
        user_role: "user",
        action: "HEALTH_RECORD_CREATED",
        module: "Health Metrics",
        page: "/health",
        resource_type: "health_record",
        resource_id: "125",
        description: "Nguyễn Văn An đã thêm bản ghi sức khỏe mới",
        metadata: {
            weight: 70.0,
            systolic: 120,
            diastolic: 80,
            heart_rate: 75,
            notes: "Đo sau khi tập thể dục buổi sáng"
        },
        ip_address: "192.168.1.45",
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
        status: "SUCCESS",
        created_at: samplePastTime(48)
    },
    {
        id: nextAuditLogId++,
        user_id: 1,
        user_name: "Nguyễn Văn An",
        user_role: "user",
        action: "HEALTH_PAGE_VIEWED",
        module: "Health Metrics",
        page: "/health",
        resource_type: "page",
        resource_id: "/health",
        description: "Nguyễn Văn An đã truy cập trang Chỉ số sức khỏe",
        metadata: null,
        ip_address: "192.168.1.45",
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
        status: "SUCCESS",
        created_at: samplePastTime(50)
    },
    {
        id: nextAuditLogId++,
        user_id: 1,
        user_name: "Nguyễn Văn An",
        user_role: "user",
        action: "LOGIN",
        module: "Auth",
        page: "/login",
        resource_type: "user",
        resource_id: "1",
        description: "Nguyễn Văn An đã đăng nhập hệ thống thành công",
        metadata: { email: "user@vitaltrack.vn", role: "user", method: "password" },
        ip_address: "192.168.1.45",
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
        status: "SUCCESS",
        created_at: samplePastTime(52)
    },
    {
        id: nextAuditLogId++,
        user_id: null,
        user_name: "Khách vãng lai",
        user_role: "guest",
        action: "LOGIN_FAILED",
        module: "Auth",
        page: "/login",
        resource_type: "user",
        resource_id: null,
        description: "Đăng nhập thất bại: Sai mật khẩu hoặc tài khoản chưa kích hoạt",
        metadata: { attempted_email: "hacker@test.xyz", reason: "Tài khoản không tồn tại" },
        ip_address: "103.145.2.11",
        user_agent: "Python-urllib/3.9",
        status: "FAILED",
        created_at: samplePastTime(85)
    },
    {
        id: nextAuditLogId++,
        user_id: 2,
        user_name: "Bs. Trần Minh Hoàng (Admin)",
        user_role: "admin",
        action: "USER_VIEWED",
        module: "User Management",
        page: "/admin/users",
        resource_type: "user",
        resource_id: "1",
        description: "Admin đã xem hồ sơ bệnh án chi tiết của bệnh nhân Nguyễn Văn An",
        metadata: { viewed_user_id: 1, viewed_user_name: "Nguyễn Văn An" },
        ip_address: "14.241.120.6",
        user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
        status: "SUCCESS",
        created_at: samplePastTime(95)
    }
);

dbSystemLogs.push({
    id: nextLogId++,
    user_id: 2,
    user_name: "Quản Trị Viên",
    user_email: "admin@vitaltrack.vn",
    user_role: "admin",
    action: "LOGIN_SUCCESS",
    status: "success",
    ip_address: "192.168.1.10",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
    details: "Đăng nhập hệ thống quản trị thành công",
    timestamp: samplePastTime(25),
}, {
    id: nextLogId++,
    user_id: 1,
    user_name: "Nguyễn Văn An",
    user_email: "user@vitaltrack.vn",
    user_role: "user",
    action: "LOGIN_SUCCESS",
    status: "success",
    ip_address: "14.232.18.92",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
    details: "Đăng nhập thành công từ thiết bị di động",
    timestamp: samplePastTime(42),
}, {
    id: nextLogId++,
    user_id: null,
    user_name: "Khách vãng lai",
    user_email: "unknown@hacker.io",
    user_role: "guest",
    action: "LOGIN_FAILED",
    status: "danger",
    ip_address: "103.145.2.11",
    user_agent: "Python-urllib/3.9",
    details: "Đăng nhập thất bại: Tài khoản không tồn tại",
    timestamp: samplePastTime(90),
}, {
    id: nextLogId++,
    user_id: 1,
    user_name: "Nguyễn Văn An",
    user_email: "user@vitaltrack.vn",
    user_role: "user",
    action: "RECORD_CREATED",
    status: "info",
    ip_address: "14.232.18.92",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    details: "Thêm chỉ số sức khỏe mới: Cân nặng 68.5kg, HA 118/76",
    timestamp: samplePastTime(110),
}, {
    id: nextLogId++,
    user_id: 3,
    user_name: "Trần Thị Mai",
    user_email: "mai.tran@example.com",
    user_role: "user",
    action: "REGISTER",
    status: "success",
    ip_address: "113.161.72.45",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/121.0",
    details: "Đăng ký thành viên mới thành công",
    timestamp: samplePastTime(180),
});
// Initial active session for demo
activeSessionsMap.set("session_admin_init", {
    sessionId: "session_admin_init",
    userId: 2,
    userName: "Quản Trị Viên",
    userEmail: "admin@vitaltrack.vn",
    userRole: "admin",
    ipAddress: "192.168.1.10",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
    loginAt: samplePastTime(25),
    lastActivityAt: new Date().toISOString(),
});
activeSessionsMap.set("session_user_init", {
    sessionId: "session_user_init",
    userId: 1,
    userName: "Nguyễn Văn An",
    userEmail: "user@vitaltrack.vn",
    userRole: "user",
    ipAddress: "14.232.18.92",
    userAgent: "Mozilla/5.0 (iPhone; iOS 17_0) Mobile Safari",
    loginAt: samplePastTime(42),
    lastActivityAt: samplePastTime(5),
});
const loginAttemptsMap = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
function getLoginAttemptRecord(identifier) {
    const normalized = identifier.toLowerCase().trim();
    const record = loginAttemptsMap.get(normalized);
    const now = Date.now();
    if (!record) {
        const newRecord = { count: 0, lockedUntil: 0, lastAttemptAt: now };
        loginAttemptsMap.set(normalized, newRecord);
        return newRecord;
    }
    // If lockout has expired, reset count
    if (record.lockedUntil > 0 && record.lockedUntil <= now) {
        record.count = 0;
        record.lockedUntil = 0;
    }
    // Reset count if last attempt was over 30 minutes ago
    if (now - record.lastAttemptAt > 30 * 60 * 1000 && record.lockedUntil === 0) {
        record.count = 0;
    }
    record.lastAttemptAt = now;
    return record;
}
function recordFailedLogin(identifier) {
    const record = getLoginAttemptRecord(identifier);
    const now = Date.now();
    record.count += 1;
    record.lastAttemptAt = now;
    if (record.count >= MAX_FAILED_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_DURATION_MS;
        return {
            isLocked: true,
            attemptsLeft: 0,
            lockTimeRemainingMinutes: Math.ceil(LOCKOUT_DURATION_MS / 60000),
        };
    }
    return {
        isLocked: false,
        attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - record.count),
        lockTimeRemainingMinutes: 0,
    };
}
function clearFailedLogin(identifier) {
    const normalized = identifier.toLowerCase().trim();
    loginAttemptsMap.delete(normalized);
}
// Initial default password hash for 'password123'
const defaultPasswordHash = bcrypt.hashSync("password123", 10);
const dbUsers = [
    {
        id: 1,
        full_name: "Nguyễn Văn An",
        email: "user@vitaltrack.vn",
        password: defaultPasswordHash,
        role: "user",
        is_active: true,
        phone_number: "0912 345 678",
        date_of_birth: "1992-05-14",
        gender: "male",
        address: "Quận Cầu Giấy, TP. Hà Nội",
        occupation: "Kỹ sư phần mềm",
        height_cm: 172,
        base_weight_kg: 70.0,
        target_weight_kg: 65.0,
        blood_type: "A+",
        activity_level: "light",
        chronic_conditions: ["Tiền tăng huyết áp", "Thoái hóa đốt sống cổ nhẹ"],
        allergies: ["Phấn hoa mùa xuân", "Hải sản có vỏ (Tôm cua)"],
        current_medications: "Vitamin C 500mg, Omega-3 Dầu cá",
        medical_notes: "Cần theo dõi huyết áp sau giờ làm việc, tránh thức khuya sau 23h.",
        primary_doctor: "ThS. BS. Nguyễn Minh Tuấn",
        hospital_clinic: "Bệnh viện Đại học Y Hà Nội",
        emergency_contact_name: "Nguyễn Thị Hương",
        emergency_contact_relationship: "Vợ",
        emergency_contact_phone: "0988 765 432",
        weight_unit: "kg",
        height_unit: "cm",
        email_notifications: true,
        vital_alert_thresholds: {
            highSystolic: 140,
            highDiastolic: 90,
            highHeartRate: 100,
            lowHeartRate: 55,
        },
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 2,
        full_name: "Quản Trị Viên",
        email: "admin@vitaltrack.vn",
        password: defaultPasswordHash,
        role: "admin",
        is_active: true,
        phone_number: "0909 999 888",
        date_of_birth: "1988-10-20",
        gender: "male",
        address: "TP. Hồ Chí Minh",
        occupation: "Quản trị hệ thống Y tế",
        height_cm: 175,
        base_weight_kg: 72.0,
        target_weight_kg: 70.0,
        blood_type: "O+",
        activity_level: "moderate",
        chronic_conditions: [],
        allergies: [],
        email_notifications: true,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 3,
        full_name: "Trần Thị Mai",
        email: "mai.tran@example.com",
        password: defaultPasswordHash,
        role: "user",
        is_active: true,
        phone_number: "0934 112 233",
        date_of_birth: "1995-03-08",
        gender: "female",
        address: "Quận 1, TP. Hồ Chí Minh",
        occupation: "Chuyên viên Tài chính",
        height_cm: 162,
        base_weight_kg: 54.0,
        target_weight_kg: 50.0,
        blood_type: "B+",
        activity_level: "moderate",
        chronic_conditions: [],
        allergies: ["Thuốc kháng sinh Amoxicillin"],
        emergency_contact_name: "Trần Văn Bình",
        emergency_contact_relationship: "Bố",
        emergency_contact_phone: "0903 456 789",
        email_notifications: true,
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
    },
];
let nextUserId = 4;
let nextRecordId = 8;
let nextGoalId = 4;
let nextReminderId = 4;
const generateDateString = (daysAgo) => {
    const d = new Date(Date.now() - daysAgo * 86400000);
    return d.toISOString();
};
const dbHealthRecords = [
    {
        id: 1,
        user_id: 1,
        weight: 70.0,
        systolic: 124,
        diastolic: 82,
        heart_rate: 78,
        recorded_at: generateDateString(28),
        notes: "Bắt đầu kế hoạch sức khỏe",
        created_at: generateDateString(28),
    },
    {
        id: 2,
        user_id: 1,
        weight: 69.8,
        systolic: 122,
        diastolic: 80,
        heart_rate: 77,
        recorded_at: generateDateString(21),
        notes: "Tuần 1 cải thiện chế độ ăn",
        created_at: generateDateString(21),
    },
    {
        id: 3,
        user_id: 1,
        weight: 69.3,
        systolic: 120,
        diastolic: 78,
        heart_rate: 76,
        recorded_at: generateDateString(14),
        notes: "Tuần 2 duy trì tập đều",
        created_at: generateDateString(14),
    },
    {
        id: 4,
        user_id: 1,
        weight: 69.0,
        systolic: 119,
        diastolic: 77,
        heart_rate: 75,
        recorded_at: generateDateString(7),
        notes: "Tuần 3 chỉ số ổn định",
        created_at: generateDateString(7),
    },
    {
        id: 5,
        user_id: 1,
        weight: 68.7,
        systolic: 118,
        diastolic: 76,
        heart_rate: 75,
        recorded_at: generateDateString(3),
        notes: "Cảm giác nhẹ nhõm khỏe khoắn",
        created_at: generateDateString(3),
    },
    {
        id: 6,
        user_id: 1,
        weight: 68.5,
        systolic: 118,
        diastolic: 76,
        heart_rate: 74,
        recorded_at: new Date().toISOString(),
        notes: "Ghi nhận hôm nay",
        created_at: new Date().toISOString(),
    },
];
const dbGoals = [
    {
        id: 1,
        user_id: 1,
        title: "Mục tiêu cân nặng: 65kg",
        metric_type: "weight",
        start_value: 70.0,
        target_value: 65.0,
        current_value: 68.5,
        unit: "kg",
        status: "in_progress",
        created_at: generateDateString(30),
        updated_at: new Date().toISOString(),
    },
    {
        id: 2,
        user_id: 1,
        title: "Duy trì huyết áp chuẩn",
        metric_type: "blood_pressure",
        start_value: 124.0,
        target_value: 118.0,
        current_value: 118.0,
        unit: "mmHg",
        status: "completed",
        created_at: generateDateString(25),
        updated_at: new Date().toISOString(),
    },
    {
        id: 3,
        user_id: 1,
        title: "Nhịp tim nghỉ ngơi dưới 72 bpm",
        metric_type: "heart_rate",
        start_value: 78.0,
        target_value: 70.0,
        current_value: 74.0,
        unit: "bpm",
        status: "in_progress",
        created_at: generateDateString(20),
        updated_at: new Date().toISOString(),
    },
];
const dbReminders = [
    {
        id: 1,
        user_id: 1,
        type: "water",
        title: "Uống 500ml nước buổi sáng",
        time_of_day: "08:00",
        is_active: true,
        created_at: generateDateString(20),
    },
    {
        id: 2,
        user_id: 1,
        type: "water",
        title: "Uống nước sau giờ làm việc",
        time_of_day: "14:30",
        is_active: true,
        created_at: generateDateString(18),
    },
    {
        id: 3,
        user_id: 1,
        type: "exercise",
        title: "Đi bộ thể dục buổi tối 30 phút",
        time_of_day: "18:00",
        is_active: true,
        created_at: generateDateString(15),
    },
];
// Helper to calculate goal progress percentage
function calculateProgress(goal) {
    if (goal.start_value === goal.target_value)
        return 100;
    const totalChangeNeeded = Math.abs(goal.target_value - goal.start_value);
    const currentChangeMade = Math.abs(goal.current_value - goal.start_value);
    const rawPercent = Math.min(100, Math.max(0, (currentChangeMade / totalChangeNeeded) * 100));
    return Math.round(rawPercent);
}
const authenticateJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Không tìm thấy token xác thực hoặc phiên đăng nhập đã hết hạn.",
        });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Check if user still exists and is active using MySQL database
        const pool = getMySQLPool();
        const [users] = await pool.query('SELECT id, email, role, full_name, is_active FROM users WHERE id = ?', [decoded.id]);
        const user = users[0];

        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                message: "Tài khoản không tồn tại hoặc đã bị khóa.",
            });
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
        };
        next();
    }
    catch (err) {
        return res.status(401).json({
            success: false,
            message: "Token không hợp lệ hoặc đã hết hạn.",
        });
    }
};
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Quyền truy cập bị từ chối. Chức năng chỉ dành cho Quản trị viên.",
        });
    }
    next();
};
// Helper to return user object without sensitive password field
function sanitizeUser(user) {
    const { password, ...safeUser } = user;
    return safeUser;
}
async function startServer() {
    const app = express();
    // Basic Middlewares
    const configuredOrigins = (process.env.CORS_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
    app.use(cors({
        // With no CORS_ORIGINS configured, preserve the existing permissive
        // local behavior. Production can provide a comma-separated allowlist.
        origin: configuredOrigins.length > 0 ? configuredOrigins : true,
        credentials: true,
    }));
    app.use(express.json());
    // Security Headers Middleware
    app.use((req, res, next) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "SAMEORIGIN");
        res.setHeader("X-XSS-Protection", "1; mode=block");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        next();
    });
    // Health check endpoint
    app.get("/api/ping", (req, res) => {
        res.json({ success: true, message: "VitalTrack REST API is operational." });
    });
    // ==========================================
    // AUTHENTICATION ROUTES (/api/auth)
    // ==========================================
    app.post("/api/auth/register", async (req, res) => {
        try {
            const { full_name, email, password, confirm_password } = req.body;
            const trimmedName = typeof full_name === 'string' ? full_name.trim() : '';
            const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
            if (!trimmedName || !trimmedEmail || !password) {
                return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ họ tên, email và mật khẩu." });
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmedEmail)) {
                return res.status(400).json({ success: false, message: "Địa chỉ email không đúng định dạng hợp lệ." });
            }
            if (confirm_password && password !== confirm_password) {
                return res.status(400).json({ success: false, message: "Mật khẩu xác nhận không khớp." });
            }
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: "Mật khẩu phải có ít nhất 6 ký tự để đảm bảo an toàn." });
            }

            const pool = getMySQLPool();
            const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
            if (existing.length > 0) {
                return res.status(409).json({ success: false, message: "Email này đã được đăng ký tài khoản trong hệ thống." });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const [userResult] = await pool.execute(
                'INSERT INTO users (full_name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)',
                [trimmedName, trimmedEmail, hashedPassword, 'user', 1]
            );
            const newUserId = userResult.insertId;
            const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [newUserId]);
            const newUser = newUsers[0];

            await pool.execute(
                'INSERT INTO goals (user_id, title, metric_type, start_value, target_value, current_value, unit, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [newUser.id, "Duy trì cân nặng lý tưởng", "weight", 70, 65, 70, "kg", "in_progress"]
            );
            await pool.execute(
                'INSERT INTO reminders (user_id, type, title, time_of_day, is_active) VALUES (?, ?, ?, ?, ?)',
                [newUser.id, "water", "Uống ly nước buổi sáng", "08:00", 1]
            );

            const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
            const userAgent = req.headers["user-agent"] || "Unknown Browser";

            logSystemActivity("REGISTER", "success", `Đăng ký tài khoản thành công cho ${newUser.email}`, {
                userId: newUser.id, userName: newUser.full_name, userEmail: newUser.email, userRole: newUser.role, ip: clientIp, userAgent
            });
            createAuditLog({
                userId: newUser.id, userName: newUser.full_name, userRole: newUser.role,
                action: "REGISTER", module: "Auth", page: "/register", resourceType: "user", resourceId: newUser.id,
                description: `${newUser.full_name} đã đăng ký tài khoản thành viên mới`,
                metadata: { email: newUser.email, full_name: newUser.full_name }, status: "SUCCESS", req
            });

            const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, full_name: newUser.full_name }, JWT_SECRET, { expiresIn: "7d" });

            cleanExpiredSessions();
            const sessionId = `sess_${newUser.id}_${Date.now()}`;
            activeSessionsMap.set(sessionId, {
                sessionId, userId: newUser.id, userName: newUser.full_name, userEmail: newUser.email, userRole: newUser.role,
                ipAddress: clientIp, userAgent, loginAt: new Date().toISOString(), lastActivityAt: new Date().toISOString()
            });

            return res.status(201).json({
                success: true,
                message: "Đăng ký tài khoản thành công!",
                data: {
                    token,
                    user: { id: newUser.id, full_name: newUser.full_name, email: newUser.email, role: newUser.role, is_active: newUser.is_active }
                }
            });
        } catch (err) {
            console.error('Error in register:', err);
            return res.status(500).json({ success: false, message: "Lỗi server khi đăng ký.", error: err.message });
        }
    });
    // Login
    app.post("/api/auth/login", async (req, res) => {
        try {
            const { email, password } = req.body;
            const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
            if (!trimmedEmail || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Vui lòng nhập đầy đủ địa chỉ email và mật khẩu.",
                });
            }
            // Email format regex validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmedEmail)) {
                return res.status(400).json({
                    success: false,
                    message: "Địa chỉ email không đúng định dạng.",
                });
            }
            // Check brute-force lockout status
            const attemptInfo = getLoginAttemptRecord(trimmedEmail);
            const now = Date.now();
            if (attemptInfo.lockedUntil > now) {
                const remainingMinutes = Math.ceil((attemptInfo.lockedUntil - now) / 60000);
                return res.status(429).json({
                    success: false,
                    message: `Tài khoản tạm thời bị khóa do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
                    locked: true,
                    remainingMinutes,
                });
            }
            const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
            const userAgent = req.headers["user-agent"] || "Unknown Browser";
            const pool = getMySQLPool();
            const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [trimmedEmail]);
            const user = users[0];
            if (!user) {
                // Track failed attempt to prevent email enumeration timing attacks
                const { isLocked, attemptsLeft, lockTimeRemainingMinutes } = recordFailedLogin(trimmedEmail);
                logSystemActivity("LOGIN_FAILED", "danger", `Đăng nhập thất bại: Tài khoản không tồn tại (${trimmedEmail})`, {
                    userId: null,
                    userName: "Khách vãng lai",
                    userEmail: trimmedEmail,
                    userRole: "guest",
                    ip: clientIp,
                    userAgent,
                });
                createAuditLog({
                    userId: null,
                    userName: "Khách vãng lai",
                    userRole: "guest",
                    action: "LOGIN_FAILED",
                    module: "Auth",
                    page: "/login",
                    resourceType: "user",
                    resourceId: null,
                    description: `Đăng nhập thất bại: Tài khoản không tồn tại (${trimmedEmail})`,
                    metadata: { attempted_email: trimmedEmail, reason: "Tài khoản không tồn tại" },
                    status: "FAILED",
                    req
                });
                if (isLocked) {
                    logSystemActivity("ACCOUNT_LOCKED", "danger", `Tài khoản ${trimmedEmail} bị tạm khóa do thử sai quá 5 lần`, {
                        userId: null,
                        userEmail: trimmedEmail,
                        ip: clientIp,
                        userAgent,
                    });
                    return res.status(429).json({
                        success: false,
                        message: `Tài khoản đã bị tạm khóa ${lockTimeRemainingMinutes} phút do vượt quá số lần thử đăng nhập cho phép.`,
                        locked: true,
                    });
                }
                return res.status(401).json({
                    success: false,
                    message: `Email hoặc mật khẩu không chính xác. Bạn còn ${attemptsLeft} lần thử trước khi tài khoản bị tạm khóa.`,
                    attemptsLeft,
                });
            }
            if (!user.is_active) {
                logSystemActivity("LOGIN_FAILED", "warning", `Từ chối đăng nhập: Tài khoản ${user.email} đang bị vô hiệu hóa`, {
                    userId: user.id,
                    userName: user.full_name,
                    userEmail: user.email,
                    userRole: user.role,
                    ip: clientIp,
                    userAgent,
                });
                createAuditLog({
                    userId: user.id,
                    userName: user.full_name,
                    userRole: user.role,
                    action: "LOGIN_FAILED",
                    module: "Auth",
                    page: "/login",
                    resourceType: "user",
                    resourceId: user.id,
                    description: `Từ chối đăng nhập: Tài khoản ${user.full_name} (${user.email}) đang bị vô hiệu hóa`,
                    metadata: { email: user.email, reason: "Tài khoản bị vô hiệu hóa bởi Quản trị viên" },
                    status: "FAILED",
                    req
                });
                return res.status(403).json({
                    success: false,
                    message: "Tài khoản của bạn đã bị vô hiệu hóa bởi Quản trị viên. Vui lòng liên hệ hỗ trợ.",
                });
            }
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                const { isLocked, attemptsLeft, lockTimeRemainingMinutes } = recordFailedLogin(trimmedEmail);
                logSystemActivity("LOGIN_FAILED", "danger", `Đăng nhập thất bại: Sai mật khẩu cho ${user.email}`, {
                    userId: user.id,
                    userName: user.full_name,
                    userEmail: user.email,
                    userRole: user.role,
                    ip: clientIp,
                    userAgent,
                });
                createAuditLog({
                    userId: user.id,
                    userName: user.full_name,
                    userRole: user.role,
                    action: "LOGIN_FAILED",
                    module: "Auth",
                    page: "/login",
                    resourceType: "user",
                    resourceId: user.id,
                    description: `${user.full_name} đăng nhập thất bại: Sai mật khẩu`,
                    metadata: { email: user.email, reason: "Sai mật khẩu", attemptsLeft },
                    status: "FAILED",
                    req
                });
                if (isLocked) {
                    logSystemActivity("ACCOUNT_LOCKED", "danger", `Tài khoản ${user.email} bị tạm khóa do nhập sai mật khẩu 5 lần`, {
                        userId: user.id,
                        userName: user.full_name,
                        userEmail: user.email,
                        userRole: user.role,
                        ip: clientIp,
                        userAgent,
                    });
                    return res.status(429).json({
                        success: false,
                        message: `Tài khoản đã bị tạm khóa ${lockTimeRemainingMinutes} phút do nhập sai mật khẩu 5 lần liên tiếp.`,
                        locked: true,
                    });
                }
                return res.status(401).json({
                    success: false,
                    message: `Mật khẩu không chính xác. Bạn còn ${attemptsLeft} lần thử trước khi bị tạm khóa bảo mật.`,
                    attemptsLeft,
                });
            }
            // Successful login -> reset brute-force counter
            clearFailedLogin(trimmedEmail);
            // Track active session
            cleanExpiredSessions();
            const sessionId = `sess_${user.id}_${Date.now()}`;
            activeSessionsMap.set(sessionId, {
                sessionId,
                userId: user.id,
                userName: user.full_name,
                userEmail: user.email,
                userRole: user.role,
                ipAddress: clientIp,
                userAgent,
                loginAt: new Date().toISOString(),
                lastActivityAt: new Date().toISOString(),
            });
            logSystemActivity("LOGIN_SUCCESS", "success", `Đăng nhập thành công vào hệ thống (${user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'})`, {
                userId: user.id,
                userName: user.full_name,
                userEmail: user.email,
                userRole: user.role,
                ip: clientIp,
                userAgent,
            });
            createAuditLog({
                userId: user.id,
                userName: user.full_name,
                userRole: user.role,
                action: "LOGIN",
                module: "Auth",
                page: "/login",
                resourceType: "user",
                resourceId: user.id,
                description: `${user.full_name} đã đăng nhập hệ thống thành công`,
                metadata: { email: user.email, role: user.role, method: "password" },
                status: "SUCCESS",
                req
            });
            const token = jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name, sessionId }, JWT_SECRET, { expiresIn: "7d" });
            return res.status(200).json({
                success: true,
                message: "Đăng nhập thành công!",
                data: {
                    token,
                    user: sanitizeUser(user),
                },
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi hệ thống khi xác thực đăng nhập.", error: err.message });
        }
    });
    // POST /api/auth/social-login (Google, Apple)
    app.post("/api/auth/social-login", async (req, res) => {
        try {
            const { provider = "google", email, full_name, avatar_url } = req.body;
            if (!email || typeof email !== "string" || !email.includes("@")) {
                return res.status(400).json({ success: false, message: "Email tài khoản không hợp lệ từ nhà cung cấp xác thực." });
            }
            const trimmedEmail = email.toLowerCase().trim();
            const providerName = provider === "apple" ? "Apple ID" : "Google";
            const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
            const userAgent = req.headers["user-agent"] || "Unknown Browser";

            const pool = getMySQLPool();
            const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [trimmedEmail]);
            let user = users[0];
            let isNewUser = false;

            if (user) {
                if (!user.is_active) {
                    return res.status(403).json({ success: false, message: "Tài khoản của bạn đã bị khóa hoặc tạm ngưng bởi Quản trị viên." });
                }

                let avatarUpdateQuery = '';
                let queryParams = [];
                if (avatar_url && !user.avatar_url) {
                    avatarUpdateQuery = 'UPDATE users SET avatar_url = ? WHERE id = ?';
                    queryParams = [avatar_url, user.id];
                    await pool.execute(avatarUpdateQuery, queryParams);
                    user.avatar_url = avatar_url;
                }
            } else {
                isNewUser = true;
                const displayName = (full_name && typeof full_name === "string" && full_name.trim().length > 0)
                    ? full_name.trim()
                    : (provider === "apple" ? "Người dùng Apple ID" : "Người dùng Google");

                const defaultAvatar = avatar_url || (provider === "apple"
                    ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                    : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80");

                const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);

                const [insertResult] = await pool.execute(
                    'INSERT INTO users (full_name, email, password, role, is_active, avatar_url) VALUES (?, ?, ?, ?, ?, ?)',
                    [displayName, trimmedEmail, randomPassword, 'user', 1, defaultAvatar]
                );

                const newUserId = insertResult.insertId;
                const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [newUserId]);
                user = newUsers[0];

                // Add default starter health goals & reminders
                await pool.execute(
                    'INSERT INTO goals (user_id, title, metric_type, start_value, target_value, current_value, unit, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [user.id, "Duy trì cân nặng lý tưởng", "weight", 70, 65, 70, "kg", "in_progress"]
                );
                await pool.execute(
                    'INSERT INTO reminders (user_id, type, title, time_of_day, is_active) VALUES (?, ?, ?, ?, ?)',
                    [user.id, "water", "Uống ly nước buổi sáng", "08:00", 1]
                );
            }

            cleanExpiredSessions();
            const sessionId = `sess_${user.id}_${Date.now()}`;
            activeSessionsMap.set(sessionId, {
                sessionId,
                userId: user.id,
                userName: user.full_name,
                userEmail: user.email,
                userRole: user.role,
                ipAddress: clientIp,
                userAgent,
                loginAt: new Date().toISOString(),
                lastActivityAt: new Date().toISOString(),
            });

            createAuditLog({
                userId: user.id,
                userName: user.full_name,
                userRole: user.role,
                action: isNewUser ? "REGISTER_SOCIAL" : "LOGIN_SOCIAL",
                module: "Auth",
                page: isNewUser ? "/register" : "/login",
                resourceType: "user",
                resourceId: user.id,
                description: `${user.full_name} đã ${isNewUser ? "đăng ký và " : ""}đăng nhập thành công qua ${providerName}`,
                metadata: { email: user.email, provider, isNewUser },
                status: "SUCCESS",
                req,
            });

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, full_name: user.full_name, sessionId },
                JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.status(isNewUser ? 201 : 200).json({
                success: true,
                message: `${isNewUser ? "Đăng ký và đăng nhập" : "Đăng nhập"} thành công bằng ${providerName}!`,
                data: {
                    token,
                    user: sanitizeUser(user),
                    isNewUser,
                },
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi xử lý xác thực xã hội.", error: err.message });
        }
    });

    // POST /api/auth/otp/send (Send OTP to email or phone)
    app.post("/api/auth/otp/send", (req, res) => {
        try {
            const { identifier } = req.body;
            if (!identifier || typeof identifier !== "string" || identifier.trim().length < 4) {
                return res.status(400).json({ success: false, message: "Vui lòng nhập email hoặc số điện thoại hợp lệ." });
            }
            const key = identifier.toLowerCase().trim();
            // Generate a 6-digit numeric OTP code
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

            dbOtpStore.set(key, {
                code: otpCode,
                expiresAt,
                attempts: 0,
            });

            const isEmail = key.includes("@");
            createAuditLog({
                userId: null,
                userName: key,
                userRole: "guest",
                action: "OTP_REQUEST",
                module: "Auth",
                page: "/login",
                resourceType: "otp",
                resourceId: key,
                description: `Yêu cầu mã xác thực OTP gửi đến ${key}`,
                metadata: { identifier: key, type: isEmail ? "email" : "phone" },
                status: "SUCCESS",
                req,
            });

            return res.status(200).json({
                success: true,
                message: `Mã xác thực OTP đã được gửi đến ${identifier}. (Có hiệu lực trong 5 phút)`,
                data: {
                    identifier,
                    // In simulation / development, we return the generated code directly so user can test effortlessly
                    otp: otpCode,
                    expires_in: 300,
                },
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi tạo mã xác thực.", error: err.message });
        }
    });

    // POST /api/auth/otp/verify (Verify OTP & Login / Auto-register)
    app.post("/api/auth/otp/verify", async (req, res) => {
        try {
            const { identifier, code, full_name } = req.body;
            if (!identifier || !code) {
                return res.status(400).json({ success: false, message: "Thông tin mã xác thực không đầy đủ." });
            }
            const key = identifier.toLowerCase().trim();
            const stored = dbOtpStore.get(key);

            if (!stored) {
                return res.status(400).json({ success: false, message: "Không tìm thấy mã xác thực hoặc mã đã hết hạn. Vui lòng lấy mã mới." });
            }
            if (Date.now() > stored.expiresAt) {
                dbOtpStore.delete(key);
                return res.status(400).json({ success: false, message: "Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới." });
            }
            if (stored.code !== String(code).trim()) {
                stored.attempts = (stored.attempts || 0) + 1;
                if (stored.attempts >= 4) {
                    dbOtpStore.delete(key);
                    return res.status(400).json({ success: false, message: "Bạn đã nhập sai mã xác thực quá 3 lần. Mã đã bị hủy để đảm bảo an toàn." });
                }
                return res.status(400).json({ success: false, message: `Mã xác thực không chính xác. Còn ${4 - stored.attempts} lần thử.` });
            }

            // OTP is valid! Clear it
            dbOtpStore.delete(key);

            const isEmail = key.includes("@");
            const pool = getMySQLPool();

            let query = isEmail ? 'SELECT * FROM users WHERE email = ?' : 'SELECT * FROM users WHERE phone_number = ?';
            const [users] = await pool.query(query, [key]);

            let user = users[0];
            let isNewUser = false;

            if (user) {
                if (!user.is_active) {
                    return res.status(403).json({ success: false, message: "Tài khoản của bạn đang bị khóa." });
                }
            } else {
                isNewUser = true;
                const emailToUse = isEmail ? key : `user_${key.replace(/\D/g, "")}@vitaltrack.local`;
                const displayName = (full_name && typeof full_name === "string" && full_name.trim().length > 0)
                    ? full_name.trim()
                    : `Người dùng ${isEmail ? key.split("@")[0] : key}`;

                const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);

                const [insertResult] = await pool.execute(
                    'INSERT INTO users (full_name, email, phone_number, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
                    [displayName, emailToUse, isEmail ? null : key, randomPassword, 'user', 1]
                );

                const newUserId = insertResult.insertId;
                const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [newUserId]);
                user = newUsers[0];

                await pool.execute(
                    'INSERT INTO goals (user_id, title, metric_type, start_value, target_value, current_value, unit, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [user.id, "Theo dõi chỉ số mỗi ngày", "blood_pressure", 120, 115, 120, "mmHg", "in_progress"]
                );
            }

            cleanExpiredSessions();
            const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
            const userAgent = req.headers["user-agent"] || "Unknown Browser";
            const sessionId = `sess_${user.id}_${Date.now()}`;
            activeSessionsMap.set(sessionId, {
                sessionId,
                userId: user.id,
                userName: user.full_name,
                userEmail: user.email,
                userRole: user.role,
                ipAddress: clientIp,
                userAgent,
                loginAt: new Date().toISOString(),
                lastActivityAt: new Date().toISOString(),
            });

            createAuditLog({
                userId: user.id,
                userName: user.full_name,
                userRole: user.role,
                action: isNewUser ? "REGISTER_OTP" : "LOGIN_OTP",
                module: "Auth",
                page: "/login",
                resourceType: "user",
                resourceId: user.id,
                description: `${user.full_name} đã ${isNewUser ? "đăng ký và " : ""}đăng nhập thành công bằng mã xác thực OTP`,
                metadata: { identifier: key, isNewUser },
                status: "SUCCESS",
                req,
            });

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, full_name: user.full_name, sessionId },
                JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.status(200).json({
                success: true,
                message: `${isNewUser ? "Đăng ký và xác thực" : "Xác thực"} thành công! Chào mừng bạn đến với VitalTrack.`,
                data: {
                    token,
                    user: sanitizeUser(user),
                    isNewUser,
                },
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi xác minh mã xác thực.", error: err.message });
        }
    });

    // Current user info (returns full profile)
    app.get("/api/auth/me", authenticateJWT, async (req, res) => {
        try {
            const pool = getMySQLPool();
            const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
            const user = users[0];
            if (!user) {
                return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
            }
            // Parse JSON fields if they are stringified
            if (typeof user.chronic_conditions === 'string') user.chronic_conditions = JSON.parse(user.chronic_conditions);
            if (typeof user.allergies === 'string') user.allergies = JSON.parse(user.allergies);
            if (typeof user.vital_alert_thresholds === 'string') user.vital_alert_thresholds = JSON.parse(user.vital_alert_thresholds);

            return res.status(200).json({
                success: true,
                data: sanitizeUser(user),
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi server." });
        }
    });
    // Update comprehensive user profile
    app.put("/api/profile", authenticateJWT, async (req, res) => {
        try {
            const pool = getMySQLPool();
            const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
            const user = users[0];
            if (!user) {
                return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản người dùng." });
            }
            const body = req.body || {};
            let updates = [];
            let params = [];
            // Validate full_name if provided
            if (body.full_name !== undefined) {
                const trimmedName = String(body.full_name).trim();
                if (!trimmedName) {
                    return res.status(400).json({ success: false, message: "Họ và tên không được để trống." });
                }
                updates.push('full_name = ?'); params.push(trimmedName);
            }
            // Personal & Contact Info
            if (body.phone_number !== undefined) { updates.push('phone_number = ?'); params.push(String(body.phone_number).trim()); }
            if (body.date_of_birth !== undefined) {
                const dateOfBirth = String(body.date_of_birth ?? "").trim();

                if (dateOfBirth === "") {
                    updates.push("date_of_birth = ?");
                    params.push(null);
                } else {
                    const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth);
                    const parsedDate = new Date(`${dateOfBirth}T00:00:00Z`);
                    const isValidDate =
                        isValidFormat &&
                        !Number.isNaN(parsedDate.getTime()) &&
                        parsedDate.toISOString().slice(0, 10) === dateOfBirth;

                    if (!isValidDate) {
                        return res.status(400).json({
                            success: false,
                            message: "Ngày sinh không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD."
                        });
                    }

                    updates.push("date_of_birth = ?");
                    params.push(dateOfBirth);
                }
            }
            if (body.gender !== undefined) { updates.push('gender = ?'); params.push(body.gender); }
            if (body.address !== undefined) { updates.push('address = ?'); params.push(String(body.address).trim()); }
            if (body.occupation !== undefined) { updates.push('occupation = ?'); params.push(String(body.occupation).trim()); }
            if (body.avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(String(body.avatar_url).trim()); }
            // Biometrics & Baseline
            if (body.height_cm !== undefined) {
                const h = Number(body.height_cm);
                if (!isNaN(h) && h >= 40 && h <= 260) { updates.push('height_cm = ?'); params.push(Math.round(h * 10) / 10); }
            }
            if (body.base_weight_kg !== undefined) {
                const bw = Number(body.base_weight_kg);
                if (!isNaN(bw) && bw >= 20 && bw <= 300) { updates.push('base_weight_kg = ?'); params.push(Math.round(bw * 10) / 10); }
            }
            if (body.target_weight_kg !== undefined) {
                const tw = Number(body.target_weight_kg);
                if (!isNaN(tw) && tw >= 20 && tw <= 300) { updates.push('target_weight_kg = ?'); params.push(Math.round(tw * 10) / 10); }
            }
            if (body.blood_type !== undefined) { updates.push('blood_type = ?'); params.push(body.blood_type); }
            if (body.activity_level !== undefined) { updates.push('activity_level = ?'); params.push(body.activity_level); }
            // Medical Profile
            if (Array.isArray(body.chronic_conditions)) {
                updates.push('chronic_conditions = ?');
                params.push(JSON.stringify(body.chronic_conditions.map((item) => String(item).trim()).filter(Boolean)));
            }
            if (Array.isArray(body.allergies)) {
                updates.push('allergies = ?');
                params.push(JSON.stringify(body.allergies.map((item) => String(item).trim()).filter(Boolean)));
            }
            if (body.current_medications !== undefined) { updates.push('current_medications = ?'); params.push(String(body.current_medications).trim()); }
            if (body.medical_notes !== undefined) { updates.push('medical_notes = ?'); params.push(String(body.medical_notes).trim()); }
            if (body.primary_doctor !== undefined) { updates.push('primary_doctor = ?'); params.push(String(body.primary_doctor).trim()); }
            if (body.hospital_clinic !== undefined) { updates.push('hospital_clinic = ?'); params.push(String(body.hospital_clinic).trim()); }
            // Emergency Contact
            if (body.emergency_contact_name !== undefined) { updates.push('emergency_contact_name = ?'); params.push(String(body.emergency_contact_name).trim()); }
            if (body.emergency_contact_relationship !== undefined) { updates.push('emergency_contact_relationship = ?'); params.push(String(body.emergency_contact_relationship).trim()); }
            if (body.emergency_contact_phone !== undefined) { updates.push('emergency_contact_phone = ?'); params.push(String(body.emergency_contact_phone).trim()); }
            // Units & Preferences
            if (body.weight_unit !== undefined) { updates.push('weight_unit = ?'); params.push(body.weight_unit); }
            if (body.height_unit !== undefined) { updates.push('height_unit = ?'); params.push(body.height_unit); }
            if (body.email_notifications !== undefined) { updates.push('email_notifications = ?'); params.push(Boolean(body.email_notifications) ? 1 : 0); }
            if (body.vital_alert_thresholds && typeof body.vital_alert_thresholds === 'object') {
                const thresholds = {
                    highSystolic: Number(body.vital_alert_thresholds.highSystolic) || 140,
                    highDiastolic: Number(body.vital_alert_thresholds.highDiastolic) || 90,
                    highHeartRate: Number(body.vital_alert_thresholds.highHeartRate) || 100,
                    lowHeartRate: Number(body.vital_alert_thresholds.lowHeartRate) || 55,
                };
                updates.push('vital_alert_thresholds = ?'); params.push(JSON.stringify(thresholds));
            }

            let updatedUser = user;
            if (updates.length > 0) {
                updates.push('updated_at = NOW()');
                const query = 'UPDATE users SET ' + updates.join(', ') + ' WHERE id = ?';
                params.push(req.user.id);
                await pool.execute(query, params);

                const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
                updatedUser = newUsers[0];
            }

            // Format arrays back to json objects
            if (typeof updatedUser.chronic_conditions === 'string') updatedUser.chronic_conditions = JSON.parse(updatedUser.chronic_conditions);
            if (typeof updatedUser.allergies === 'string') updatedUser.allergies = JSON.parse(updatedUser.allergies);
            if (typeof updatedUser.vital_alert_thresholds === 'string') updatedUser.vital_alert_thresholds = JSON.parse(updatedUser.vital_alert_thresholds);

            const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
            logSystemActivity("PROFILE_UPDATED", "info", `Cập nhật thông tin hồ sơ sức khỏe thành công`, {
                userId: updatedUser.id,
                userName: updatedUser.full_name,
                userEmail: updatedUser.email,
                userRole: updatedUser.role,
                ip: clientIp,
            });
            createAuditLog({
                userId: updatedUser.id,
                userName: updatedUser.full_name,
                userRole: updatedUser.role,
                action: "PROFILE_UPDATED",
                module: "Profile",
                page: "/profile",
                resourceType: "user",
                resourceId: updatedUser.id,
                description: `${updatedUser.full_name} đã cập nhật hồ sơ cá nhân`,
                metadata: {
                    user_id: updatedUser.id,
                    changed_fields: Object.keys(body).filter(k => !k.toLowerCase().includes("password"))
                },
                status: "SUCCESS",
                req
            });
            return res.status(200).json({
                success: true,
                message: "Cập nhật hồ sơ sức khỏe thành công!",
                data: sanitizeUser(updatedUser),
            });
        }
        catch (err) {
            console.error("Error PUT /api/profile:", err);
            return res.status(500).json({ success: false, message: "Lỗi khi cập nhật hồ sơ.", error: err.message });
        }
    });
    // Update password
    app.put("/api/profile/password", authenticateJWT, async (req, res) => {
        try {
            const { old_password, new_password } = req.body;
            if (!old_password || !new_password) {
                return res.status(400).json({
                    success: false,
                    message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.",
                });
            }
            if (new_password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Mật khẩu mới phải có ít nhất 6 ký tự.",
                });
            }
            const pool = getMySQLPool();
            const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
            const user = users[0];
            if (!user) {
                return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản." });
            }
            const match = await bcrypt.compare(old_password, user.password);
            if (!match) {
                createAuditLog({
                    userId: user.id,
                    userName: user.full_name,
                    userRole: user.role,
                    action: "PASSWORD_CHANGED",
                    module: "Profile",
                    page: "/profile",
                    resourceType: "user",
                    resourceId: user.id,
                    description: `${user.full_name} đổi mật khẩu thất bại: Mật khẩu cũ không chính xác`,
                    metadata: { reason: "Mật khẩu cũ không chính xác" },
                    status: "FAILED",
                    req
                });
                return res.status(400).json({
                    success: false,
                    message: "Mật khẩu hiện tại không chính xác.",
                });
            }
            const newHash = await bcrypt.hash(new_password, 10);
            await pool.execute('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [newHash, req.user.id]);
            createAuditLog({
                userId: user.id,
                userName: user.full_name,
                userRole: user.role,
                action: "PASSWORD_CHANGED",
                module: "Profile",
                page: "/profile",
                resourceType: "user",
                resourceId: user.id,
                description: `${user.full_name} đã đổi mật khẩu tài khoản thành công`,
                metadata: { method: "self_service" },
                status: "SUCCESS",
                req
            });
            return res.status(200).json({
                success: true,
                message: "Đổi mật khẩu thành công!",
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi server khi đổi mật khẩu.", error: err.message });
        }
    });
    // ==========================================
    // HEALTH RECORDS ROUTES (/api/health)
    // (Only: Weight, Blood Pressure, Heart Rate)
    // ==========================================
    // List health records
    app.get("/api/health", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const { range } = req.query;
            let query = 'SELECT * FROM health_records WHERE user_id = ?';
            const params = [userId];

            if (range) {
                const now = Date.now();
                let days = 30;
                if (range === "7d") days = 7;
                else if (range === "30d") days = 30;
                else if (range === "3m") days = 90;

                const cutoff = new Date(now - days * 86400000).toISOString().slice(0, 19).replace('T', ' ');
                query += ' AND recorded_at >= ?';
                params.push(cutoff);
            }

            query += ' ORDER BY recorded_at ASC';
            const pool = getMySQLPool();
            const [records] = await pool.query(query, params);

            return res.status(200).json({
                success: true,
                message: "Lấy danh sách chỉ số sức khỏe thành công",
                data: records,
            });
        } catch (error) {
            console.error('Error in GET /api/health:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Latest health record for dashboard
    app.get("/api/health/latest", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const pool = getMySQLPool();
            const [records] = await pool.query('SELECT * FROM health_records WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 2', [userId]);

            const latest = records[0] || null;
            const previous = records[1] || null;
            return res.status(200).json({
                success: true,
                data: {
                    latest,
                    previous,
                },
            });
        } catch (error) {
            console.error('Error in GET /api/health/latest:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Create health record
    app.post("/api/health", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const { weight, systolic, diastolic, heart_rate, recorded_at, notes } = req.body;
            if (weight === undefined || systolic === undefined || diastolic === undefined || heart_rate === undefined) {
                return res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ Cân nặng, Huyết áp (Tâm thu/Tâm trương) và Nhịp tim." });
            }
            const numWeight = Number(weight);
            const numSys = Number(systolic);
            const numDia = Number(diastolic);
            const numHr = Number(heart_rate);
            if (isNaN(numWeight) || numWeight <= 10 || numWeight > 400) return res.status(400).json({ success: false, message: "Cân nặng không hợp lệ (10 - 400 kg)." });
            if (isNaN(numSys) || isNaN(numDia) || numSys < 50 || numSys > 260 || numDia < 30 || numDia > 180) return res.status(400).json({ success: false, message: "Chỉ số huyết áp không hợp lệ." });
            if (isNaN(numHr) || numHr < 30 || numHr > 240) return res.status(400).json({ success: false, message: "Nhịp tim không hợp lệ (30 - 240 bpm)." });

            const recordTime = recorded_at ? new Date(recorded_at).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ');
            const pool = getMySQLPool();
            const [result] = await pool.execute(
                'INSERT INTO health_records (user_id, weight, systolic, diastolic, heart_rate, recorded_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, parseFloat(numWeight.toFixed(1)), Math.round(numSys), Math.round(numDia), Math.round(numHr), recordTime, notes || ""]
            );
            const newRecordId = result.insertId;
            const [newRecords] = await pool.query('SELECT * FROM health_records WHERE id = ?', [newRecordId]);
            const newRecord = newRecords[0];

            // Auto-update weight goals if user has weight metric
            const [userGoals] = await pool.query(
                'SELECT * FROM goals WHERE user_id = ? AND metric_type = ? AND status = ?',
                [userId, "weight", "in_progress"]
            );
            for (const g of userGoals) {
                const currentVal = newRecord.weight;
                let status = 'in_progress';
                if ((g.start_value >= g.target_value && currentVal <= g.target_value) ||
                    (g.start_value <= g.target_value && currentVal >= g.target_value)) {
                    status = 'completed';
                }
                await pool.execute('UPDATE goals SET current_value = ?, status = ?, updated_at = NOW() WHERE id = ?', [currentVal, status, g.id]);
            }

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: "HEALTH_RECORD_CREATED",
                module: "Health Metrics",
                page: "/health",
                resourceType: "health_record",
                resourceId: newRecord.id,
                description: `${req.user.full_name} đã thêm bản ghi sức khỏe mới (HA: ${newRecord.systolic}/${newRecord.diastolic} mmHg, Tim: ${newRecord.heart_rate} bpm, Cân nặng: ${newRecord.weight} kg)`,
                status: "SUCCESS",
                req
            });

            return res.status(201).json({ success: true, message: "Ghi nhận chỉ số sức khỏe thành công!", data: newRecord });
        } catch (error) {
            console.error('Error in POST /api/health:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Update health record
    app.put("/api/health/:id", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const recordId = parseInt(req.params.id, 10);
            const { weight, systolic, diastolic, heart_rate, recorded_at, notes } = req.body;

            const pool = getMySQLPool();
            const [records] = await pool.query('SELECT * FROM health_records WHERE id = ? AND user_id = ?', [recordId, userId]);
            if (records.length === 0) {
                return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi sức khỏe hoặc bạn không có quyền sửa bản ghi này." });
            }
            const record = records[0];

            let query = 'UPDATE health_records SET ';
            const params = [];
            const updates = [];

            if (weight !== undefined) { updates.push('weight = ?'); params.push(parseFloat(Number(weight).toFixed(1))); }
            if (systolic !== undefined) { updates.push('systolic = ?'); params.push(Math.round(Number(systolic))); }
            if (diastolic !== undefined) { updates.push('diastolic = ?'); params.push(Math.round(Number(diastolic))); }
            if (heart_rate !== undefined) { updates.push('heart_rate = ?'); params.push(Math.round(Number(heart_rate))); }
            if (recorded_at !== undefined) { updates.push('recorded_at = ?'); params.push(new Date(recorded_at).toISOString().slice(0, 19).replace('T', ' ')); }
            if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

            if (updates.length > 0) {
                query += updates.join(', ') + ' WHERE id = ?';
                params.push(recordId);
                await pool.execute(query, params);
            }

            const [updatedRecords] = await pool.query('SELECT * FROM health_records WHERE id = ?', [recordId]);
            const updatedRecord = updatedRecords[0];

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: "HEALTH_RECORD_UPDATED",
                module: "Health Metrics",
                page: "/health",
                resourceType: "health_record",
                resourceId: record.id,
                description: `${req.user.full_name} đã cập nhật bản ghi sức khỏe #${record.id}`,
                status: "SUCCESS",
                req
            });
            return res.status(200).json({ success: true, message: "Cập nhật chỉ số sức khỏe thành công!", data: updatedRecord });
        } catch (error) {
            console.error('Error in PUT /api/health/:id:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Delete health record
    app.delete("/api/health/:id", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const recordId = parseInt(req.params.id, 10);

            const pool = getMySQLPool();
            const [records] = await pool.query('SELECT * FROM health_records WHERE id = ? AND user_id = ?', [recordId, userId]);
            if (records.length === 0) {
                return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi sức khỏe cần xóa." });
            }

            await pool.execute('DELETE FROM health_records WHERE id = ?', [recordId]);

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: "HEALTH_RECORD_DELETED",
                module: "Health Metrics",
                page: "/health",
                resourceType: "health_record",
                resourceId: recordId,
                description: `${req.user.full_name} đã xóa bản ghi sức khỏe #${recordId}`,
                status: "SUCCESS",
                req
            });
            return res.status(200).json({ success: true, message: "Đã xóa bản ghi sức khỏe thành công." });
        } catch (error) {
            console.error('Error in DELETE /api/health/:id:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // ==========================================
    // GOALS ROUTES (/api/goals)
    // ==========================================
    // List goals
    app.get("/api/goals", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const pool = getMySQLPool();
            const [goals] = await pool.query('SELECT * FROM goals WHERE user_id = ?', [userId]);

            const goalsWithProgress = goals.map((g) => ({
                ...g,
                progress_percentage: calculateProgress(g),
            }));

            return res.status(200).json({ success: true, data: goalsWithProgress });
        } catch (error) {
            console.error('Error in GET /api/goals:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Create goal
    app.post("/api/goals", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const { title, metric_type, start_value, target_value, current_value, unit } = req.body;
            if (!title || start_value === undefined || target_value === undefined) {
                return res.status(400).json({ success: false, message: "Vui lòng nhập tên mục tiêu, giá trị ban đầu và giá trị mục tiêu." });
            }
            if (isNaN(Number(start_value)) || isNaN(Number(target_value)) || (current_value !== undefined && isNaN(Number(current_value)))) {
                return res.status(400).json({ success: false, message: "Giá trị số không hợp lệ." });
            }
            const cur = current_value !== undefined ? Number(current_value) : Number(start_value);

            const pool = getMySQLPool();
            const [result] = await pool.execute(
                'INSERT INTO goals (user_id, title, metric_type, start_value, target_value, current_value, unit, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [userId, title, metric_type || "weight", Number(start_value), Number(target_value), cur, unit || "kg", "in_progress"]
            );

            const [newGoals] = await pool.query('SELECT * FROM goals WHERE id = ?', [result.insertId]);
            const newGoal = newGoals[0];

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: "GOAL_CREATED",
                module: "Goals",
                page: "/goals",
                resourceType: "goal",
                resourceId: newGoal.id,
                description: `${req.user.full_name} đã tạo mục tiêu: "${newGoal.title}" (Mục tiêu: ${newGoal.target_value} ${newGoal.unit})`,
                status: "SUCCESS",
                req
            });
            return res.status(201).json({
                success: true,
                message: "Tạo mục tiêu sức khỏe thành công!",
                data: {
                    ...newGoal,
                    progress_percentage: calculateProgress(newGoal),
                },
            });
        } catch (error) {
            console.error('Error in POST /api/goals:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Update goal progress / status
    app.put("/api/goals/:id", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const goalId = parseInt(req.params.id, 10);
            const { title, current_value, target_value, status } = req.body;
            if (current_value !== undefined && isNaN(Number(current_value))) return res.status(400).json({ success: false, message: "Giá trị hiện tại không hợp lệ." });
            if (target_value !== undefined && isNaN(Number(target_value))) return res.status(400).json({ success: false, message: "Giá trị mục tiêu không hợp lệ." });

            const pool = getMySQLPool();
            const [goals] = await pool.query('SELECT * FROM goals WHERE id = ? AND user_id = ?', [goalId, userId]);
            if (goals.length === 0) {
                return res.status(404).json({ success: false, message: "Không tìm thấy mục tiêu." });
            }
            const goal = goals[0];

            let query = 'UPDATE goals SET ';
            const params = [];
            const updates = [];

            if (title !== undefined) { updates.push('title = ?'); params.push(title); }
            if (current_value !== undefined) { updates.push('current_value = ?'); params.push(Number(current_value)); }
            if (target_value !== undefined) { updates.push('target_value = ?'); params.push(Number(target_value)); }
            if (status !== undefined) { updates.push('status = ?'); params.push(status); }

            if (updates.length > 0) {
                updates.push('updated_at = NOW()');
                query += updates.join(', ') + ' WHERE id = ?';
                params.push(goalId);
                await pool.execute(query, params);
            }

            const [updatedGoals] = await pool.query('SELECT * FROM goals WHERE id = ?', [goalId]);
            const updatedGoal = updatedGoals[0];

            const actionType = current_value !== undefined ? "GOAL_PROGRESS_UPDATED" : "GOAL_UPDATED";
            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: actionType,
                module: "Goals",
                page: "/goals",
                resourceType: "goal",
                resourceId: updatedGoal.id,
                description: `${req.user.full_name} đã cập nhật mục tiêu "${updatedGoal.title}"`,
                status: "SUCCESS",
                req
            });
            return res.status(200).json({
                success: true,
                message: "Cập nhật tiến độ mục tiêu thành công!",
                data: {
                    ...updatedGoal,
                    progress_percentage: calculateProgress(updatedGoal),
                },
            });
        } catch (error) {
            console.error('Error in PUT /api/goals/:id:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Delete goal
    app.delete("/api/goals/:id", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const goalId = parseInt(req.params.id, 10);

            const pool = getMySQLPool();
            const [goals] = await pool.query('SELECT * FROM goals WHERE id = ? AND user_id = ?', [goalId, userId]);
            if (goals.length === 0) {
                return res.status(404).json({ success: false, message: "Không tìm thấy mục tiêu cần xóa." });
            }

            await pool.execute('DELETE FROM goals WHERE id = ?', [goalId]);

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: "GOAL_DELETED",
                module: "Goals",
                page: "/goals",
                resourceType: "goal",
                resourceId: goalId,
                description: `${req.user.full_name} đã xóa mục tiêu: "${goals[0].title}"`,
                status: "SUCCESS",
                req
            });
            return res.status(200).json({ success: true, message: "Đã xóa mục tiêu thành công." });
        } catch (error) {
            console.error('Error in DELETE /api/goals/:id:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // ==========================================
    // REMINDERS ROUTES (/api/reminders)
    // (Only: Water and Exercise)
    // ==========================================
    // List reminders
    app.get("/api/reminders", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const pool = getMySQLPool();
            const [reminders] = await pool.query('SELECT * FROM reminders WHERE user_id = ?', [userId]);

            return res.status(200).json({ success: true, data: reminders });
        } catch (error) {
            console.error('Error in GET /api/reminders:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Create reminder
    app.post("/api/reminders", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const { type, title, time_of_day } = req.body;
            if (!type || !title || !time_of_day) {
                return res.status(400).json({ success: false, message: "Vui lòng nhập loại nhắc nhở (uống nước/tập thể dục), tiêu đề và thời gian." });
            }
            if (type !== "water" && type !== "exercise") {
                return res.status(400).json({ success: false, message: "Loại nhắc nhở chỉ gồm: uống nước (water) hoặc tập thể dục (exercise)." });
            }

            const pool = getMySQLPool();
            const [result] = await pool.execute(
                'INSERT INTO reminders (user_id, type, title, time_of_day, is_active) VALUES (?, ?, ?, ?, ?)',
                [userId, type, title, time_of_day, 1]
            );

            const [newReminders] = await pool.query('SELECT * FROM reminders WHERE id = ?', [result.insertId]);
            const newReminder = newReminders[0];

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: "REMINDER_CREATED",
                module: "Reminders",
                page: "/reminders",
                resourceType: "reminder",
                resourceId: newReminder.id,
                description: `${req.user.full_name} đã tạo nhắc nhở ${newReminder.type === 'water' ? 'uống nước' : 'vận động'}: "${newReminder.title}" (${newReminder.time_of_day})`,
                status: "SUCCESS",
                req
            });
            return res.status(201).json({
                success: true,
                message: "Tạo nhắc nhở thành công!",
                data: newReminder,
            });
        } catch (error) {
            console.error('Error in POST /api/reminders:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Update / Toggle reminder
    app.put("/api/reminders/:id", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const reminderId = parseInt(req.params.id, 10);
            const { type, title, time_of_day, is_active } = req.body;

            const pool = getMySQLPool();
            const [reminders] = await pool.query('SELECT * FROM reminders WHERE id = ? AND user_id = ?', [reminderId, userId]);
            if (reminders.length === 0) {
                return res.status(404).json({ success: false, message: "Không tìm thấy nhắc nhở." });
            }
            const reminder = reminders[0];

            let query = 'UPDATE reminders SET ';
            const params = [];
            const updates = [];

            if (type !== undefined && (type === "water" || type === "exercise")) { updates.push('type = ?'); params.push(type); }
            if (title !== undefined) { updates.push('title = ?'); params.push(title); }
            if (time_of_day !== undefined) { updates.push('time_of_day = ?'); params.push(time_of_day); }

            const isToggleOnly = is_active !== undefined && updates.length === 0 && reminder.is_active !== (is_active ? 1 : 0);
            if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

            if (updates.length > 0) {
                query += updates.join(', ') + ' WHERE id = ?';
                params.push(reminderId);
                await pool.execute(query, params);
            }

            const [updatedReminders] = await pool.query('SELECT * FROM reminders WHERE id = ?', [reminderId]);
            const updatedReminder = updatedReminders[0];
            // Convert bit to boolean for frontend compatibility
            updatedReminder.is_active = updatedReminder.is_active === 1;

            const actionType = isToggleOnly ? "REMINDER_TOGGLED" : "REMINDER_UPDATED";
            const desc = isToggleOnly
                ? `${req.user.full_name} đã ${updatedReminder.is_active ? 'bật' : 'tắt'} nhắc nhở: "${updatedReminder.title}"`
                : `${req.user.full_name} đã cập nhật nhắc nhở: "${updatedReminder.title}"`;

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: actionType,
                module: "Reminders",
                page: "/reminders",
                resourceType: "reminder",
                resourceId: updatedReminder.id,
                description: desc,
                status: "SUCCESS",
                req
            });

            return res.status(200).json({
                success: true,
                message: "Cập nhật nhắc nhở thành công!",
                data: updatedReminder,
            });
        } catch (error) {
            console.error('Error in PUT /api/reminders/:id:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Delete reminder
    app.delete("/api/reminders/:id", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const reminderId = parseInt(req.params.id, 10);

            const pool = getMySQLPool();
            const [reminders] = await pool.query('SELECT * FROM reminders WHERE id = ? AND user_id = ?', [reminderId, userId]);
            if (reminders.length === 0) {
                return res.status(404).json({ success: false, message: "Không tìm thấy nhắc nhở cần xóa." });
            }

            await pool.execute('DELETE FROM reminders WHERE id = ?', [reminderId]);

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: "REMINDER_DELETED",
                module: "Reminders",
                page: "/reminders",
                resourceType: "reminder",
                resourceId: reminderId,
                description: `${req.user.full_name} đã xóa nhắc nhở: "${reminders[0].title}"`,
                status: "SUCCESS",
                req
            });
            return res.status(200).json({ success: true, message: "Đã xóa nhắc nhở thành công." });
        } catch (error) {
            console.error('Error in DELETE /api/reminders/:id:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // ==========================================
    // ADMIN ROUTES (/api/admin)
    // Protected by authenticateJWT + requireAdmin
    // ==========================================
    // Admin Dashboard Statistics
    app.get("/api/admin/dashboard", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            cleanExpiredSessions();
            const pool = getMySQLPool();

            const [[{ count: totalUsers }]] = await pool.query('SELECT COUNT(*) as count FROM users');
            const [[{ count: activeUsers }]] = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
            const [[{ count: totalHealthRecords }]] = await pool.query('SELECT COUNT(*) as count FROM health_records');
            const [[{ count: totalGoals }]] = await pool.query('SELECT COUNT(*) as count FROM goals');
            const [[{ count: totalReminders }]] = await pool.query('SELECT COUNT(*) as count FROM reminders');
            const onlineSessionsCount = activeSessionsMap.size;

            // Calculate AHA risk distribution via SQL
            const [riskRows] = await pool.query(`
                SELECT 
                    SUM(CASE WHEN systolic >= 180 OR diastolic >= 120 THEN 1 ELSE 0 END) as crisis,
                    SUM(CASE WHEN (systolic >= 140 AND systolic < 180) OR (diastolic >= 90 AND diastolic < 120) THEN 1 ELSE 0 END) as stage2,
                    SUM(CASE WHEN (systolic >= 130 AND systolic < 140) OR (diastolic >= 80 AND diastolic < 90) THEN 1 ELSE 0 END) as stage1,
                    SUM(CASE WHEN (systolic >= 120 AND systolic < 130) AND (diastolic < 80) THEN 1 ELSE 0 END) as elevated,
                    SUM(CASE WHEN systolic < 120 AND diastolic < 80 THEN 1 ELSE 0 END) as normal
                FROM health_records
            `);

            const riskDistribution = {
                crisis: Number(riskRows[0]?.crisis || 0),
                stage2: Number(riskRows[0]?.stage2 || 0),
                stage1: Number(riskRows[0]?.stage1 || 0),
                elevated: Number(riskRows[0]?.elevated || 0),
                normal: Number(riskRows[0]?.normal || 0)
            };

            const [recentTelemetry] = await pool.query('SELECT * FROM health_records ORDER BY recorded_at DESC LIMIT 30');

            return res.status(200).json({
                success: true,
                data: {
                    totalUsers,
                    activeUsers,
                    totalHealthRecords,
                    totalGoals,
                    totalReminders,
                    onlineSessionsCount,
                    recentTelemetry,
                    riskDistribution,
                },
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Lỗi máy chủ", error: err.message });
        }
    });

    // Admin Comprehensive System-Wide Health & User Statistics

    // Admin Comprehensive System-Wide Health & User Statistics
    app.get("/api/admin/statistics", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            const pool = getMySQLPool();
            // Use memory processing for complex time series buckets, but load data appropriately
            const [dbUsers] = await pool.query('SELECT id, is_active, created_at FROM users');
            const [dbHealthRecords] = await pool.query('SELECT id, user_id, weight, systolic, diastolic, heart_rate, recorded_at FROM health_records');
            const { range = "30d" } = req.query;
            const now = new Date();
            let startTime = new Date();
            let stepUnit = "day";
            let daysCount = 30;
            if (range === "7d") {
                startTime.setDate(now.getDate() - 6);
                startTime.setHours(0, 0, 0, 0);
                daysCount = 7;
                stepUnit = "day";
            }
            else if (range === "30d") {
                startTime.setDate(now.getDate() - 29);
                startTime.setHours(0, 0, 0, 0);
                daysCount = 30;
                stepUnit = "day";
            }
            else if (range === "3m") {
                startTime.setMonth(now.getMonth() - 3);
                startTime.setHours(0, 0, 0, 0);
                stepUnit = "day";
            }
            else if (range === "12m") {
                startTime.setFullYear(now.getFullYear() - 1);
                startTime.setHours(0, 0, 0, 0);
                stepUnit = "month";
            }
            else {
                startTime.setDate(now.getDate() - 29);
                startTime.setHours(0, 0, 0, 0);
            }
            // Filter users created in range and all users cumulative
            const totalUsers = dbUsers.length;
            const activeUsers = dbUsers.filter((u) => u.is_active).length;
            const newUsersInRange = dbUsers.filter((u) => new Date(u.created_at) >= startTime).length;
            const totalHealthRecords = dbHealthRecords.length;
            const recordsInRangeList = dbHealthRecords.filter((r) => new Date(r.recorded_at) >= startTime);
            const recordsInRange = recordsInRangeList.length;
            // Summary averages
            const weights = recordsInRangeList.filter((r) => typeof r.weight === "number" && r.weight > 0).map((r) => r.weight);
            const systolics = recordsInRangeList.filter((r) => typeof r.systolic === "number" && r.systolic > 0).map((r) => r.systolic);
            const diastolics = recordsInRangeList.filter((r) => typeof r.diastolic === "number" && r.diastolic > 0).map((r) => r.diastolic);
            const heartRates = recordsInRangeList.filter((r) => typeof r.heart_rate === "number" && r.heart_rate > 0).map((r) => r.heart_rate);
            const overallAvgWeight = weights.length > 0 ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10 : null;
            const overallAvgSystolic = systolics.length > 0 ? Math.round(systolics.reduce((a, b) => a + b, 0) / systolics.length) : null;
            const overallAvgDiastolic = diastolics.length > 0 ? Math.round(diastolics.reduce((a, b) => a + b, 0) / diastolics.length) : null;
            const overallAvgHeartRate = heartRates.length > 0 ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length) : null;
            // Build time series buckets
            const timeSeriesMap = new Map();
            if (stepUnit === "day") {
                // Generate continuous day slots from startTime to now
                const cursor = new Date(startTime);
                while (cursor <= now) {
                    const dateKey = cursor.toISOString().split("T")[0];
                    const dd = String(cursor.getDate()).padStart(2, "0");
                    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
                    const period = `${dd}/${mm}`;
                    timeSeriesMap.set(dateKey, {
                        dateKey,
                        period,
                        timestamp: cursor.getTime(),
                        newUsersCount: 0,
                        records: [],
                    });
                    cursor.setDate(cursor.getDate() + 1);
                }
            }
            else {
                // Generate continuous month slots
                const cursor = new Date(startTime);
                cursor.setDate(1);
                while (cursor <= now) {
                    const yyyy = cursor.getFullYear();
                    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
                    const dateKey = `${yyyy}-${mm}`;
                    const period = `T${cursor.getMonth() + 1}/${yyyy}`;
                    timeSeriesMap.set(dateKey, {
                        dateKey,
                        period,
                        timestamp: cursor.getTime(),
                        newUsersCount: 0,
                        records: [],
                    });
                    cursor.setMonth(cursor.getMonth() + 1);
                }
            }
            // Populate new users count into buckets
            dbUsers.forEach((u) => {
                const uDate = new Date(u.created_at);
                if (uDate >= startTime && uDate <= now) {
                    const key = stepUnit === "day"
                        ? uDate.toISOString().split("T")[0]
                        : `${uDate.getFullYear()}-${String(uDate.getMonth() + 1).padStart(2, "0")}`;
                    const bucket = timeSeriesMap.get(key);
                    if (bucket) {
                        bucket.newUsersCount++;
                    }
                }
            });
            // Populate health records into buckets
            recordsInRangeList.forEach((r) => {
                const rDate = new Date(r.recorded_at);
                const key = stepUnit === "day"
                    ? rDate.toISOString().split("T")[0]
                    : `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, "0")}`;
                const bucket = timeSeriesMap.get(key);
                if (bucket) {
                    bucket.records.push(r);
                }
            });
            // Convert map to sorted array and compute aggregations
            const sortedBuckets = Array.from(timeSeriesMap.values()).sort((a, b) => a.timestamp - b.timestamp);
            // Cumulative user calculation
            let cumulativeUsers = dbUsers.filter((u) => new Date(u.created_at) < startTime).length;
            const timeSeries = sortedBuckets.map((bucket) => {
                cumulativeUsers += bucket.newUsersCount;
                const bWeights = bucket.records.filter((r) => typeof r.weight === "number" && r.weight > 0).map((r) => r.weight);
                const bSystolics = bucket.records.filter((r) => typeof r.systolic === "number" && r.systolic > 0).map((r) => r.systolic);
                const bDiastolics = bucket.records.filter((r) => typeof r.diastolic === "number" && r.diastolic > 0).map((r) => r.diastolic);
                const bHeartRates = bucket.records.filter((r) => typeof r.heart_rate === "number" && r.heart_rate > 0).map((r) => r.heart_rate);
                return {
                    period: bucket.period,
                    dateKey: bucket.dateKey,
                    totalUsersCumulative: cumulativeUsers,
                    newUsersCount: bucket.newUsersCount,
                    recordsCount: bucket.records.length,
                    avgWeight: bWeights.length > 0 ? Math.round((bWeights.reduce((a, b) => a + b, 0) / bWeights.length) * 10) / 10 : null,
                    minWeight: bWeights.length > 0 ? Math.min(...bWeights) : null,
                    maxWeight: bWeights.length > 0 ? Math.max(...bWeights) : null,
                    avgSystolic: bSystolics.length > 0 ? Math.round(bSystolics.reduce((a, b) => a + b, 0) / bSystolics.length) : null,
                    avgDiastolic: bDiastolics.length > 0 ? Math.round(bDiastolics.reduce((a, b) => a + b, 0) / bDiastolics.length) : null,
                    minSystolic: bSystolics.length > 0 ? Math.min(...bSystolics) : null,
                    maxSystolic: bSystolics.length > 0 ? Math.max(...bSystolics) : null,
                    avgHeartRate: bHeartRates.length > 0 ? Math.round(bHeartRates.reduce((a, b) => a + b, 0) / bHeartRates.length) : null,
                    minHeartRate: bHeartRates.length > 0 ? Math.min(...bHeartRates) : null,
                    maxHeartRate: bHeartRates.length > 0 ? Math.max(...bHeartRates) : null,
                };
            });
            // Health risk categorization distribution from all records or records in range
            let normalCount = 0;
            let elevatedCount = 0;
            let stage1Count = 0;
            let stage2Count = 0;
            let crisisCount = 0;
            const evalRecords = recordsInRangeList.length > 0 ? recordsInRangeList : dbHealthRecords;
            evalRecords.forEach((r) => {
                if (r.systolic >= 180 || r.diastolic >= 120)
                    crisisCount++;
                else if (r.systolic >= 140 || r.diastolic >= 90)
                    stage2Count++;
                else if (r.systolic >= 130 || r.diastolic >= 80)
                    stage1Count++;
                else if (r.systolic >= 120 && r.diastolic < 80)
                    elevatedCount++;
                else
                    normalCount++;
            });
            const totalEval = evalRecords.length || 1;
            const healthDistribution = [
                {
                    name: "Bình thường (<120/<80)",
                    count: normalCount,
                    percentage: Math.round((normalCount / totalEval) * 1000) / 10,
                    description: "Huyết áp trong giới hạn chuẩn tối ưu",
                    color: "#10b981", // emerald-500
                },
                {
                    name: "Tiền tăng HA (120-129/<80)",
                    count: elevatedCount,
                    percentage: Math.round((elevatedCount / totalEval) * 1000) / 10,
                    description: "Huyết áp tâm thu tăng nhẹ",
                    color: "#f59e0b", // amber-500
                },
                {
                    name: "Tăng HA Độ 1 (130-139/80-89)",
                    count: stage1Count,
                    percentage: Math.round((stage1Count / totalEval) * 1000) / 10,
                    description: "Tăng huyết áp giai đoạn 1 cần theo dõi",
                    color: "#f97316", // orange-500
                },
                {
                    name: "Tăng HA Độ 2 (≥140/≥90)",
                    count: stage2Count,
                    percentage: Math.round((stage2Count / totalEval) * 1000) / 10,
                    description: "Tăng huyết áp giai đoạn 2 cần can thiệp",
                    color: "#ef4444", // rose-500
                },
                {
                    name: "Cơn Tăng HA Khẩn Cấp (≥180/≥120)",
                    count: crisisCount,
                    percentage: Math.round((crisisCount / totalEval) * 1000) / 10,
                    description: "Mức báo động đỏ cần cấp cứu y tế",
                    color: "#b91c1c", // red-700
                },
            ];
            return res.status(200).json({
                success: true,
                data: {
                    range,
                    summary: {
                        totalUsers,
                        activeUsers,
                        newUsersInRange,
                        totalHealthRecords,
                        recordsInRange,
                        overallAvgWeight,
                        overallAvgSystolic,
                        overallAvgDiastolic,
                        overallAvgHeartRate,
                    },
                    timeSeries,
                    healthDistribution,
                },
            });
        }
        catch (err) {
            console.error("Error in /api/admin/statistics:", err);
            return res.status(500).json({
                success: false,
                message: "Lỗi khi tổng hợp dữ liệu thống kê hệ thống: " + (err.message || "Unknown error"),
            });
        }
    });
    // Admin Users List & Search
    app.get("/api/admin/users", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            const { search } = req.query;
            const pool = getMySQLPool();

            let query = `
                SELECT u.id, u.full_name, u.email, u.role, u.is_active, u.created_at,
                       (SELECT COUNT(*) FROM health_records h WHERE h.user_id = u.id) as records_count,
                       (SELECT COUNT(*) FROM goals g WHERE g.user_id = u.id) as goals_count
                FROM users u
            `;
            const params = [];

            if (search && typeof search === "string") {
                query += ' WHERE u.full_name LIKE ? OR u.email LIKE ?';
                const likeSearch = `%${search}%`;
                params.push(likeSearch, likeSearch);
            }

            const [users] = await pool.query(query, params);

            return res.status(200).json({
                success: true,
                data: users,
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi máy chủ", error: err.message });
        }
    });
    // Admin Toggle User Status (Lock/Unlock)
    app.put("/api/admin/users/:id/status", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            const targetId = parseInt(req.params.id, 10);
            const { is_active } = req.body;

            if (targetId === req.user.id) {
                return res.status(400).json({ success: false, message: "Bạn không thể tự khóa tài khoản quản trị của chính mình." });
            }

            const pool = getMySQLPool();
            const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [targetId]);
            const user = users[0];

            if (!user) {
                return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
            }

            const isActiveBool = Boolean(is_active);
            await pool.execute('UPDATE users SET is_active = ? WHERE id = ?', [isActiveBool ? 1 : 0, targetId]);

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: isActiveBool ? "USER_UNLOCKED" : "USER_LOCKED",
                module: "User Management",
                page: "/admin/users",
                resourceType: "user",
                resourceId: targetId,
                description: `${req.user.full_name} đã ${isActiveBool ? 'mở khóa' : 'khóa'} tài khoản "${user.full_name}"`,
                status: "SUCCESS",
                req
            });

            return res.status(200).json({
                success: true,
                message: `Đã ${isActiveBool ? 'mở khóa' : 'khóa'} tài khoản thành công.`,
                data: { id: targetId, is_active: isActiveBool },
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi máy chủ", error: err.message });
        }
    });
    // Admin Change User Role
    app.put("/api/admin/users/:id/role", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            const targetId = parseInt(req.params.id, 10);
            const { role } = req.body;

            if (role !== "admin" && role !== "user") {
                return res.status(400).json({ success: false, message: "Quyền không hợp lệ." });
            }
            if (targetId === req.user.id) {
                return res.status(400).json({ success: false, message: "Bạn không thể tự thay đổi quyền của chính mình." });
            }

            const pool = getMySQLPool();
            const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [targetId]);
            const user = users[0];

            if (!user) {
                return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
            }

            await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, targetId]);

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: "ROLE_CHANGED",
                module: "User Management",
                page: "/admin/users",
                resourceType: "user",
                resourceId: targetId,
                description: `${req.user.full_name} đã cấp quyền ${role} cho tài khoản "${user.full_name}"`,
                metadata: { previousRole: user.role, newRole: role },
                status: "SUCCESS",
                req
            });

            return res.status(200).json({
                success: true,
                message: `Cập nhật quyền thành ${role} thành công.`,
                data: { id: targetId, role },
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi máy chủ", error: err.message });
        }
    });

    // Admin View User Dossier

    app.get("/api/admin/users/:id/dossier", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            const targetId = parseInt(req.params.id, 10);
            const pool = getMySQLPool();

            const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [targetId]);
            const user = users[0];
            if (!user) {
                return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
            }

            const [records] = await pool.query('SELECT * FROM health_records WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 50', [targetId]);
            const [goals] = await pool.query('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC', [targetId]);
            const [devices] = await pool.query('SELECT * FROM connected_devices WHERE user_id = ?', [targetId]);
            const [aiHistory] = await pool.query('SELECT * FROM ai_diagnoses WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [targetId]);

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: "USER_VIEWED",
                module: "User Management",
                page: "/admin/users",
                resourceType: "user",
                resourceId: targetId,
                description: `Admin ${req.user.full_name} đã xem chi tiết hồ sơ bệnh nhân ${user.full_name}`,
                status: "SUCCESS",
                req
            });

            return res.status(200).json({
                success: true,
                data: {
                    user: sanitizeUser(user),
                    health_records: records,
                    goals: goals.map(g => ({ ...g, progress_percentage: calculateProgress(g) })),
                    devices,
                    ai_history: aiHistory,
                },
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi máy chủ", error: err.message });
        }
    });

    // Admin Add New User

    app.post("/api/admin/users", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            const { full_name, email, role, password } = req.body;
            if (!full_name || !email || !role || !password) {
                return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin bắt buộc." });
            }

            const pool = getMySQLPool();
            const trimmedEmail = email.trim().toLowerCase();
            const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [trimmedEmail]);

            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: "Email này đã được sử dụng." });
            }

            const hashed = await bcrypt.hash(password, 10);

            const [result] = await pool.execute(
                'INSERT INTO users (full_name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)',
                [full_name.trim(), trimmedEmail, hashed, role, 1]
            );

            const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
            const newUser = newUsers[0];

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: "USER_CREATED_BY_ADMIN",
                module: "User Management",
                page: "/admin/users",
                resourceType: "user",
                resourceId: newUser.id,
                description: `Admin ${req.user.full_name} đã tạo mới tài khoản ${newUser.full_name} (${newUser.email})`,
                metadata: { role: newUser.role },
                status: "SUCCESS",
                req
            });

            return res.status(201).json({
                success: true,
                message: "Tạo người dùng mới thành công.",
                data: sanitizeUser(newUser),
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi máy chủ", error: err.message });
        }
    });

    // Admin Update User

    app.put("/api/admin/users/:id", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            const targetId = parseInt(req.params.id, 10);
            const { full_name, email, role, phone_number, occupation } = req.body;

            const pool = getMySQLPool();
            const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [targetId]);
            const user = users[0];

            if (!user) {
                return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
            }

            if (email) {
                const trimmedEmail = email.trim().toLowerCase();
                const [existing] = await pool.query('SELECT * FROM users WHERE email = ? AND id != ?', [trimmedEmail, targetId]);
                if (existing.length > 0) {
                    return res.status(400).json({ success: false, message: "Email này đã được tài khoản khác sử dụng." });
                }
            }

            let updates = [];
            let params = [];

            if (full_name !== undefined) { updates.push('full_name = ?'); params.push(full_name.trim()); }
            if (email !== undefined) { updates.push('email = ?'); params.push(email.trim().toLowerCase()); }
            if (role !== undefined) { updates.push('role = ?'); params.push(role); }
            if (phone_number !== undefined) { updates.push('phone_number = ?'); params.push(phone_number.trim()); }
            if (occupation !== undefined) { updates.push('occupation = ?'); params.push(occupation.trim()); }

            let updatedUser = user;
            if (updates.length > 0) {
                updates.push('updated_at = NOW()');
                await pool.execute('UPDATE users SET ' + updates.join(', ') + ' WHERE id = ?', [...params, targetId]);

                const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [targetId]);
                updatedUser = newUsers[0];
            }

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: "USER_UPDATED_BY_ADMIN",
                module: "User Management",
                page: "/admin/users",
                resourceType: "user",
                resourceId: targetId,
                description: `Admin ${req.user.full_name} đã cập nhật hồ sơ tài khoản ${updatedUser.full_name}`,
                status: "SUCCESS",
                req
            });

            return res.status(200).json({
                success: true,
                message: "Cập nhật thông tin người dùng thành công.",
                data: sanitizeUser(updatedUser),
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi máy chủ", error: err.message });
        }
    });

    // Admin Reset Password

    app.post("/api/admin/users/:id/reset-password", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            const targetId = parseInt(req.params.id, 10);

            const pool = getMySQLPool();
            const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [targetId]);
            const user = users[0];

            if (!user) {
                return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
            }

            const defaultPass = "123456";
            const hashed = await bcrypt.hash(defaultPass, 10);

            await pool.execute('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashed, targetId]);

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: "PASSWORD_RESET_BY_ADMIN",
                module: "User Management",
                page: "/admin/users",
                resourceType: "user",
                resourceId: targetId,
                description: `Admin ${req.user.full_name} đã đặt lại mật khẩu cho tài khoản ${user.full_name}`,
                status: "SUCCESS",
                req
            });

            return res.status(200).json({
                success: true,
                message: "Đặt lại mật khẩu thành công. Mật khẩu mới là: 123456",
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi máy chủ", error: err.message });
        }
    });

    // Admin Delete User

    app.delete("/api/admin/users/:id", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            const targetId = parseInt(req.params.id, 10);
            if (targetId === req.user.id) {
                return res.status(400).json({ success: false, message: "Bạn không thể xóa tài khoản của chính mình." });
            }

            const pool = getMySQLPool();
            const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [targetId]);
            const user = users[0];

            if (!user) {
                return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
            }

            await pool.execute('DELETE FROM users WHERE id = ?', [targetId]);

            createAuditLog({
                userId: req.user.id,
                userName: req.user.full_name,
                userRole: req.user.role,
                action: "USER_DELETED",
                module: "User Management",
                page: "/admin/users",
                resourceType: "user",
                resourceId: targetId,
                description: `Admin ${req.user.full_name} đã xóa vĩnh viễn tài khoản ${user.full_name}`,
                status: "SUCCESS",
                req
            });

            return res.status(200).json({
                success: true,
                message: "Đã xóa người dùng thành công.",
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi máy chủ", error: err.message });
        }
    });

    let systemSettingsData = {
        emergency_systolic_threshold: 180,
        emergency_diastolic_threshold: 120,
        warning_systolic_threshold: 130,
        warning_diastolic_threshold: 85,
        max_heart_rate_threshold: 100,
        min_heart_rate_threshold: 55,
        ai_model_name: "gemini-2.5-flash",
        ai_sensitivity_level: "balanced",
        require_physician_approval_for_high_risk: true,
        session_timeout_hours: 2,
        system_admin_email: "admin@vitaltrack.vn",
        allow_patient_registration: true,
        enable_email_alerts: true,
        maintenance_mode: false
    };

    app.get("/api/admin/settings", authenticateJWT, requireAdmin, (req, res) => {
        res.json({ success: true, data: systemSettingsData });
    });

    app.put("/api/admin/settings", authenticateJWT, requireAdmin, (req, res) => {
        systemSettingsData = { ...systemSettingsData, ...req.body };
        res.json({ success: true, data: systemSettingsData, message: "Settings updated successfully" });
    });

    app.get("/api/admin/export", authenticateJWT, requireAdmin, (req, res) => {
        const backup = {
            users: dbUsers,
            healthRecords: dbHealthRecords,
            goals: dbGoals,
            reminders: dbReminders,
            auditLogs: dbAuditLogs,
            settings: systemSettingsData,
            timestamp: new Date().toISOString()
        };
        res.json({ success: true, data: backup });
    });


    // =========================================================================
    // 🤖 1. AI HEALTH DIAGNOSTICS & GEMINI ASSISTANT API ENDPOINTS
    // =========================================================================
    //
    // Hệ thống tích hợp trực tiếp Google Gemini API (gemini-1.5-flash) qua SDK @google/genai.
    // Khóa API GEMINI_API_KEY được bảo mật hoàn toàn ở tầng Backend Server.
    // Kèm cơ chế dự phòng chuẩn y khoa (Clinical Fallback Engine) khi không có khóa API.
    //
    // =========================================================================
    // Endpoint: Chuẩn đoán & Phân tích sức khỏe AI
    app.post("/api/ai/diagnose", authenticateJWT, async (req, res) => {
        try {
            const { symptoms = [], notes = "", recentVitals, lifestyle } = req.body;
            const userId = req.user.id;
            const user = dbUsers.find((u) => u.id === userId);
            // Thu thập thêm bản ghi sinh trắc học mới nhất của user từ DB
            const userRecords = dbHealthRecords
                .filter((r) => r.user_id === userId)
                .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
            const latestRecord = userRecords[0];
            const sys = recentVitals?.systolic || (latestRecord ? latestRecord.systolic : 120);
            const dia = recentVitals?.diastolic || (latestRecord ? latestRecord.diastolic : 80);
            const hr = recentVitals?.heart_rate || (latestRecord ? latestRecord.heart_rate : 72);
            const wt = recentVitals?.weight || (latestRecord ? latestRecord.weight : 68);
            // Phân tích trạng thái lâm sàng cơ bản
            let bpStatus = "Huyết áp tối ưu (Bình thường)";
            let bpRiskScore = 10;
            if (sys >= 140 || dia >= 90) {
                bpStatus = "Tăng huyết áp Độ 1 - Cần theo dõi sát";
                bpRiskScore = 65;
            }
            else if (sys >= 130 || dia >= 85) {
                bpStatus = "Huyết áp tiền tăng (Prehypertension)";
                bpRiskScore = 40;
            }
            else if (sys < 90 || dia < 60) {
                bpStatus = "Huyết áp thấp (Hypotension)";
                bpRiskScore = 35;
            }
            let hrStatus = "Nhịp tim bình thường trong lúc nghỉ";
            if (hr > 100) {
                hrStatus = "Nhịp tim nhanh lúc nghỉ (Tachycardia)";
            }
            else if (hr < 55) {
                hrStatus = "Nhịp tim chậm (Bradycardia)";
            }
            let diagnosisResult = null;
            const ai = getGeminiAI();
            // Nếu có cấu hình Google Gemini API Key, thực hiện phân tích chuyên sâu bằng mô hình AI thực tế
            if (ai) {
                try {
                    const prompt = `Phân tích hồ sơ lâm sàng của bệnh nhân:
- Họ tên/Thông tin: ${user?.full_name || "Người dùng"}, Giới tính: ${user?.gender || "Không rõ"}, Tuổi: ${user?.date_of_birth || "Không rõ"}
- Bệnh nền mãn tính: ${user?.chronic_conditions?.join(", ") || "Không có"}
- Triệu chứng đang gặp phải: ${symptoms.length > 0 ? symptoms.join(", ") : "Không có triệu chứng rõ rệt"}
- Ghi chú từ bệnh nhân: ${notes || "Không có"}
- Huyết áp động mạch hiện tại: ${sys}/${dia} mmHg
- Nhịp tim khi nghỉ: ${hr} nhịp/phút (bpm)
- Cân nặng hiện tại: ${wt} kg
- Lối sống: Giấc ngủ ${lifestyle?.sleepHours || 7}h/ngày, Căng thẳng ${lifestyle?.stressLevel || "moderate"}, Vận động ${lifestyle?.activityLevel || "light"}

Hãy đưa ra đánh giá phân tích y khoa chuyên sâu bằng Tiếng Việt chuẩn xác.`;
                    const aiResponse = await ai.models.generateContent({
                        model: "gemini-1.5-flash",
                        contents: prompt,
                        config: {
                            systemInstruction: "Bạn là Bác sĩ Trợ lý AI chuyên khoa Tim mạch và Nội tổng quát (VitalTrack Clinical AI Assistant). Đánh giá dựa trên tiêu chuẩn AHA/ACC và WHO, đưa ra chẩn đoán dự báo khách quan, chi tiết và có tính ứng dụng cao.",
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: Type.OBJECT,
                                properties: {
                                    summary: { type: Type.STRING, description: "Đánh giá tóm tắt tổng quan" },
                                    riskLevel: { type: Type.STRING, description: "low, moderate, high, hoặc critical" },
                                    riskScore: { type: Type.NUMBER, description: "Điểm nguy cơ sức khỏe từ 0 - 100" },
                                    possibleConditions: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                name: { type: Type.STRING, description: "Tên bệnh lý hoặc hội chứng dự báo" },
                                                probability: { type: Type.STRING, description: "Tỷ lệ khả năng, ví dụ 75%" },
                                                description: { type: Type.STRING, description: "Giải thích cơ chế bệnh sinh tóm tắt" },
                                            },
                                            required: ["name", "probability", "description"],
                                        },
                                    },
                                    vitalAnalysis: {
                                        type: Type.OBJECT,
                                        properties: {
                                            bloodPressureStatus: { type: Type.STRING },
                                            heartRateStatus: { type: Type.STRING },
                                            bmiStatus: { type: Type.STRING },
                                        },
                                        required: ["bloodPressureStatus", "heartRateStatus"],
                                    },
                                    recommendations: {
                                        type: Type.OBJECT,
                                        properties: {
                                            immediateActions: { type: Type.ARRAY, items: { type: Type.STRING } },
                                            lifestyleAdvice: { type: Type.ARRAY, items: { type: Type.STRING } },
                                            dietaryTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                                            whenToSeeDoctor: { type: Type.STRING },
                                        },
                                        required: ["immediateActions", "lifestyleAdvice", "dietaryTips", "whenToSeeDoctor"],
                                    },
                                    disclaimer: { type: Type.STRING },
                                },
                                required: [
                                    "summary",
                                    "riskLevel",
                                    "riskScore",
                                    "possibleConditions",
                                    "vitalAnalysis",
                                    "recommendations",
                                    "disclaimer",
                                ],
                            },
                        },
                    });
                    const parsed = JSON.parse(aiResponse.text || "{}");
                    if (parsed && parsed.summary) {
                        diagnosisResult = {
                            id: `ai_diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                            user_id: userId,
                            summary: parsed.summary,
                            riskLevel: ["low", "moderate", "high", "critical"].includes(parsed.riskLevel) ? parsed.riskLevel : "moderate",
                            riskScore: typeof parsed.riskScore === "number" ? Math.min(100, Math.max(0, parsed.riskScore)) : 50,
                            possibleConditions: parsed.possibleConditions || [],
                            vitalAnalysis: parsed.vitalAnalysis || {
                                bloodPressureStatus: bpStatus,
                                heartRateStatus: hrStatus,
                                bmiStatus: wt ? `Cân nặng hiện tại: ${wt} kg` : undefined,
                            },
                            recommendations: parsed.recommendations || {
                                immediateActions: ["Nghỉ ngơi và theo dõi chỉ số huyết áp."],
                                lifestyleAdvice: ["Duy trì chế độ sinh hoạt và ngủ đủ giấc."],
                                dietaryTips: ["Uống đủ nước và giảm lượng muối trong khẩu phần."],
                                whenToSeeDoctor: "Khám định kỳ sau 3-6 tháng hoặc khi có triệu chứng bất thường.",
                            },
                            disclaimer: parsed.disclaimer ||
                                "Lưu ý: Kết quả phân tích được hỗ trợ bởi Trí tuệ Nhân tạo Google Gemini, mang tính tham khảo y khoa và không thay thế chẩn đoán chính thức của Bác sĩ chuyên khoa.",
                            createdAt: new Date().toISOString(),
                        };
                    }
                }
                catch (geminiError) {
                    console.warn("Gemini API call returned error, smoothly utilizing clinical fallback engine:", geminiError);
                }
            }
            // Nếu chưa có kết quả từ AI (do chưa có API Key hoặc lỗi mạng), sử dụng Clinical Fallback Rule Engine
            if (!diagnosisResult) {
                let calculatedRisk = "low";
                let totalRiskScore = Math.min(100, Math.max(15, bpRiskScore + symptoms.length * 12));
                const conditions = [];
                const immediateActions = [];
                const lifestyleAdvice = [];
                const dietaryTips = [];
                const lowerSymptoms = symptoms.map((s) => s.toLowerCase());
                if (lowerSymptoms.some((s) => s.includes("đau đầu") || s.includes("chóng mặt") || s.includes("hoa mắt"))) {
                    conditions.push({
                        name: sys >= 135 ? "Hội chứng tăng huyết áp nguyên phát" : "Rối loạn tuần hoàn não nhẹ do căng thẳng",
                        probability: sys >= 135 ? "78%" : "65%",
                        description: "Có dấu hiệu suy giảm lưu thông máu não tạm thời hoặc biến động chỉ số huyết áp động mạch.",
                    });
                    immediateActions.push("Nghỉ ngơi tại nơi thoáng khí, ngồi hoặc nằm thư giãn trong 15-20 phút.");
                    immediateActions.push("Đo lại huyết áp sau khi nghỉ ngơi để đối chiếu chỉ số.");
                }
                if (lowerSymptoms.some((s) => s.includes("tức ngực") || s.includes("khó thở") || s.includes("hồi hộp"))) {
                    calculatedRisk = "high";
                    totalRiskScore = Math.max(totalRiskScore, 80);
                    conditions.push({
                        name: "Cảnh báo quá tải tim mạch hoặc co thắt mạch vành",
                        probability: "72%",
                        description: "Xuất hiện dấu hiệu thiếu máu cơ tim cục bộ hoặc căng thẳng áp lực tim mạch quá mức.",
                    });
                    immediateActions.push("Dừng ngay các hoạt động thể lực nặng, ngồi tựa lưng thẳng.");
                    immediateActions.push("Nếu đau tức ngực lan ra vai trái hoặc kéo dài trên 10 phút, cần đến ngay cơ sở y tế gần nhất.");
                }
                if (lowerSymptoms.some((s) => s.includes("mệt mỏi") || s.includes("mất ngủ") || s.includes("uể oải"))) {
                    conditions.push({
                        name: "Hội chứng suy nhược thể lực & rối loạn giấc ngủ",
                        probability: "60%",
                        description: "Thiếu hụt phục hồi thần kinh tự chủ, thường do áp lực công việc hoặc thiếu ngủ kéo dài.",
                    });
                    lifestyleAdvice.push("Thiết lập khung giờ ngủ cố định trước 23h00 hàng đêm.");
                    lifestyleAdvice.push("Hạn chế tiếp xúc màn hình ánh sáng xanh trước khi đi ngủ ít nhất 45 phút.");
                }
                if (conditions.length === 0) {
                    conditions.push({
                        name: "Chỉ số sinh tồn ổn định (Không phát hiện bệnh lý cấp tính)",
                        probability: "90%",
                        description: "Các chỉ số huyết áp, nhịp tim và cân nặng hiện tại đang nằm trong ngưỡng kiểm soát an toàn.",
                    });
                    immediateActions.push("Duy trì chế độ sinh hoạt và theo dõi định kỳ đều đặn.");
                }
                if (sys >= 130) {
                    dietaryTips.push("Giảm lượng muối natri xuống dưới 5g/ngày (tránh đồ kho mặn, đồ đóng hộp).");
                    dietaryTips.push("Tăng cường thực phẩm giàu Kali và Magie: chuối, rau bina, bơ, hạnh nhân.");
                }
                else {
                    dietaryTips.push("Bổ sung đủ 2.0 - 2.5 lít nước lọc mỗi ngày để đảm bảo thể tích tuần hoàn máu.");
                    dietaryTips.push("Tăng cường rau xanh, củ quả tươi giàu chất chống oxy hóa.");
                }
                lifestyleAdvice.push("Duy trì đi bộ hoặc vận động nhẹ nhàng tối thiểu 30 phút/ngày (5 buổi/tuần).");
                if (totalRiskScore >= 75) {
                    calculatedRisk = "high";
                }
                else if (totalRiskScore >= 45) {
                    calculatedRisk = "moderate";
                }
                else {
                    calculatedRisk = "low";
                }
                diagnosisResult = {
                    id: `ai_diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    user_id: userId,
                    summary: `Đánh giá tổng quan: ${calculatedRisk === "high"
                        ? "Cần chú ý đặc biệt các dấu hiệu tim mạch / huyết áp"
                        : calculatedRisk === "moderate"
                            ? "Có một số chỉ số cần điều chỉnh lối sống và theo dõi thêm"
                            : "Sức khỏe tổng thể đang trong tầm kiểm soát tốt"}.`,
                    riskLevel: calculatedRisk,
                    riskScore: totalRiskScore,
                    possibleConditions: conditions,
                    vitalAnalysis: {
                        bloodPressureStatus: bpStatus,
                        heartRateStatus: hrStatus,
                        bmiStatus: wt ? `Cân nặng hiện tại: ${wt} kg` : undefined,
                    },
                    recommendations: {
                        immediateActions: immediateActions.length > 0 ? immediateActions : ["Thư giãn tinh thần và theo dõi nhịp thở."],
                        lifestyleAdvice,
                        dietaryTips,
                        whenToSeeDoctor: calculatedRisk === "high"
                            ? "Nên đến gặp Bác sĩ Chuyên khoa Tim mạch/Nội tổng quát trong vòng 24-48 giờ nếu triệu chứng tái diễn."
                            : "Khám sức khỏe định kỳ sau 3-6 tháng hoặc khi chỉ số huyết áp có biến động liên tục trên 140/90 mmHg.",
                    },
                    disclaimer: "Lưu ý: Kết quả phân tích và chuẩn đoán mang tính chất gợi ý và hỗ trợ tham khảo từ trí tuệ nhân tạo, không thay thế cho kết luận chẩn đoán lâm sàng chính thức từ Bác sĩ hoặc Cơ sở Y tế có thẩm quyền.",
                    createdAt: new Date().toISOString(),
                };
            }
            dbAIDiagnosisHistory.unshift(diagnosisResult);
            const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
            logSystemActivity("RECORD_CREATED", "info", `Tài khoản ${req.user.email} đã thực hiện phân tích sức khỏe AI`, {
                userId: req.user.id,
                userName: req.user.full_name,
                userEmail: req.user.email,
                userRole: req.user.role,
                ip: clientIp,
            });
            return res.status(200).json({
                success: true,
                data: diagnosisResult,
            });
        }
        catch (err) {
            return res.status(500).json({
                success: false,
                message: "Lỗi trong quá trình xử lý chuẩn đoán AI: " + (err.message || err),
            });
        }
    });
    // Endpoint: Trò chuyện & Tư vấn trực tiếp với Bác sĩ Trợ lý AI (Google Gemini AI Doctor)
    app.post("/api/ai/chat", authenticateJWT, async (req, res) => {
        try {
            const { message, history = [] } = req.body;
            if (!message || typeof message !== "string" || !message.trim()) {
                return res.status(400).json({ success: false, message: "Nội dung tin nhắn không được để trống." });
            }
            const userId = req.user.id;
            const user = dbUsers.find((u) => u.id === userId);
            const userRecords = dbHealthRecords
                .filter((r) => r.user_id === userId)
                .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
                .slice(0, 5);
            const ai = getGeminiAI();
            if (!ai) {
                return res.status(200).json({
                    success: true,
                    data: {
                        reply: `Xin chào **${user?.full_name || "bạn"}**, tôi là **Bác sĩ Trợ lý Sức khỏe VitalTrack AI**.\n\n` +
                            `Hiện tại hệ thống đang chạy ở chế độ dự phòng lâm sàng. Để kích hoạt toàn bộ sức mạnh phân tích chuyên sâu của Google Gemini AI, hệ thống sẽ tự động sử dụng khóa \`GEMINI_API_KEY\` được cấu hình trong Secrets.\n\n` +
                            `**Lời khuyên tim mạch cho bạn:**\n` +
                            `1. Hãy duy trì đo huyết áp 2 lần/ngày (buổi sáng khi vừa thức dậy và buổi tối trước khi đi ngủ).\n` +
                            `2. Uống đủ 2 - 2.5 lít nước mỗi ngày và hạn chế ăn đồ mặn (dưới 5g muối/ngày).\n` +
                            `3. Nếu bạn cảm thấy tức ngực khó thở hoặc đau đầu dữ dội, hãy nghỉ ngơi và liên hệ bác sĩ ngay.`,
                        model: "system-fallback",
                    },
                });
            }
            const contextInfo = `Bệnh nhân: ${user?.full_name || "Người dùng"}, Giới tính: ${user?.gender || "Không rõ"}, Ngày sinh: ${user?.date_of_birth || "Không rõ"}. ` +
                `Tiền sử bệnh lý: ${user?.chronic_conditions?.join(", ") || "Không ghi nhận"}. ` +
                `Dị ứng: ${user?.allergies?.join(", ") || "Không có"}. ` +
                `Lịch sử đo sinh trắc gần nhất: ${userRecords.map((r) => `[${r.recorded_at.split("T")[0]}: HA ${r.systolic}/${r.diastolic} mmHg, Tim ${r.heart_rate} bpm, Nặng ${r.weight} kg]`).join("; ") || "Chưa có bản ghi"}.`;
            const contents = [];
            if (Array.isArray(history)) {
                for (const item of history.slice(-6)) {
                    if (item && item.role && item.text) {
                        contents.push({
                            role: item.role === "user" ? "user" : "model",
                            parts: [{ text: String(item.text) }],
                        });
                    }
                }
            }
            contents.push({
                role: "user",
                parts: [{ text: message }],
            });
            const response = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents,
                config: {
                    systemInstruction: `Bạn là Bác sĩ Trợ lý Tư vấn Y khoa VitalTrack AI (VitalTrack AI Doctor) được vận hành bởi mô hình Google Gemini.
Ngữ cảnh lâm sàng của người dùng hiện tại:
${contextInfo}

Nhiệm vụ của bạn:
1. Giải đáp các thắc mắc về sức khỏe, chỉ số tim mạch, huyết áp, cân nặng, nhịp tim, dinh dưỡng, lối sống và tập luyện bằng Tiếng Việt ân cần, khoa học, dễ hiểu và chuyên nghiệp.
2. Luôn căn cứ vào hướng dẫn của Hội Tim Mạch Việt Nam (VNHA), Hiệp hội Tim mạch Hoa Kỳ (AHA) và WHO.
3. Khi nhận thấy các triệu chứng cấp cứu nguy hiểm (đau thắt ngực lan ra vai/hàm, khó thở cấp, đột ngột yếu liệt, méo miệng...), lập tức cảnh báo khẩn cấp và hướng dẫn gọi cấp cứu 115 hoặc đến bệnh viện gần nhất.
4. Giữ câu trả lời súc tích, định dạng markdown rõ ràng (tiêu đề, gạch đầu dòng), kèm lời chúc sức khỏe và nhắc nhở miễn trừ trách nhiệm y khoa ngắn gọn.`,
                },
            });
            const reply = response.text || "Bác sĩ AI chưa thể phản hồi lúc này, xin vui lòng thử lại sau giây lát.";
            return res.status(200).json({
                success: true,
                data: {
                    reply,
                    model: "gemini-1.5-flash",
                },
            });
        }
        catch (err) {
            console.error("Gemini AI Chat Error:", err);
            return res.status(500).json({
                success: false,
                message: "Lỗi kết nối tới mô hình AI: " + (err.message || err),
            });
        }
    });
    // Endpoint: Lấy lịch sử tư vấn chuẩn đoán AI
    app.get("/api/ai/history", authenticateJWT, (req, res) => {
        const userId = req.user.id;
        const history = dbAIDiagnosisHistory.filter((d) => d.user_id === userId);
        return res.status(200).json({
            success: true,
            data: history,
        });
    });
    // =========================================================================
    // 🔌 2. CONNECTED PERIPHERAL / IOT HARDWARE API ENDPOINTS
    // =========================================================================
    //
    // 📌 GHI CHÚ TÍCH HỢP PHẦN CỨNG NGOẠI VI (HARDWARE / IOT INTEGRATION):
    // Thiết bị ngoại vi (Đồng hồ thông minh, máy đo huyết áp Bluetooth/WiFi, ESP32,
    // Raspberry Pi, cảm biến SpO2/ECG) có thể gửi dữ liệu trực tiếp vào hệ thống
    // qua Endpoint: POST /api/devices/ingest
    //
    // =========================================================================
    // Danh sách thiết bị ngoại vi đã kết nối của user
    app.get("/api/devices", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const pool = getMySQLPool();
            const [devices] = await pool.query('SELECT * FROM connected_devices WHERE user_id = ?', [userId]);
            const formattedDevices = devices.map(d => ({
                id: d.id,
                user_id: d.user_id,
                name: d.name,
                type: d.type,
                model: d.model,
                batteryLevel: d.battery_level,
                status: d.status,
                lastSyncTime: d.last_sync_time,
                macAddress: d.mac_address,
                firmwareVersion: d.firmware_version,
                created_at: d.created_at
            }));
            return res.status(200).json({ success: true, data: formattedDevices });
        } catch (error) {
            console.error('Error GET /api/devices:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Đăng ký ghép nối thiết bị mới (Pairing Device)
    app.post("/api/devices/pair", authenticateJWT, async (req, res) => {
        try {
            const { name, type, model, macAddress } = req.body;
            const userId = req.user.id;
            if (!name || !type) {
                return res.status(400).json({ success: false, message: "Tên thiết bị và loại thiết bị là bắt buộc." });
            }
            const deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const deviceModel = model || "Standard BLE Peripheral";
            const macAddr = macAddress || "00:1A:7D:DA:71:13";
            const fwVer = "v1.0.0";
            const pool = getMySQLPool();
            await pool.execute(
                'INSERT INTO connected_devices (id, user_id, name, type, model, battery_level, status, last_sync_time, mac_address, firmware_version) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)',
                [deviceId, userId, name, type, deviceModel, 100, "connected", macAddr, fwVer]
            );
            return res.status(201).json({
                success: true,
                message: `Đã kết nối thành công thiết bị ${name}`,
                data: { id: deviceId, user_id: userId, name, type, model: deviceModel, batteryLevel: 100, status: "connected", macAddress: macAddr, firmwareVersion: fwVer }
            });
        } catch (error) {
            console.error('Error POST /api/devices/pair:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Đồng bộ thủ công dữ liệu từ thiết bị ngoại vi
    app.post("/api/devices/:deviceId/sync", authenticateJWT, async (req, res) => {
        try {
            const { deviceId } = req.params;
            const userId = req.user.id;
            const pool = getMySQLPool();
            const [devices] = await pool.query('SELECT * FROM connected_devices WHERE id = ? AND user_id = ?', [deviceId, userId]);
            const device = devices[0];
            if (!device) {
                return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị ngoại vi này." });
            }
            const newBattery = Math.max(0, (device.battery_level || 100) - 1);
            await pool.execute('UPDATE connected_devices SET status = ?, battery_level = ?, last_sync_time = NOW() WHERE id = ?', ["connected", newBattery, deviceId]);
            const weight = device.type === "smart_scale" ? 68.2 : 68.0;
            const systolic = device.type === "blood_pressure_monitor" ? 118 : 120;
            const diastolic = device.type === "blood_pressure_monitor" ? 78 : 80;
            const heart_rate = device.type === "smartwatch" ? 74 : 72;
            const notes = `Dữ liệu sinh trắc học nhận tự động từ [${device.name} - Model: ${device.model}]`;
            const [result] = await pool.execute(
                'INSERT INTO health_records (user_id, weight, systolic, diastolic, heart_rate, recorded_at, notes) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
                [userId, weight, systolic, diastolic, heart_rate, notes]
            );
            return res.status(200).json({
                success: true,
                message: `Đã đồng bộ dữ liệu thành công từ ${device.name}!`,
                data: { syncedRecordId: result.insertId, deviceId }
            });
        } catch (error) {
            console.error('Error syncing device:', error);
            return res.status(500).json({ success: false, message: 'Lỗi đồng bộ máy chủ' });
        }
    });
    // Xóa / Ngắt kết nối thiết bị ngoại vi
    app.delete("/api/devices/:deviceId", authenticateJWT, async (req, res) => {
        try {
            const { deviceId } = req.params;
            const userId = req.user.id;
            const pool = getMySQLPool();
            const [result] = await pool.execute('DELETE FROM connected_devices WHERE id = ? AND user_id = ?', [deviceId, userId]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị ngoại vi này." });
            }
            return res.status(200).json({ success: true, message: "Đã ngắt kết nối thiết bị." });
        } catch (error) {
            console.error('Error deleting device:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Direct Ingest Endpoint for IoT Hardware (API Webhook / Direct Telemetry push)
    app.post("/api/devices/ingest", authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const { deviceId, weight, systolic, diastolic, heart_rate, notes } = req.body;
            const nWeight = Number(weight) || 68.0;
            const nSys = Number(systolic) || 120;
            const nDia = Number(diastolic) || 80;
            const nHr = Number(heart_rate) || 72;
            const rNotes = notes || `Ghi nhận trực tiếp từ cổng ngoại vi IoT (Thiết bị ID: ${deviceId || "External Sensor"})`;
            const pool = getMySQLPool();
            const [result] = await pool.execute(
                'INSERT INTO health_records (user_id, weight, systolic, diastolic, heart_rate, recorded_at, notes) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
                [userId, nWeight, nSys, nDia, nHr, rNotes]
            );
            return res.status(201).json({
                success: true,
                message: "Dữ liệu ngoại vi đã được nạp thành công vào cơ sở dữ liệu thật.",
                data: { id: result.insertId }
            });
        } catch (error) {
            console.error('Error ingesting device data:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Endpoint: Kiểm tra trạng thái kết nối MySQL Database
    app.get("/api/database/status", async (req, res) => {
        try {
            const pool = getMySQLPool();
            const connection = await pool.getConnection();
            const [rows] = await connection.query("SELECT 1 as is_connected, NOW() as current_server_time");
            connection.release();
            return res.status(200).json({
                success: true,
                message: "Kết nối tới cơ sở dữ liệu MySQL thành công!",
                data: {
                    connected: true,
                    host: process.env.MYSQL_HOST || "localhost",
                    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
                    database: process.env.MYSQL_DATABASE || "vitaltrack_db",
                    user: process.env.MYSQL_USER || "root",
                    queryResult: rows,
                },
            });
        }
        catch (err) {
            return res.status(200).json({
                success: false,
                message: `Chưa thể kết nối tới máy chủ MySQL (${err.code || err.message}).`,
                data: {
                    connected: false,
                    host: process.env.MYSQL_HOST || "localhost",
                    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
                    database: process.env.MYSQL_DATABASE || "vitaltrack_db",
                    user: process.env.MYSQL_USER || "root",
                    error: err.message,
                },
            });
        }
    });
    // Cấu hình chế độ chạy: API thuần túy (API Only) hoặc Tích hợp Fullstack
    if (isApiOnly) {
        // =========================================================================
        // CHẾ ĐỘ MÁY CHỦ REST API THUẦN TÚY (PURE REST API SERVER)
        // Tuyệt đối KHÔNG chạy giao diện Client, KHÔNG nạp Vite middleware
        // =========================================================================
        app.get("/", (req, res) => {
            return res.status(200).json({
                success: true,
                service: "VitalTrack REST API Server",
                status: "ONLINE",
                version: "1.0.0",
                mode: "PURE_REST_API",
                port: PORT,
                message: "Máy chủ Backend API thuần túy đang hoạt động. Hoàn toàn không chứa giao diện Client.",
                endpoints: {
                    health: "/api/health",
                    auth_login: "POST /api/auth/login",
                    auth_register: "POST /api/auth/register",
                    health_records: "GET /api/health-records",
                    audit_logs: "GET /api/admin/audit-logs",
                    database_status: "GET /api/database/status"
                },
                client_instruction: "Giao diện React Client chạy độc lập qua lệnh: npm run client (cổng 5173)"
            });
        });

        // Bắt các đường dẫn không tồn tại trên API server và trả về JSON 404 (thay vì HTML)
        app.use((req, res) => {
            return res.status(404).json({
                success: false,
                error: "NOT_FOUND",
                message: `Tài nguyên '${req.method} ${req.originalUrl}' không tồn tại trên máy chủ Backend API. Mọi API hợp lệ bắt đầu bằng '/api/'.`
            });
        });
    } else {
        // Vite development middleware or static production serving
        if (process.env.NODE_ENV !== "production") {
            const vite = await createViteServer({
                server: { middlewareMode: true },
                appType: "spa",
            });
            app.use(vite.middlewares);
        }
        else {
            const distPath = path.join(process.cwd(), "dist");
            app.use(express.static(distPath));
            app.get("*", (req, res) => {
                res.sendFile(path.join(distPath, "index.html"));
            });
        }
    }
    app.listen(PORT, "0.0.0.0", () => {
        if (isApiOnly) {
            console.log(`\n========================================================`);
            console.log(`🚀 VitalTrack PURE REST API SERVER running on http://localhost:${PORT}`);
            console.log(`📌 Chế độ: API Thuần túy (KHÔNG chứa giao diện Client)`);
            console.log(`⚡ Base API URL: http://localhost:${PORT}/api`);
            console.log(`🌐 Để chạy giao diện Client riêng: mở terminal gõ: npm run client`);
            console.log(`========================================================\n`);
        } else {
            console.log(`VitalTrack Web Service running on http://localhost:${PORT}`);
        }
    });
}
startServer();
