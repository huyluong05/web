import { columnsFor, inTransaction } from './health-domain.js';
import { REMINDER_TYPES, occurrence, jsonArray } from '../src/utils/reminders.js';
export function registerReminderRoutes(app, { authenticateJWT, audit }) {
  const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
  const route = (method, path, handler) => app[method](path, authenticateJWT, async (req, res) => {
    try { await handler(req, res, app.locals.pool()); }
    catch (error) { console.error(`${method} ${path}`, error.code || error.message); res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể xử lý lịch nhắc. Vui lòng thử lại.' }); }
  });
  const capabilities = async pool => {
    const cols = await columnsFor(pool, 'reminders');
    return { scheduling: !!cols.timezone && !!cols.repeat_days && !!cols.completed_dates };
  };
  const validate = (b, partial, extended) => {
    const data = {};
    if (!partial || b.type !== undefined) { if (!Object.hasOwn(REMINDER_TYPES, b.type)) fail(400, 'Loại nhắc nhở không hợp lệ.'); data.type = b.type; }
    if (!partial || b.title !== undefined) { if (typeof b.title !== 'string' || !b.title.trim() || b.title.length > 150) fail(400, 'Nội dung nhắc cần từ 1 đến 150 ký tự.'); data.title = b.title.trim(); }
    if (!partial || b.time_of_day !== undefined) { if (!/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(b.time_of_day)) fail(400, 'Giờ nhắc cần có định dạng HH:mm.'); data.time_of_day = b.time_of_day.slice(0, 5); }
    if (b.is_active !== undefined) { if (typeof b.is_active !== 'boolean') fail(400, 'Trạng thái bật/tắt không hợp lệ.'); data.is_active = b.is_active ? 1 : 0; }
    if (b.timezone !== undefined || b.repeat_days !== undefined) {
      if (!extended) fail(409, 'Lịch tùy chỉnh cần migration 20261010 được quản trị viên phê duyệt và áp dụng. Lịch hàng ngày hiện tại vẫn hoạt động.');
      if (b.timezone !== undefined) { try { new Intl.DateTimeFormat('vi', { timeZone: b.timezone }).format(); } catch { fail(400, 'Múi giờ không hợp lệ.'); } data.timezone = b.timezone; }
      if (b.repeat_days !== undefined) { if (!Array.isArray(b.repeat_days) || !b.repeat_days.length || b.repeat_days.some(v => !Number.isInteger(v) || v < 0 || v > 6)) fail(400, 'Chọn ít nhất một ngày trong tuần.'); data.repeat_days = JSON.stringify([...new Set(b.repeat_days)]); }
    }
    return data;
  };
  const log = (req, action, id) => audit({ action, module: 'Reminders', page: '/reminders', resourceType: 'reminder', resourceId: id, description: `${req.user.full_name}: ${action} #${id}`, req });
  route('get', '/api/reminders', async (req, res, pool) => {
    const [rows] = await pool.query('SELECT * FROM reminders WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, data: rows.map(r => ({ ...r, is_active: !!r.is_active })), capabilities: await capabilities(pool) });
  });
  route('post', '/api/reminders', async (req, res, pool) => {
    const caps = await capabilities(pool), data = validate(req.body, false, caps.scheduling);
    const fields = ['user_id', ...Object.keys(data), ...(data.is_active === undefined ? ['is_active'] : [])];
    let result;
    try { [result] = await pool.execute(`INSERT INTO reminders (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, [req.user.id, ...Object.values(data), ...(data.is_active === undefined ? [1] : [])]); }
    catch (error) { if (error.code === 'WARN_DATA_TRUNCATED' || error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') fail(409, 'Schema nhắc nhở cũ chưa hỗ trợ loại này. Cần phê duyệt migration trước.'); throw error; }
    const [rows] = await pool.query('SELECT * FROM reminders WHERE id = ?', [result.insertId]);
    log(req, 'REMINDER_CREATED', result.insertId);
    res.status(201).json({ success: true, data: { ...rows[0], is_active: !!rows[0].is_active } });
  });
  route('put', '/api/reminders/:id', async (req, res, pool) => {
    const caps = await capabilities(pool), data = validate(req.body, true, caps.scheduling);
    if (req.body.complete !== undefined && typeof req.body.complete !== 'boolean') fail(400, 'Trạng thái hoàn thành không hợp lệ.');
    if (req.body.complete !== undefined && !caps.scheduling) fail(409, 'Lưu trạng thái hoàn thành cần migration 20261010 được phê duyệt và áp dụng.');
    const updated = await inTransaction(pool, async connection => {
      const [rows] = await connection.query('SELECT * FROM reminders WHERE id = ? AND user_id = ? FOR UPDATE', [req.params.id, req.user.id]);
      const r = rows[0]; if (!r) fail(404, 'Không tìm thấy nhắc nhở.');
      if (req.body.complete !== undefined) {
        let fallbackZone = req.body.occurrence_timezone;
        if (!r.timezone && !fallbackZone) fail(400, 'Cần múi giờ trình duyệt để hoàn thành lịch cũ.');
        const slot = occurrence(r, new Date(), fallbackZone);
        if (['disabled', 'unscheduled', 'invalid'].includes(slot.status)) fail(400, 'Lịch nhắc này không hoạt động hôm nay.');
        const dates = jsonArray(r.completed_dates).filter(d => d !== slot.date);
        if (req.body.complete) dates.push(slot.date);
        data.completed_dates = JSON.stringify(dates.sort().slice(-400));
      }
      if (Object.keys(data).length) await connection.execute(`UPDATE reminders SET ${Object.keys(data).map(k => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`, [...Object.values(data), r.id, req.user.id]);
      const [result] = await connection.query('SELECT * FROM reminders WHERE id = ?', [r.id]);
      return result[0];
    });
    log(req, req.body.complete ? 'REMINDER_COMPLETED' : 'REMINDER_UPDATED', updated.id);
    res.json({ success: true, data: { ...updated, is_active: !!updated.is_active } });
  });
  route('delete', '/api/reminders/:id', async (req, res, pool) => {
    const [result] = await pool.execute('DELETE FROM reminders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!result.affectedRows) fail(404, 'Không tìm thấy nhắc nhở.');
    log(req, 'REMINDER_DELETED', req.params.id);
    res.json({ success: true, message: 'Đã xóa nhắc nhở.' });
  });
}
