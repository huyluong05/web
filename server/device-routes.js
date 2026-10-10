import { randomUUID } from 'node:crypto';
import { DEVICE_TYPES, healthCapabilities, validateRecord, syncGoals, inTransaction } from './health-domain.js';
export function registerDeviceWriteRoutes(app, { authenticateJWT, audit }) {
  const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
  const route = (path, handler) => app.post(path, authenticateJWT, async (req, res) => {
    try { await handler(req, res, app.locals.pool()); }
    catch (error) { console.error(`POST ${path}`, error.code || error.message); res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể lưu dữ liệu thiết bị. Vui lòng thử lại.' }); }
  });
  route('/api/devices/pair', async (req, res, pool) => {
    const { name, type, model, macAddress } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.length > 150 || !DEVICE_TYPES.includes(type)) fail(400, 'Tên hoặc loại thiết bị không hợp lệ.');
    if (model != null && (typeof model !== 'string' || model.length > 100)) fail(400, 'Model thiết bị không hợp lệ.');
    if (macAddress && (typeof macAddress !== 'string' || !/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(macAddress))) fail(400, 'MAC gồm 6 cặp ký tự, ví dụ AA:BB:CC:11:22:33; có thể để trống.');
    const id = `dev_${randomUUID()}`, deviceModel = model?.trim() || 'Chưa cung cấp';
    await pool.execute('INSERT INTO connected_devices (id, user_id, name, type, model, battery_level, status, last_sync_time, mac_address, firmware_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, req.user.id, name.trim(), type, deviceModel, null, 'idle', null, macAddress?.toUpperCase() || null, null]);
    audit({ action: 'DEVICE_REGISTERED', module: 'Devices', page: '/devices', resourceType: 'device', resourceId: id, description: 'Đăng ký thông tin thiết bị; chưa ghép nối phần cứng', req });
    res.status(201).json({ success: true, message: 'Đã đăng ký thiết bị. Chưa ghép nối Bluetooth hoặc nhận dữ liệu.', data: { id, user_id: req.user.id, name: name.trim(), type, model: deviceModel, batteryLevel: null, status: 'idle', lastSyncTime: null, macAddress: macAddress || null, firmwareVersion: null } });
  });
  const save = async (req, res, pool, sync) => {
    const deviceId = sync ? req.params.deviceId : req.body.deviceId;
    const caps = await healthCapabilities(pool);
    if (sync && !['weight', 'systolic', 'diastolic', 'heart_rate'].some(k => req.body[k] != null)) fail(409, 'Chưa có kết nối phần cứng cung cấp số đo. Hãy dùng ứng dụng của nhà sản xuất hoặc ghi nhận thủ công. Lưu thiết bị không đồng nghĩa với ghép nối Bluetooth.');
    const data = validateRecord(req.body, { nullable: caps.partial_records });
    const id = await inTransaction(pool, async connection => {
      if (deviceId) {
        const [rows] = await connection.query('SELECT * FROM connected_devices WHERE id = ? AND user_id = ?', [deviceId, req.user.id]);
        if (!rows[0]) fail(404, 'Không tìm thấy thiết bị thuộc tài khoản này.');
      }
      const [result] = await connection.execute('INSERT INTO health_records (user_id, weight, systolic, diastolic, heart_rate, recorded_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.user.id, data.weight, data.systolic, data.diastolic, data.heart_rate, data.recorded_at, data.notes ?? `Số đo gửi qua API thiết bị ${deviceId ?? '(chưa đăng ký thiết bị)'}`]);
      // A received payload confirms data transfer, not an active Bluetooth session.
      if (deviceId) await connection.execute('UPDATE connected_devices SET last_sync_time = UTC_TIMESTAMP() WHERE id = ? AND user_id = ?', [deviceId, req.user.id]);
      await syncGoals(connection, req.user.id);
      return result.insertId;
    }, req.user.id);
    audit({ action: 'DEVICE_DATA_RECEIVED', module: 'Devices', page: '/devices', resourceType: 'health_record', resourceId: id, description: 'Đã lưu số đo từ payload thiết bị', req });
    res.status(sync ? 200 : 201).json({ success: true, data: sync ? { syncedRecordId: id, deviceId } : { id }, message: 'Đã lưu số đo được gửi lên.' });
  };
  route('/api/devices/:deviceId/sync', (req, res, pool) => save(req, res, pool, true));
  route('/api/devices/ingest', (req, res, pool) => save(req, res, pool, false));
}
