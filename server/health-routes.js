import { GOAL_METRICS, METRIC_LIMITS, healthCapabilities, validateRecord, loadHealthSnapshot, syncGoals, goalWithCurrent, currentGoalMetric, inTransaction, progress } from './health-domain.js';

export function registerHealthRoutes(app, { authenticateJWT, audit }) {
  const route = (method, path, handler) => app[method](path, authenticateJWT, async (req, res) => {
    try { await handler(req, res, app.locals.pool()); }
    catch (error) {
      console.error(`${method.toUpperCase()} ${path}:`, error.code || error.message);
      res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể xử lý dữ liệu sức khỏe. Vui lòng thử lại.' });
    }
  });
  const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
  const log = (req, action, resourceType, id) => audit({ action, module: resourceType === 'goal' ? 'Goals' : 'Health Metrics', page: resourceType === 'goal' ? '/goals' : '/health', resourceType, resourceId: id, description: `${req.user.full_name}: ${action} #${id}`, req });

  route('get', '/api/health', async (req, res, pool) => {
    let sql = 'SELECT * FROM health_records WHERE user_id = ?', params = [req.user.id];
    if (req.query.range && req.query.range !== 'all') {
      const days = { '7d': 7, '30d': 30, '3m': 90 }[req.query.range];
      if (!days) fail(400, 'Khoảng thời gian không hợp lệ.');
      sql += ' AND recorded_at >= ?'; params.push(new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace('T', ' '));
    }
    const [rows] = await pool.query(sql + ' ORDER BY recorded_at ASC, id ASC', params);
    res.json({ success: true, data: rows, capabilities: await healthCapabilities(pool) });
  });
  route('get', '/api/health/latest', async (req, res, pool) => {
    res.json({ success: true, data: { ...await loadHealthSnapshot(pool, req.user.id), capabilities: await healthCapabilities(pool) } });
  });
  route('post', '/api/health', async (req, res, pool) => {
    const capabilities = await healthCapabilities(pool);
    const data = validateRecord(req.body, { nullable: capabilities.partial_records });
    const record = await inTransaction(pool, async connection => {
      const [result] = await connection.execute('INSERT INTO health_records (user_id, weight, systolic, diastolic, heart_rate, recorded_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.user.id, data.weight, data.systolic, data.diastolic, data.heart_rate, data.recorded_at, data.notes ?? '']);
      await syncGoals(connection, req.user.id);
      const [rows] = await connection.query('SELECT * FROM health_records WHERE id = ?', [result.insertId]);
      return rows[0];
    }, req.user.id);
    log(req, 'HEALTH_RECORD_CREATED', 'health_record', record.id);
    res.status(201).json({ success: true, data: record, message: 'Ghi nhận chỉ số sức khỏe thành công!' });
  });
  route('put', '/api/health/:id', async (req, res, pool) => {
    const capabilities = await healthCapabilities(pool);
    const data = validateRecord(req.body, { partial: true, nullable: capabilities.partial_records });
    const record = await inTransaction(pool, async connection => {
      const [rows] = await connection.query('SELECT * FROM health_records WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
      if (!rows[0]) fail(404, 'Không tìm thấy bản ghi sức khỏe.');
      const merged = { ...rows[0], ...data };
      if (Object.keys(METRIC_LIMITS).every(k => merged[k] == null)) fail(400, 'Giữ lại ít nhất một chỉ số đã đo.');
      const fields = Object.keys(data);
      if (fields.length) await connection.execute(`UPDATE health_records SET ${fields.map(k => `${k} = ?`).join(', ')}${capabilities.updated_at ? ', updated_at = UTC_TIMESTAMP()' : ''} WHERE id = ? AND user_id = ?`, [...fields.map(k => data[k]), req.params.id, req.user.id]);
      await syncGoals(connection, req.user.id);
      const [updated] = await connection.query('SELECT * FROM health_records WHERE id = ?', [req.params.id]);
      return updated[0];
    }, req.user.id);
    log(req, 'HEALTH_RECORD_UPDATED', 'health_record', record.id);
    res.json({ success: true, data: record, message: 'Đã cập nhật bản ghi.' });
  });
  route('delete', '/api/health/:id', async (req, res, pool) => {
    await inTransaction(pool, async connection => {
      const [result] = await connection.execute('DELETE FROM health_records WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
      if (!result.affectedRows) fail(404, 'Không tìm thấy bản ghi sức khỏe.');
      await syncGoals(connection, req.user.id);
    }, req.user.id);
    log(req, 'HEALTH_RECORD_DELETED', 'health_record', req.params.id);
    res.json({ success: true, message: 'Đã xóa bản ghi sức khỏe.' });
  });
  route('get', '/api/goals', async (req, res, pool) => {
    const [rows] = await pool.query('SELECT * FROM goals WHERE user_id = ?', [req.user.id]);
    const snapshot = await loadHealthSnapshot(pool, req.user.id);
    res.json({ success: true, data: rows.map(g => goalWithCurrent(g, snapshot)) });
  });
  const number = value => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value));
  route('post', '/api/goals', async (req, res, pool) => {
    const b = req.body, type = b.metric_type ?? 'weight';
    if (!b.title?.trim() || b.title.length > 150 || ![...Object.keys(GOAL_METRICS), 'exercise'].includes(type)) fail(400, 'Tên hoặc loại mục tiêu không hợp lệ.');
    if (!number(b.target_value) || Number(b.target_value) < 0) fail(400, 'Giá trị mục tiêu không hợp lệ.');
    const goal = await inTransaction(pool, async connection => {
      const snapshot = await loadHealthSnapshot(connection, req.user.id), metric = currentGoalMetric(snapshot, type);
      if (GOAL_METRICS[type] && !metric) fail(409, 'Hãy ghi nhận chỉ số sức khỏe trước khi tạo mục tiêu này.');
      const start = b.start_value ?? metric?.value, current = metric?.value ?? b.current_value ?? start;
      if (!number(start) || !number(current) || Number(start) < 0 || Number(current) < 0) fail(400, 'Nhập giá trị bắt đầu và hiện tại hợp lệ.');
      const status = progress({ start_value: start, target_value: b.target_value, current_value: current }) === 100 ? 'completed' : 'in_progress';
      const [result] = await connection.execute('INSERT INTO goals (user_id, title, metric_type, start_value, target_value, current_value, unit, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [req.user.id, b.title.trim(), type, Number(start), Number(b.target_value), Number(current), { weight: 'kg', blood_pressure: 'mmHg', heart_rate: 'bpm', exercise: 'phút' }[type], status]);
      const [rows] = await connection.query('SELECT * FROM goals WHERE id = ?', [result.insertId]);
      return goalWithCurrent(rows[0], snapshot);
    }, req.user.id);
    log(req, 'GOAL_CREATED', 'goal', goal.id);
    res.status(201).json({ success: true, data: goal });
  });
  route('put', '/api/goals/:id', async (req, res, pool) => {
    const b = req.body;
    for (const k of ['current_value', 'target_value']) if (b[k] !== undefined && (!number(b[k]) || Number(b[k]) < 0)) fail(400, 'Giá trị mục tiêu không hợp lệ.');
    if (b.status !== undefined && !['in_progress', 'completed'].includes(b.status)) fail(400, 'Trạng thái mục tiêu không hợp lệ.');
    if (b.title !== undefined && (typeof b.title !== 'string' || !b.title.trim() || b.title.length > 150)) fail(400, 'Tên mục tiêu không hợp lệ.');
    const goal = await inTransaction(pool, async connection => {
      const [rows] = await connection.query('SELECT * FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
      const old = rows[0]; if (!old) fail(404, 'Không tìm thấy mục tiêu.');
      const snapshot = await loadHealthSnapshot(connection, req.user.id), metric = currentGoalMetric(snapshot, old.metric_type);
      if (GOAL_METRICS[old.metric_type] && b.current_value !== undefined && Number(b.current_value) !== metric?.value) fail(409, 'Giá trị hiện tại lấy từ số đo mới nhất. Hãy ghi nhận hoặc chỉnh sửa số đo tại Chỉ số sinh tồn.');
      const current = metric?.value ?? b.current_value ?? old.current_value;
      const status = b.status ?? (old.status === 'completed' || progress({ ...old, target_value: b.target_value ?? old.target_value, current_value: current }) === 100 ? 'completed' : 'in_progress');
      await connection.execute('UPDATE goals SET title = ?, current_value = ?, target_value = ?, status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?', [b.title?.trim() ?? old.title, current, b.target_value ?? old.target_value, status, old.id, req.user.id]);
      const [updated] = await connection.query('SELECT * FROM goals WHERE id = ?', [old.id]);
      return goalWithCurrent(updated[0], snapshot);
    }, req.user.id);
    log(req, 'GOAL_UPDATED', 'goal', goal.id);
    res.json({ success: true, data: goal });
  });
  route('delete', '/api/goals/:id', async (req, res, pool) => {
    const [result] = await pool.execute('DELETE FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!result.affectedRows) fail(404, 'Không tìm thấy mục tiêu.');
    log(req, 'GOAL_DELETED', 'goal', req.params.id);
    res.json({ success: true, message: 'Đã xóa mục tiêu.' });
  });
}
