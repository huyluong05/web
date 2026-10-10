import { columnsFor, inTransaction } from './health-domain.js';
const DEFAULTS = { emergency_systolic_threshold: 180, emergency_diastolic_threshold: 120, warning_systolic_threshold: 130, warning_diastolic_threshold: 80, max_heart_rate_threshold: 100, min_heart_rate_threshold: 60, ai_model_name: 'gemini-2.5-flash', ai_sensitivity_level: 'balanced', require_physician_approval_for_high_risk: true, session_timeout_hours: 2, system_admin_email: '', allow_patient_registration: true, enable_email_alerts: false, maintenance_mode: false };
export async function readSettings(pool) {
  const [rows] = await pool.query('SELECT * FROM system_settings WHERE id = 1');
  const row = rows[0] ?? {};
  const raw = row.settings_json;
  const stored = typeof raw === 'string' ? JSON.parse(raw) : raw ?? {};
  return { ...DEFAULTS, warning_systolic_threshold: row.bp_systolic_warning_threshold ?? DEFAULTS.warning_systolic_threshold, warning_diastolic_threshold: row.bp_diastolic_warning_threshold ?? DEFAULTS.warning_diastolic_threshold, max_heart_rate_threshold: row.hr_high_threshold ?? DEFAULTS.max_heart_rate_threshold, min_heart_rate_threshold: row.hr_low_threshold ?? DEFAULTS.min_heart_rate_threshold, allow_patient_registration: row.allow_user_registration == null ? true : !!row.allow_user_registration, maintenance_mode: !!row.maintenance_mode, ...stored };
}
export function registerSettingsRoutes(app, { authenticateJWT, requireAdmin, audit }) {
  const route = (method, path, handler) => app[method](path, authenticateJWT, requireAdmin, async (req, res) => {
    try { await handler(req, res, app.locals.pool()); }
    catch (error) { console.error(`${method} ${path}`, error.code || error.message); res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể xử lý cấu hình hoặc bản xuất dữ liệu.' }); }
  });
  route('get', '/api/admin/settings', async (req, res, pool) => res.json({ success: true, data: await readSettings(pool), capabilities: { persistent_settings: !!(await columnsFor(pool, 'system_settings')).settings_json } }));
  route('put', '/api/admin/settings', async (req, res, pool) => {
    if (!(await columnsFor(pool, 'system_settings')).settings_json) return res.status(409).json({ success: false, message: 'Lưu cấu hình bền vững cần migration 20261010 được phê duyệt và áp dụng. Chưa có cấu hình nào được thay đổi.' });
    const settings = { ...await readSettings(pool) };
    for (const [key, value] of Object.entries(req.body)) {
      if (!Object.hasOwn(DEFAULTS, key)) continue;
      const type = typeof DEFAULTS[key];
      if (typeof value !== type || (type === 'number' && (!Number.isFinite(value) || value <= 0 || value > 1000)) || (type === 'string' && value.length > 255)) return res.status(400).json({ success: false, message: `Cấu hình ${key} không hợp lệ.` });
      settings[key] = value;
    }
    await pool.execute('INSERT INTO system_settings (id, settings_json) VALUES (1, ?) ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json)', [JSON.stringify(settings)]);
    audit({ action: 'SYSTEM_SETTINGS_UPDATED', module: 'Settings', page: '/admin/settings', resourceType: 'settings', resourceId: 1, description: 'Đã lưu cấu hình hệ thống', req });
    res.json({ success: true, data: settings });
  });
  route('get', '/api/admin/export', async (req, res, pool) => {
    const data = await inTransaction(pool, async connection => {
      const keys = { users: 'users', healthRecords: 'health_records', goals: 'goals', reminders: 'reminders', devices: 'connected_devices', aiHistory: 'ai_diagnoses', auditLogs: 'audit_logs' };
      const result = {};
      for (const [key, table] of Object.entries(keys)) {
        const [rows] = await connection.query(`SELECT * FROM ${table}`);
        result[key] = table === 'users' ? rows.map(({ password, ...user }) => user) : rows;
      }
      result.settings = await readSettings(connection);
      return result;
    });
    res.json({ success: true, data: { ...data, timestamp: new Date().toISOString(), source: 'mysql', format: 'application-data-export', limitations: 'Không chứa mật khẩu, schema hoặc secrets; không thay thế bản backup MySQL có thể phục hồi đầy đủ.' } });
  });
}
