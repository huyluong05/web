// Isolated SQL double for HTTP regression tests. Never connects to MySQL.
// It intentionally rejects unsupported SQL, and is NOT evidence of Aiven compatibility.
import bcrypt from 'bcryptjs';
import { riskCategory } from '../../server/health-domain.js';
const utcValue = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(' ', 'T') + 'Z' : value;
export class MemoryPool {
  constructor({ modern = true } = {}) {
    this.modern = modern;
    this.tables = { users: [
      { id: 1, full_name: 'QA User', email: 'qa@example.test', password: bcrypt.hashSync('Password123!', 4), role: 'user', is_active: 1, base_weight_kg: 70, target_weight_kg: 65, height_cm: 170 },
      { id: 2, full_name: 'QA Admin', email: 'admin@example.test', password: bcrypt.hashSync('Password123!', 4), role: 'admin', is_active: 1 },
      { id: 3, full_name: 'Other User', email: 'other@example.test', password: bcrypt.hashSync('Password123!', 4), role: 'user', is_active: 1 },
    ], health_records: [], goals: [], reminders: [], connected_devices: [], ai_diagnoses: [], audit_logs: [], system_settings: [{ id: 1 }] };
    this.calls = [];
  }
  async getConnection() { return this; }
  async beginTransaction() { this.backup = structuredClone(this.tables); }
  async commit() { this.backup = null; }
  async rollback() { if (this.backup) this.tables = this.backup; this.backup = null; }
  release() {}
  async execute(sql, params) { return this.query(sql, params); }
  async query(raw, params = []) {
    const sql = raw.replace(/\s+/g, ' ').trim();
    this.calls.push({ sql, params: [...params] });
    if (this.fail || this.failPattern?.test(sql)) throw Object.assign(new Error('Simulated database unavailable'), { code: 'ECONNREFUSED' });
    if (sql.includes("SUM(category = 'crisis')")) {
      const counts = { crisis: 0, stage2: 0, stage1: 0, elevated: 0, normal: 0 };
      for (const row of this.tables.health_records) if (new Date(row.recorded_at).getTime() <= Date.now()) { const category = riskCategory(row); if (category in counts) counts[category]++; }
      return [[counts]];
    }
    if (/INFORMATION_SCHEMA.COLUMNS/.test(sql)) {
      const table = params[0];
      const columns = table === 'health_records' ? { weight: this.modern ? 'YES' : 'NO', systolic: this.modern ? 'YES' : 'NO', diastolic: this.modern ? 'YES' : 'NO', heart_rate: this.modern ? 'YES' : 'NO', ...(this.modern ? { updated_at: 'YES' } : {}) } : table === 'reminders' ? this.modern ? { timezone: 'YES', repeat_days: 'YES', completed_dates: 'YES' } : {} : table === 'system_settings' ? this.modern ? { settings_json: 'YES' } : {} : { height_cm: 'YES', base_weight_kg: 'YES', target_weight_kg: 'YES' };
      return [Object.entries(columns).map(([COLUMN_NAME, IS_NULLABLE]) => ({ COLUMN_NAME, IS_NULLABLE }))];
    }
    const table = sql.includes('FROM users u') ? 'users' : sql.match(/(?:FROM|INTO|UPDATE) ([a-z_]+)/i)?.[1];
    if (!this.tables[table]) throw new Error(`Unsupported test SQL: ${sql}`);
    if (sql.startsWith('INSERT')) {
      const match = sql.match(/INSERT INTO [a-z_]+ \(([^)]+)\) VALUES \(([^)]+)\)/);
      if (!match) throw new Error(`Unsupported insert: ${sql}`);
      let index = 0;
      const value = token => token === '?' ? params[index++] : /NOW|UTC_TIMESTAMP/.test(token) ? new Date().toISOString() : token === 'NULL' ? null : Number(token);
      const cols = match[1].split(',').map(s => s.trim()), values = match[2].split(',').map(s => value(s.trim()));
      const row = Object.fromEntries(cols.map((key, i) => [key, values[i]]));
      for (const field of ['recorded_at', 'created_at', 'updated_at', 'last_sync_time']) if (row[field]) row[field] = utcValue(row[field]);
      row.id ??= Math.max(0, ...this.tables[table].map(r => Number(r.id) || 0)) + 1;
      row.created_at ??= new Date().toISOString();
      row.updated_at ??= null;
      const existing = /ON DUPLICATE KEY/.test(sql) ? this.tables[table].find(r => r.id === row.id) : null;
      if (existing) Object.assign(existing, row); else this.tables[table].push(row);
      return [{ insertId: row.id, affectedRows: 1 }];
    }
    let paramOffset = 0;
    if (sql.startsWith('UPDATE')) paramOffset = (sql.split(' WHERE ')[0].match(/\?/g) || []).length;
    const where = sql.split(' WHERE ')[1]?.split(' ORDER BY ')[0] ?? '';
    const matches = row => {
      let idx = paramOffset;
      for (const m of where.matchAll(/(?<![\w.])(?:[hua]\.)?([a-z_]+) (=|!=|>=|<=|<) (\?|DATE_ADD\(\?, INTERVAL 1 DAY\))/g)) {
        const [_, field, op, expr] = m, v = params[idx++];
        if (op === '=' && String(row[field]) !== String(v)) return false;
        if (op === '!=' && String(row[field]) === String(v)) return false;
        if (['>=', '<=', '<'].includes(op)) {
          const a = new Date(utcValue(row[field])).getTime(), b = new Date(utcValue(v)).getTime() + (expr.startsWith('DATE_ADD') ? 86400000 : 0);
          if (op === '>=' ? a < b : op === '<=' ? a > b : a >= b) return false;
        }
      }
      if (/recorded_at <= UTC_TIMESTAMP/.test(sql) && new Date(row.recorded_at).getTime() > Date.now()) return false;
      const checks = [...where.matchAll(/(weight|systolic|diastolic|heart_rate) BETWEEN (\d+) AND (\d+)/g)].map(m => row[m[1]] != null && Number(row[m[1]]) >= Number(m[2]) && Number(row[m[1]]) <= Number(m[3]));
      if (checks.length && (where.includes(' OR ') ? !checks.some(Boolean) : !checks.every(Boolean))) return false;
      return true;
    };
    const rows = this.tables[table].filter(matches);
    if (sql.startsWith('UPDATE')) {
      const assignments = sql.split(' SET ')[1].split(' WHERE ')[0].split(',').map(s => s.trim());
      for (const row of rows) {
        let idx = 0;
        for (const assignment of assignments) {
          const [key, expr] = assignment.split(' = ');
          row[key] = expr === '?' ? params[idx++] : new Date().toISOString();
          if (['recorded_at', 'created_at', 'updated_at', 'last_sync_time'].includes(key)) row[key] = utcValue(row[key]);
        }
      }
      return [{ affectedRows: rows.length }];
    }
    if (sql.startsWith('DELETE')) { this.tables[table] = this.tables[table].filter(r => !rows.includes(r)); return [{ affectedRows: rows.length }]; }
    if (!sql.startsWith('SELECT')) throw new Error(`Unsupported SQL: ${sql}`);
    if (/^SELECT COUNT\(\*\)/.test(sql)) return [[{ count: rows.length, total: rows.length, totalSuccess: rows.filter(r => r.status === 'SUCCESS').length, totalFailed: rows.filter(r => r.status === 'FAILED').length }]];
    let sorted = [...rows];
    if (sql.includes('FROM users u')) sorted = sorted.map(({ id, full_name, email, role, is_active, created_at }) => ({ id, full_name, email, role, is_active, created_at, records_count: this.tables.health_records.filter(r => r.user_id === id).length, goals_count: this.tables.goals.filter(g => g.user_id === id).length }));
    if (/ORDER BY/.test(sql)) {
      const descending = /ORDER BY (?:[a-z]\.)?(recorded_at|created_at) DESC/.test(sql), dateField = /ORDER BY (?:[a-z]\.)?recorded_at/.test(sql) ? 'recorded_at' : 'created_at';
      sorted.sort((a, b) => (new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime() || Number(a.id) - Number(b.id)) * (descending ? -1 : 1));
    }
    if (/JOIN users/.test(sql)) sorted = sorted.map(row => { const u = this.tables.users.find(u => u.id === row.user_id); return { ...row, user_name: u?.full_name, user_email: u?.email }; });
    const limit = sql.match(/LIMIT (\d+)/)?.[1];
    if (limit) { const offset = Number(sql.match(/OFFSET (\d+)/)?.[1] ?? 0); sorted = sorted.slice(offset, offset + Number(limit)); }
    return [structuredClone(sorted)];
  }
}
