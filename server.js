import { registerSettingsRoutes, readSettings } from './server/settings-routes.js';
import { profileFields } from './server/profile-fields.js';
import { registerReminderRoutes } from './server/reminder-routes.js';
import { registerDeviceWriteRoutes } from './server/device-routes.js';
import { registerAIRoutes, formatDiagnosis } from './server/ai-routes.js';
import { registerAdminRoutes } from './server/admin-routes.js';
import { registerHealthRoutes } from './server/health-routes.js';
import { loadHealthSnapshot, healthCapabilities, validateRecord, syncGoals, inTransaction, DEVICE_TYPES, progress, goalWithCurrent, insertUserWithoutGuessedBiometrics, validMetric, riskCategory } from './server/health-domain.js';
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
            charset: "utf8mb4",
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            connectTimeout: 5000,
            timezone: "Z",
            ...(ssl ? { ssl } : {}),
        });
        // mysql2 timezone controls JS conversion; the session also needs UTC for
        // NOW(), TIMESTAMP defaults and the new nullable updated_at column.
        // This changes only new connection sessions, never stored legacy values.
        mysqlPool.on('connection', connection => {
            connection.query("SET time_zone = '+00:00'", error => {
                if (error) connection.destroy();
            });
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
const getDefaultPool = getMySQLPool;
const isApiOnly = process.env.API_ONLY === "true" || process.argv.includes("--api-only");
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (isApiOnly ? 5000 : 3000);
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) throw new Error("JWT_SECRET is required in production");
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
const revokedSessions = new Set();
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
        const pool = (req?.app?.locals.pool?.() || getMySQLPool());
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
        console.error('Error inserting audit log into MySQL:', dbErr.code || 'AUDIT_WRITE_FAILED');
    }

    // Ghi vào danh sách log hệ thống phụ để đảm bảo tính tương thích ngược
    logSystemActivity(action, status === "SUCCESS" ? "success" : "danger", description, {
        userId,
        userName,
        userRole,
        ip: clientIp,
        userAgent: clientUA
    });

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
if (process.env.ALLOW_DEMO_DATA === "true" && process.env.NODE_ENV !== "production") dbAuditLogs.push(
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
if (process.env.ALLOW_DEMO_DATA === "true" && process.env.NODE_ENV !== "production") activeSessionsMap.set("session_admin_init", {
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
if (process.env.ALLOW_DEMO_DATA === "true" && process.env.NODE_ENV !== "production") activeSessionsMap.set("session_user_init", {
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
// Goal progress is shared by HTTP routes and regression tests.
const calculateProgress = progress;
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
        const pool = req.app.locals.pool();
        const [users] = await pool.query('SELECT id, email, role, full_name, is_active FROM users WHERE id = ?', [decoded.id]);
        const user = users[0];

        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                message: "Tài khoản không tồn tại hoặc đã bị khóa.",
            });
        }
        if (decoded.sessionId && revokedSessions.has(decoded.sessionId)) return res.status(401).json({ success: false, message: "Session ended." });
        req.sessionId = decoded.sessionId;
        if (decoded.sessionId && activeSessionsMap.has(decoded.sessionId)) activeSessionsMap.get(decoded.sessionId).lastActivityAt = new Date().toISOString();
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
        };
        next();
    }
    catch (err) {
        if (!["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(err.name)) return res.status(503).json({ success: false, message: "Cannot verify session: data service temporarily unavailable." });
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
    for (const field of ['chronic_conditions', 'allergies']) {
        const value = typeof safeUser[field] === 'string' ? JSON.parse(safeUser[field]) : safeUser[field] ?? [];
        if (!Array.isArray(value)) throw Object.assign(new Error('Invalid stored profile data'), { code: 'PROFILE_DATA_INVALID' });
        safeUser[field] = value;
    }
    if (typeof safeUser.vital_alert_thresholds === 'string') safeUser.vital_alert_thresholds = JSON.parse(safeUser.vital_alert_thresholds);
    return safeUser;
}
export async function startServer({ pool: injectedPool, listen = true, apiOnly = isApiOnly } = {}) {
    const app = express();
    const getMySQLPool = () => injectedPool || getDefaultPool();
    app.locals.pool = getMySQLPool;
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

            const [userResult] = await insertUserWithoutGuessedBiometrics(pool, ['full_name', 'email', 'password', 'role', 'is_active'],
                [trimmedName, trimmedEmail, hashedPassword, 'user', 1]
            );
            const newUserId = userResult.insertId;
            const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [newUserId]);
            const newUser = newUsers[0];

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

            const sessionId = `sess_${newUser.id}_${Date.now()}`;
            const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, full_name: newUser.full_name, sessionId }, JWT_SECRET, { expiresIn: "7d" });

            cleanExpiredSessions();
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
            console.error('Error in register:', err.code || err.name);
            return res.status(500).json({ success: false, message: "Lỗi server khi đăng ký." });
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
            return res.status(500).json({ success: false, message: "Lỗi hệ thống khi xác thực đăng nhập." });
        }
    });
    // POST /api/auth/social-login (Google, Apple)
    app.post("/api/auth/social-login", async (req, res) => {
        if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_AUTH !== "true") return res.status(503).json({ success: false, message: "Provider authentication unavailable. Please use email and password." });
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

                const [insertResult] = await insertUserWithoutGuessedBiometrics(pool, ['full_name', 'email', 'password', 'role', 'is_active', 'avatar_url'],
                    [displayName, trimmedEmail, randomPassword, 'user', 1, defaultAvatar]
                );

                const newUserId = insertResult.insertId;
                const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [newUserId]);
                user = newUsers[0];

                // Add default starter health goals & reminders
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
            return res.status(500).json({ success: false, message: "Lỗi xử lý xác thực xã hội." });
        }
    });

    // POST /api/auth/otp/send (Send OTP to email or phone)
    app.post("/api/auth/otp/send", (req, res) => {
        if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_AUTH !== "true") return res.status(503).json({ success: false, message: "Provider authentication unavailable. Please use email and password." });
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
            return res.status(500).json({ success: false, message: "Lỗi tạo mã xác thực." });
        }
    });

    // POST /api/auth/otp/verify (Verify OTP & Login / Auto-register)
    app.post("/api/auth/otp/verify", async (req, res) => {
        if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_AUTH !== "true") return res.status(503).json({ success: false, message: "Provider authentication unavailable. Please use email and password." });
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

                const [insertResult] = await insertUserWithoutGuessedBiometrics(pool, ['full_name', 'email', 'phone_number', 'password', 'role', 'is_active'],
                    [displayName, emailToUse, isEmail ? null : key, randomPassword, 'user', 1]
                );

                const newUserId = insertResult.insertId;
                const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [newUserId]);
                user = newUsers[0];
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
            return res.status(500).json({ success: false, message: "Lỗi xác minh mã xác thực." });
        }
    });

    // Đăng xuất người dùng
    app.post("/api/auth/logout", authenticateJWT, async (req, res) => {
        if (req.sessionId) { revokedSessions.add(req.sessionId); activeSessionsMap.delete(req.sessionId); }
        try {
            return res.status(200).json({
                success: true,
                message: "Đăng xuất thành công."
            });
        } catch (error) {
            console.error("Error POST /api/auth/logout:", error.code || error.name);
            return res.status(500).json({
                success: false,
                message: "Lỗi khi đăng xuất."
            });
        }
    });

    // Ghi nhận lượt truy cập trang
    app.post("/api/activity/page-view", authenticateJWT, async (req, res) => {
        try {
            const { page } = req.body || {};

            if (typeof page !== "string" || !page.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Đường dẫn trang không hợp lệ."
                });
            }

            return res.status(200).json({
                success: true,
                message: "Đã tiếp nhận lượt xem trang."
            });
        } catch (error) {
            console.error("Error POST /api/activity/page-view:", error.code || error.name);
            return res.status(500).json({
                success: false,
                message: "Không thể ghi nhận lượt xem trang."
            });
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
                data: { ...sanitizeUser(user), current_health: await loadHealthSnapshot(pool, req.user.id) },
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
            for (const [field, min, max] of [['height_cm', 40, 260], ['base_weight_kg', 10, 400], ['target_weight_kg', 10, 400]]) {
                if (body[field] === null) { updates.push(field + ' = ?'); params.push(null); }
                else if (body[field] !== undefined && (body[field] === '' || typeof body[field] === 'boolean' || !Number.isFinite(Number(body[field])) || Number(body[field]) < min || Number(body[field]) > max)) return res.status(400).json({ success: false, message: 'Invalid biometric value: ' + field });
            }
            if (body.height_cm !== undefined && body.height_cm !== null) {
                const h = Number(body.height_cm);
                if (!isNaN(h) && h >= 40 && h <= 260) { updates.push('height_cm = ?'); params.push(Math.round(h * 10) / 10); }
            }
            if (body.base_weight_kg !== undefined && body.base_weight_kg !== null) {
                const bw = Number(body.base_weight_kg);
                if (!isNaN(bw) && bw >= 10 && bw <= 400) { updates.push('base_weight_kg = ?'); params.push(Math.round(bw * 10) / 10); }
            }
            if (body.target_weight_kg !== undefined && body.target_weight_kg !== null) {
                const tw = Number(body.target_weight_kg);
                if (!isNaN(tw) && tw >= 10 && tw <= 400) { updates.push('target_weight_kg = ?'); params.push(Math.round(tw * 10) / 10); }
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
                data: { ...sanitizeUser(updatedUser), current_health: await loadHealthSnapshot(pool, updatedUser.id) },
            });
        }
        catch (err) {
            console.error("Error PUT /api/profile:", err.code || err.name);
            return res.status(500).json({ success: false, message: "Lỗi khi cập nhật hồ sơ." });
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
            return res.status(500).json({ success: false, message: "Lỗi server khi đổi mật khẩu." });
        }
    });
    registerHealthRoutes(app, { authenticateJWT, audit: createAuditLog });
    registerReminderRoutes(app, { authenticateJWT, audit: createAuditLog });
    registerAdminRoutes(app, { authenticateJWT, requireAdmin, audit: createAuditLog, sessions: activeSessionsMap, revokedSessions });
    // ==========================================

    // Admin - Cấp phát thiết bị cho người dùng
    app.post("/api/admin/devices", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            const {
                userId,
                name,
                type,
                model,
                macAddress,
                firmwareVersion
            } = req.body || {};

            const targetUserId = Number(userId);
            const deviceName = String(name || "").trim();

            const typeMap = {
                blood_pressure: "blood_pressure_monitor",
                blood_pressure_monitor: "blood_pressure_monitor",
                smartwatch: "smartwatch",
                smart_scale: "smart_scale",
                spo2_sensor: "pulse_oximeter",
                pulse_oximeter: "pulse_oximeter",
                glucose_meter: "glucose_meter"
            };

            const normalizedType = typeMap[type];

            if (!Number.isSafeInteger(targetUserId) || targetUserId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "ID người dùng không hợp lệ."
                });
            }

            if (!deviceName || deviceName.length > 150 || !normalizedType) {
                return res.status(400).json({
                    success: false,
                    message: "Tên hoặc loại thiết bị không hợp lệ."
                });
            }

            const pool = getMySQLPool();

            const [users] = await pool.execute(
                "SELECT id FROM users WHERE id = ?",
                [targetUserId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy người dùng được cấp phát thiết bị."
                });
            }

            const deviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

            const deviceModel = String(model || "").trim();
            const mac = String(macAddress || "").trim();
            const firmware = String(firmwareVersion || "").trim();

            if (deviceModel.length > 100 || mac.length > 50 || firmware.length > 50 || (mac && !/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(mac))) {
                return res.status(400).json({
                    success: false,
                    message: "Thông tin thiết bị vượt quá độ dài cho phép."
                });
            }

            await pool.execute(
                `INSERT INTO connected_devices
             (id, user_id, name, type, model, battery_level,
              status, last_sync_time, mac_address, firmware_version)
             VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
                [
                    deviceId,
                    targetUserId,
                    deviceName,
                    normalizedType,
                    deviceModel,
                    null,
                    "idle",
                    mac || null,
                    firmware || null
                ]
            );

            return res.status(201).json({
                success: true,
                message: "Cấp phát thiết bị thành công.",
                data: {
                    id: deviceId,
                    user_id: targetUserId,
                    name: deviceName,
                    type: normalizedType,
                    model: deviceModel,
                    batteryLevel: null,
                    status: "idle",
                    macAddress: mac,
                    firmwareVersion: firmware
                }
            });

        } catch (error) {
            console.error("Error POST /api/admin/devices:", error.code || error.name);

            return res.status(500).json({
                success: false,
                message: "Lỗi máy chủ khi cấp phát thiết bị."
            });
        }
    });

    // Admin - Lấy danh sách tất cả thiết bị
    app.get("/api/admin/devices", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            const pool = getMySQLPool();

            const [devices] = await pool.query(`
            SELECT
                d.*,
                u.full_name AS user_name,
                u.email AS user_email
            FROM connected_devices d
            LEFT JOIN users u ON d.user_id = u.id
            ORDER BY d.created_at DESC
        `);

            return res.status(200).json({
                success: true,
                data: devices
            });

        } catch (error) {
            console.error("Error GET /api/admin/devices:", error.code || error.name);

            return res.status(500).json({
                success: false,
                message: "Không thể tải danh sách thiết bị."
            });
        }
    });

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
                    SUM(category = 'crisis') as crisis,
                    SUM(category = 'stage2') as stage2,
                    SUM(category = 'stage1') as stage1,
                    SUM(category = 'elevated') as elevated,
                    SUM(category = 'normal') as normal
                FROM (
                    SELECT CASE
                        WHEN systolic NOT BETWEEN 50 AND 260 OR diastolic NOT BETWEEN 30 AND 180 OR systolic IS NULL OR diastolic IS NULL THEN 'unknown'
                        WHEN systolic > 180 OR diastolic > 120 THEN 'crisis'
                        WHEN systolic >= 140 OR diastolic >= 90 THEN 'stage2'
                        WHEN systolic >= 130 OR diastolic >= 80 THEN 'stage1'
                        WHEN systolic >= 120 THEN 'elevated'
                        ELSE 'normal' END AS category
                    FROM health_records WHERE recorded_at <= UTC_TIMESTAMP()
                ) evaluated
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
            console.error('Admin dashboard error:', err.code || err.name);
            return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        }
    });

    // Admin Comprehensive System-Wide Health & User Statistics

    // Admin Comprehensive System-Wide Health & User Statistics
    app.get("/api/admin/statistics", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            const pool = getMySQLPool();
            // Use memory processing for complex time series buckets, but load data appropriately
            const [dbUsers] = await pool.query('SELECT id, is_active, created_at FROM users');
            const [rawHealthRecords] = await pool.query('SELECT id, user_id, weight, systolic, diastolic, heart_rate, recorded_at FROM health_records');
            const dbHealthRecords = rawHealthRecords.map(record => ({ ...record, ...Object.fromEntries(['weight', 'systolic', 'diastolic', 'heart_rate'].map(field => [field, validMetric(field, record[field]) ? Number(record[field]) : null])) }));
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
            const recordsInRangeList = dbHealthRecords.filter((r) => new Date(r.recorded_at) >= startTime && new Date(r.recorded_at) <= now);
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
            const evalRecords = recordsInRangeList.filter(r => riskCategory(r) !== 'unknown');
            evalRecords.forEach((r) => {
                if (r.systolic > 180 || r.diastolic > 120)
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
                    name: "Huyết áp tăng (120-129/<80)",
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
                    name: "Vượt ngưỡng nghiêm trọng (>180/>120)",
                    count: crisisCount,
                    percentage: Math.round((crisisCount / totalEval) * 1000) / 10,
                    description: "Cần liên hệ nhân viên y tế ngay; có triệu chứng nguy hiểm thì gọi cấp cứu",
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
            console.error("Error in /api/admin/statistics:", err.code || err.name);
            return res.status(500).json({
                success: false,
                message: "Lỗi khi tổng hợp dữ liệu thống kê hệ thống. Vui lòng thử lại.",
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
            return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
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
            return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
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
            return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
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

            const [records] = await pool.query('SELECT * FROM health_records WHERE user_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 50', [targetId]);
            const [goals] = await pool.query('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC', [targetId]);
            const [devices] = await pool.query('SELECT * FROM connected_devices WHERE user_id = ?', [targetId]);
            const currentHealth = await loadHealthSnapshot(pool, targetId);
            const [aiHistory] = await pool.query('SELECT * FROM ai_diagnoses WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [targetId]);
            const formattedHistory = aiHistory.map(formatDiagnosis);
            const average = field => {
                const values = records.filter(r => new Date(r.recorded_at).getTime() <= Date.now() && validMetric(field, r[field])).map(r => Number(r[field]));
                return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
            };
            const lastWeight = currentHealth.current.weight?.value ?? null;
            const bmi = lastWeight != null && Number(user.height_cm) > 0 ? Math.round(lastWeight / (Number(user.height_cm) / 100) ** 2 * 10) / 10 : null;

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
                    user: { ...sanitizeUser(user), current_health: currentHealth },
                    health_records: records,
                    goals: goals.map(g => goalWithCurrent(g, currentHealth)),
                    devices,
                    ai_history: formattedHistory,
                    aiHistory: formattedHistory,
                    stats: { avgSystolic: average('systolic'), avgDiastolic: average('diastolic'), avgHeartRate: average('heart_rate'), lastWeight, bmi, bmiCategory: 'Chỉ số tham khảo', sampleSize: records.length },
                },
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        }
    });

    // Admin Add New User

    app.post("/api/admin/users", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            const { full_name, email, role, password } = req.body;
            if (!full_name || !email || !role || !password) {
                return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin bắt buộc." });
            }
            if (!['user', 'admin'].includes(role) || typeof full_name !== 'string' || !full_name.trim() || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8) return res.status(400).json({ success: false, message: 'Thông tin tài khoản hoặc mật khẩu không hợp lệ.' });
            const fields = profileFields(req.body);

            const pool = getMySQLPool();
            const trimmedEmail = email.trim().toLowerCase();
            const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [trimmedEmail]);

            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: "Email này đã được sử dụng." });
            }

            const hashed = await bcrypt.hash(password, 10);

            const result = await inTransaction(pool, async connection => {
                const [insert] = await insertUserWithoutGuessedBiometrics(connection, ['full_name', 'email', 'password', 'role', 'is_active'], [full_name.trim(), trimmedEmail, hashed, role, 1]);
                if (fields.updates.length) await connection.execute('UPDATE users SET ' + fields.updates.join(', ') + ' WHERE id = ?', [...fields.params, insert.insertId]);
                return insert;
            });

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
            return res.status(err.status || 500).json({ success: false, message: err.status ? err.message : "Lỗi máy chủ" });
        }
    });

    // Admin Update User

    app.put("/api/admin/users/:id", authenticateJWT, requireAdmin, async (req, res) => {
        try {
            const targetId = parseInt(req.params.id, 10);
            const { full_name, email, role, phone_number, occupation } = req.body;
            if (role !== undefined && !['user', 'admin'].includes(role)) return res.status(400).json({ success: false, message: 'Quyền không hợp lệ.' });
            if (role !== undefined && targetId === req.user.id && role !== 'admin') return res.status(400).json({ success: false, message: 'Không thể tự hạ quyền quản trị.' });
            if (full_name !== undefined && (typeof full_name !== 'string' || !full_name.trim())) return res.status(400).json({ success: false, message: 'Họ tên không hợp lệ.' });
            if (email !== undefined && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return res.status(400).json({ success: false, message: 'Email không hợp lệ.' });
            const fields = profileFields(req.body);

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

            let updates = [...fields.updates];
            let params = [...fields.params];

            if (full_name !== undefined) { updates.push('full_name = ?'); params.push(full_name.trim()); }
            if (email !== undefined) { updates.push('email = ?'); params.push(email.trim().toLowerCase()); }
            if (role !== undefined) { updates.push('role = ?'); params.push(role); }

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
                data: { ...sanitizeUser(updatedUser), current_health: await loadHealthSnapshot(pool, updatedUser.id) },
            });
        } catch (err) {
            return res.status(err.status || 500).json({ success: false, message: err.status ? err.message : "Lỗi máy chủ" });
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

            const defaultPass = req.body.newPassword;
            if (typeof defaultPass !== "string" || defaultPass.length < 8) return res.status(400).json({ success: false, message: "Password must have at least 8 characters." });
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
                message: "Đã đặt lại mật khẩu.",
                data: { temporaryPassword: defaultPass },
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
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
            return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        }
    });

    registerSettingsRoutes(app, { authenticateJWT, requireAdmin, audit: createAuditLog });

    registerAIRoutes(app, { authenticateJWT, getAI: getGeminiAI, audit: createAuditLog });
    registerDeviceWriteRoutes(app, { authenticateJWT, audit: createAuditLog });
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
            console.error('Error GET /api/devices:', error.code || error.name);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Đăng ký ghép nối thiết bị mới (Pairing Device)
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
            console.error('Error deleting device:', error.code || error.name);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    });
    // Direct Ingest Endpoint for IoT Hardware (API Webhook / Direct Telemetry push)
    app.get("/api/database/status", authenticateJWT, requireAdmin, async (req, res) => {
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
    app.use((error, req, res, next) => {
        if (!req.path.startsWith('/api/')) return next(error);
        const status = error.type === 'entity.parse.failed' ? 400 : error.status === 413 ? 413 : 500;
        return res.status(status).json({ success: false, message: status === 400 ? 'Invalid JSON request body.' : status === 413 ? 'Request body too large.' : 'Internal server error.' });
    });
    app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'API route not found.' }));
    if (apiOnly) {
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
                    health_records: "GET /api/health",
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
    if (!listen) return app;
    return app.listen(PORT, "0.0.0.0", () => {
        if (apiOnly) {
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
if (process.env.VITALTRACK_NO_AUTOSTART !== "true") startServer();
