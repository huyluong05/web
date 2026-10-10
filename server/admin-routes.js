import { healthCapabilities, validateRecord, syncGoals, inTransaction, riskCategory, validMetric } from './health-domain.js';
import { formatDiagnosis } from './ai-routes.js';
export function registerAdminRoutes(app, { authenticateJWT, requireAdmin, audit, sessions, revokedSessions }) {
  const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
  const route = (method, path, handler) => app[method](path, authenticateJWT, requireAdmin, async (req, res) => {
    try { await handler(req, res, app.locals.pool()); }
    catch (error) { console.error(`${method} ${path}`, error.code || error.message); res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể xử lý yêu cầu quản trị. Vui lòng thử lại.' }); }
  });
  const log = (req, action, type, id) => audit({ action, module: 'Admin', page: req.path, resourceType: type, resourceId: id, description: `${req.user.full_name}: ${action} #${id}`, req });
  route('get', '/api/admin/telemetry', async (req, res, pool) => {
    let sql = 'SELECT h.*, u.full_name AS user_name, u.email AS user_email FROM health_records h JOIN users u ON u.id = h.user_id WHERE 1=1', params = [];
    if (req.query.userId) { sql += ' AND h.user_id = ?'; params.push(req.query.userId); }
    if (req.query.search) { sql += ' AND (u.full_name LIKE ? OR u.email LIKE ?)'; params.push(`%${req.query.search}%`, `%${req.query.search}%`); }
    for (const [key, operator] of [['startDate', '>='], ['endDate', '<']]) if (req.query[key]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query[key])) fail(400, 'Ngày lọc không hợp lệ.');
      sql += ` AND h.recorded_at ${operator} ${key === 'endDate' ? 'DATE_ADD(?, INTERVAL 1 DAY)' : '?'}`; params.push(req.query[key]);
    }
    const [rows] = await pool.query(sql + ' ORDER BY h.recorded_at DESC, h.id DESC', params);
    const mapped = rows.map(r => ({ ...r, riskCategory: riskCategory(r) }));
    res.json({ success: true, data: req.query.riskCategory && req.query.riskCategory !== 'all' ? mapped.filter(r => r.riskCategory === req.query.riskCategory) : mapped });
  });
  route('put', '/api/admin/telemetry/:id', async (req, res, pool) => {
    const caps = await healthCapabilities(pool), data = validateRecord(req.body, { partial: true, nullable: caps.partial_records });
    if (req.body.doctor_reviewed !== undefined) { if (typeof req.body.doctor_reviewed !== 'boolean') fail(400, 'Trạng thái đánh giá không hợp lệ.'); data.doctor_reviewed = req.body.doctor_reviewed ? 1 : 0; }
    if (req.body.doctor_notes !== undefined) { if (typeof req.body.doctor_notes !== 'string' || req.body.doctor_notes.length > 10000) fail(400, 'Ghi chú không hợp lệ.'); data.doctor_notes = req.body.doctor_notes; }
    const [owners] = await pool.query('SELECT * FROM health_records WHERE id = ?', [req.params.id]);
    if (!owners[0]) fail(404, 'Không tìm thấy bản ghi.');
    const merged = { ...owners[0], ...data };
    if (!['weight', 'systolic', 'diastolic', 'heart_rate'].some(field => validMetric(field, merged[field]))) fail(400, 'Bản ghi cần có ít nhất một chỉ số hợp lệ.');
    const record = await inTransaction(pool, async connection => {
      const fields = Object.keys(data);
      if (fields.length) await connection.execute(`UPDATE health_records SET ${fields.map(k => `${k} = ?`).join(', ')}${caps.updated_at ? ', updated_at = UTC_TIMESTAMP()' : ''} WHERE id = ?`, [...Object.values(data), req.params.id]);
      await syncGoals(connection, owners[0].user_id);
      const [rows] = await connection.query('SELECT * FROM health_records WHERE id = ?', [req.params.id]);
      return rows[0];
    }, owners[0].user_id);
    log(req, 'ADMIN_HEALTH_RECORD_UPDATED', 'health_record', req.params.id);
    res.json({ success: true, data: record });
  });
  route('delete', '/api/admin/telemetry/:id', async (req, res, pool) => {
    const [rows] = await pool.query('SELECT * FROM health_records WHERE id = ?', [req.params.id]);
    if (!rows[0]) fail(404, 'Không tìm thấy bản ghi.');
    await inTransaction(pool, async connection => { await connection.execute('DELETE FROM health_records WHERE id = ?', [req.params.id]); await syncGoals(connection, rows[0].user_id); }, rows[0].user_id);
    log(req, 'ADMIN_HEALTH_RECORD_DELETED', 'health_record', req.params.id);
    res.json({ success: true });
  });
  route('get', '/api/admin/ai-reviews', async (req, res, pool) => {
    let sql = 'SELECT a.*, u.full_name AS user_name, u.email AS user_email FROM ai_diagnoses a JOIN users u ON u.id = a.user_id WHERE 1=1', params = [];
    if (req.query.riskLevel && req.query.riskLevel !== 'all') { sql += ' AND a.risk_level = ?'; params.push(req.query.riskLevel === 'medium' ? 'moderate' : req.query.riskLevel); }
    if (req.query.search) { sql += ' AND (u.full_name LIKE ? OR u.email LIKE ?)'; params.push(`%${req.query.search}%`, `%${req.query.search}%`); }
    const [rows] = await pool.query(sql + ' ORDER BY a.created_at DESC', params);
    res.json({ success: true, data: rows.map(formatDiagnosis) });
  });
  route('put', '/api/admin/ai-reviews/:id', async (req, res, pool) => {
    if (typeof req.body.physician_reviewed !== 'boolean' || typeof req.body.physician_notes !== 'string' || req.body.physician_notes.length > 10000) fail(400, 'Nội dung thẩm định không hợp lệ.');
    const [rows] = await pool.query('SELECT * FROM ai_diagnoses WHERE id = ?', [req.params.id]);
    if (!rows[0]) fail(404, 'Không tìm thấy phân tích.');
    await pool.execute('UPDATE ai_diagnoses SET physician_reviewed = ?, physician_notes = ? WHERE id = ?', [req.body.physician_reviewed ? 1 : 0, req.body.physician_notes, req.params.id]);
    log(req, 'AI_ANALYSIS_REVIEWED', 'ai_diagnosis', req.params.id);
    res.json({ success: true, data: formatDiagnosis({ ...rows[0], ...req.body }) });
  });
  route('delete', '/api/admin/devices/:deviceId', async (req, res, pool) => {
    const [result] = await pool.execute('DELETE FROM connected_devices WHERE id = ?', [req.params.deviceId]);
    if (!result.affectedRows) fail(404, 'Không tìm thấy thiết bị.');
    log(req, 'DEVICE_REMOVED', 'device', req.params.deviceId);
    res.json({ success: true });
  });
  const auditRows = async (pool, query, limit, offset = 0) => {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1', params = [];
    const columns = { action: 'action', module: 'module', role: 'user_role', status: 'status', resourceType: 'resource_type' };
    for (const [key, col] of Object.entries(columns)) if (query[key] && query[key] !== 'all') { sql += ` AND ${col} = ?`; params.push(query[key]); }
    if (query.search) { sql += ' AND (description LIKE ? OR user_name LIKE ?)'; params.push(`%${query.search}%`, `%${query.search}%`); }
    for (const [key, op] of [['startDate', '>='], ['endDate', '<']]) if (query[key]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(query[key])) fail(400, 'Ngày lọc không hợp lệ.');
      sql += ` AND created_at ${op} ${key === 'endDate' ? 'DATE_ADD(?, INTERVAL 1 DAY)' : '?'}`; params.push(query[key]);
    }
    const [[counts]] = await pool.query(sql.replace('SELECT *', "SELECT COUNT(*) AS total, SUM(status = 'SUCCESS') AS totalSuccess, SUM(status = 'FAILED') AS totalFailed"), params);
    const [rows] = await pool.query(sql + ` ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`, params);
    return { rows: rows.map(r => ({ ...r, metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata })), total: Number(counts.total ?? counts.count), totalSuccess: Number(counts.totalSuccess ?? 0), totalFailed: Number(counts.totalFailed ?? 0) };
  };
  route('get', '/api/admin/audit-logs', async (req, res, pool) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1), limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const result = await auditRows(pool, req.query, limit, (page - 1) * limit);
    const [filters] = await pool.query('SELECT DISTINCT module, action, user_role, resource_type FROM audit_logs');
    const distinct = key => [...new Set(filters.map(r => r[key]).filter(Boolean))];
    res.json({ success: true, data: { logs: result.rows, pagination: { page, limit, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / limit)) }, stats: { total: result.total, totalSuccess: result.totalSuccess, totalFailed: result.totalFailed, totalWarning: 0 }, filters: { availableModules: distinct('module'), availableActions: distinct('action'), availableRoles: distinct('user_role'), availableResourceTypes: distinct('resource_type') } } });
  });
  route('get', '/api/admin/audit-logs/:id', async (req, res, pool) => {
    const [rows] = await pool.query('SELECT * FROM audit_logs WHERE id = ?', [req.params.id]);
    if (!rows[0]) fail(404, 'Không tìm thấy nhật ký.');
    res.json({ success: true, data: rows[0] });
  });
  route('get', '/api/admin/logs', async (req, res, pool) => {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const { rows, total } = await auditRows(pool, { ...req.query, status: req.query.status === 'danger' ? 'FAILED' : req.query.status === 'success' ? 'SUCCESS' : req.query.status }, limit);
    res.json({ success: true, data: { total, logs: rows.map(r => ({ ...r, status: r.status === 'SUCCESS' ? 'success' : 'danger', details: r.description, timestamp: r.created_at })) } });
  });
  route('get', '/api/admin/sessions', async (req, res) => {
    const rows = [...sessions.values()].filter(s => Date.now() - new Date(s.lastActivityAt).getTime() < 2 * 3600000);
    res.json({ success: true, data: { sessions: rows, activeCount: rows.length, scope: 'current-server-process' } });
  });
  route('delete', '/api/admin/sessions/:id', async (req, res) => {
    if (!sessions.has(req.params.id)) fail(404, 'Không tìm thấy phiên trên máy chủ hiện tại.');
    sessions.delete(req.params.id); revokedSessions.add(req.params.id);
    log(req, 'SESSION_TERMINATED', 'session', req.params.id);
    res.json({ success: true, message: 'Đã kết thúc phiên trên tiến trình máy chủ này.' });
  });
}
