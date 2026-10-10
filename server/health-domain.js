export const METRIC_LIMITS = {
  weight: [10, 400], systolic: [50, 260], diastolic: [30, 180], heart_rate: [30, 240],
};
export const GOAL_METRICS = { weight: 'weight', blood_pressure: 'systolic', heart_rate: 'heart_rate' };
export const DEVICE_TYPES = ['blood_pressure_monitor', 'smartwatch', 'smart_scale', 'pulse_oximeter', 'glucose_meter'];
export function validMetric(field, value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return false;
  const n = Number(value), limits = METRIC_LIMITS[field];
  return !!limits && Number.isFinite(n) && n >= limits[0] && n <= limits[1];
}
export function progress(goal) {
  const { start_value: start, current_value: current, target_value: target } = goal;
  if ([start, current, target].some(v => v === null || v === undefined || v === '' || !Number.isFinite(Number(v)))) return 0;
  if (Number(start) === Number(target)) return Number(current) === Number(target) ? 100 : 0;
  return Math.round(Math.min(100, Math.max(0, (Number(current) - Number(start)) / (Number(target) - Number(start)) * 100)));
}
export function validateRecord(body, { partial = false, nullable = false, now = Date.now() } = {}) {
  const data = {};
  for (const field of Object.keys(METRIC_LIMITS)) {
    if (partial && body[field] === undefined) continue;
    const value = body[field];
    if (nullable && (value === null || value === '' || value === undefined)) { data[field] = null; continue; }
    if (!validMetric(field, value)) throw Object.assign(new Error(`${field}: cần số đo hợp lệ (${METRIC_LIMITS[field].join('–')}). ${!nullable ? 'Schema hiện tại yêu cầu đủ 4 chỉ số.' : ''}`), { status: 400 });
    data[field] = field === 'weight' ? Math.round(Number(value) * 10) / 10 : Math.round(Number(value));
  }
  if (!partial && Object.keys(METRIC_LIMITS).every(k => data[k] == null)) throw Object.assign(new Error('Nhập ít nhất một chỉ số đã đo.'), { status: 400 });
  if (!partial || body.recorded_at !== undefined) {
    const time = body.recorded_at === undefined ? new Date(now) : new Date(body.recorded_at);
    const raw = body.recorded_at;
    const calendarDay = typeof raw === 'string' ? raw.slice(0, 10) : null;
    const day = new Date(`${calendarDay}T00:00:00Z`);
    const validDay = calendarDay && /^\d{4}-\d{2}-\d{2}$/.test(calendarDay) && Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === calendarDay;
    if (raw !== undefined && (typeof raw !== 'string' || !validDay) || !Number.isFinite(time.getTime()) || time.getTime() > now + 1000) throw Object.assign(new Error('Thời điểm đo không hợp lệ hoặc nằm trong tương lai.'), { status: 400 });
    data.recorded_at = time.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (body.notes !== undefined) {
    if (body.notes !== null && typeof body.notes !== 'string') throw Object.assign(new Error('Ghi chú phải là văn bản.'), { status: 400 });
    if ((body.notes?.length ?? 0) > 10000) throw Object.assign(new Error('Ghi chú tối đa 10.000 ký tự.'), { status: 400 });
    data.notes = body.notes ?? '';
  }
  return data;
}
const columnCache = new WeakMap();
export async function columnsFor(pool, table) {
  let cache = columnCache.get(pool);
  if (!cache) { cache = new Map(); columnCache.set(pool, cache); }
  const existing = cache.get(table);
  if (existing && Date.now() - existing.time < 60000) return existing.columns;
  const [rows] = await pool.query('SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]);
  const columns = Object.fromEntries(rows.map(r => [r.COLUMN_NAME, r.IS_NULLABLE]));
  cache.set(table, { time: Date.now(), columns });
  return columns;
}
export async function healthCapabilities(pool) {
  const cols = await columnsFor(pool, 'health_records');
  return { partial_records: Object.keys(METRIC_LIMITS).every(k => cols[k] === 'YES'), updated_at: !!cols.updated_at };
}
export async function insertUserWithoutGuessedBiometrics(pool, fields, values) {
  const cols = await columnsFor(pool, 'users');
  const optional = ['height_cm', 'base_weight_kg', 'target_weight_kg'].filter(field => Object.hasOwn(cols, field) && !fields.includes(field));
  const all = [...fields, ...optional];
  return pool.execute(`INSERT INTO users (${all.join(', ')}) VALUES (${all.map(() => '?').join(', ')})`, [...values, ...optional.map(() => null)]);
}
export async function loadHealthSnapshot(pool, userId) {
  const conditions = {
    weight: 'weight BETWEEN 10 AND 400',
    blood_pressure: 'systolic BETWEEN 50 AND 260 AND diastolic BETWEEN 30 AND 180',
    systolic: 'systolic BETWEEN 50 AND 260',
    diastolic: 'diastolic BETWEEN 30 AND 180',
    heart_rate: 'heart_rate BETWEEN 30 AND 240',
    record: '(weight BETWEEN 10 AND 400 OR systolic BETWEEN 50 AND 260 OR diastolic BETWEEN 30 AND 180 OR heart_rate BETWEEN 30 AND 240)',
  };
  const entries = await Promise.all(Object.entries(conditions).map(async ([key, condition]) => {
    const [rows] = await pool.query(`SELECT * FROM health_records WHERE user_id = ? AND recorded_at <= UTC_TIMESTAMP() AND ${condition} ORDER BY recorded_at DESC, id DESC LIMIT 2`, [userId]);
    return [key, rows];
  }));
  const rows = Object.fromEntries(entries), current = {};
  for (const [type, field] of Object.entries({ ...GOAL_METRICS, systolic: 'systolic', diastolic: 'diastolic' })) {
    const r = rows[type][0];
    current[type] = r ? { value: Number(r[field]), ...(type === 'blood_pressure' ? { diastolic: Number(r.diastolic) } : {}), record_id: r.id, recorded_at: r.recorded_at, updated_at: r.updated_at ?? null } : null;
  }
  return { latest: rows.record[0] ?? null, previous: rows.record[1] ?? null, current, previous_by_metric: Object.fromEntries(Object.entries(GOAL_METRICS).map(([type, field]) => [type, rows[type][1] ? Number(rows[type][1][field]) : null])) };
}
export function goalWithCurrent(goal, snapshot) {
  if (!GOAL_METRICS[goal.metric_type]) return { ...goal, current_available: true, progress_percentage: progress(goal) };
  const metric = currentGoalMetric(snapshot, goal.metric_type);
  const result = { ...goal, current_value: metric?.value ?? null, current_available: !!metric, current_recorded_at: metric?.recorded_at ?? null };
  return { ...result, progress_percentage: progress(result) };
}
export function currentGoalMetric(snapshot, type) {
  return type === 'blood_pressure' ? snapshot.current.systolic ?? snapshot.current.blood_pressure : snapshot.current[type];
}
export async function syncGoals(pool, userId) {
  const snapshot = await loadHealthSnapshot(pool, userId);
  const [goals] = await pool.query('SELECT * FROM goals WHERE user_id = ?', [userId]);
  for (const goal of goals) {
    const metric = currentGoalMetric(snapshot, goal.metric_type);
    if (!metric) continue; // Keep the stored historical value; reads explicitly mark it unavailable.
    const status = goal.status === 'completed' || progress({ ...goal, current_value: metric.value }) === 100 ? 'completed' : 'in_progress';
    await pool.execute('UPDATE goals SET current_value = ?, status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?', [metric.value, status, goal.id, userId]);
  }
  return snapshot;
}
export async function inTransaction(pool, callback, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Serialize mutations for one user, including backdated measurements and goals.
    if (userId != null) await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
    const value = await callback(connection);
    await connection.commit();
    return value;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}
export function riskCategory(record) {
  if (!validMetric('systolic', record.systolic) || !validMetric('diastolic', record.diastolic)) return 'unknown';
  if (record.systolic > 180 || record.diastolic > 120) return 'crisis';
  if (record.systolic >= 140 || record.diastolic >= 90) return 'stage2';
  if (record.systolic >= 130 || record.diastolic >= 80) return 'stage1';
  if (record.systolic >= 120) return 'elevated';
  return 'normal';
}
