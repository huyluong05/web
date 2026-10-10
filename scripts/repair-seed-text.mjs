// Dry run by default. --apply-local requires both loopback and this machine's MySQL hostname.
// Production/Aiven writes are deliberately unavailable in this script.
import mysql from 'mysql2/promise';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { hostname } from 'node:os';
import { createHash } from 'node:crypto';
import { sqlStrings, originalTextIndex, recoverKnownText, recoverAuditActorPrefix, TEXT_FIELDS, identifier, hex, repairSQL } from './lib/text-encoding.mjs';

const args = process.argv.slice(2), apply = args.includes('--apply-local'), rollback = args.indexOf('--rollback-local');
if (args.some((a, i) => !['--apply-local', '--rollback-local'].includes(a) && !(rollback >= 0 && i === rollback + 1))) throw new Error('Unknown argument.');
if (apply && rollback >= 0) throw new Error('Choose apply OR rollback.');
const ca = process.env.MYSQL_SSL_CA?.replace(/\\n/g, '\n');
const pool = mysql.createPool({ host: process.env.MYSQL_HOST || 'localhost', port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER || 'root', password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE || 'vitaltrack_db', charset: 'utf8mb4', dateStrings: true, jsonStrings: true, supportBigNumbers: true, bigNumberStrings: true, connectTimeout: 5000, connectionLimit: 1, ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : process.env.MYSQL_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}) });
let connection, transaction = false;
try {
  connection = await pool.getConnection();
  const [[server]] = await connection.query('SELECT @@hostname AS hostname');
  if ((apply || rollback >= 0) && (!['localhost', '127.0.0.1', '::1'].includes(process.env.MYSQL_HOST || 'localhost') || server.hostname.toLowerCase() !== hostname().toLowerCase())) throw new Error('Writes refused: the server is not verified as MySQL on this local machine.');
  const [columns] = await connection.query('SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE()');
  const jsonFields = new Set(columns.filter(c => c.DATA_TYPE === 'json').map(c => `${c.TABLE_NAME}.${c.COLUMN_NAME}`));
  const autoUpdated = new Set(columns.filter(c => /on update/i.test(c.EXTRA)).map(c => c.TABLE_NAME));
  let plan = [];
  if (rollback >= 0) {
    if (!args[rollback + 1]) throw new Error('Backup directory is required for rollback.');
    const path = resolve(args[rollback + 1]), bytes = await readFile(join(path, 'snapshot.json'));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), (await readFile(join(path, 'snapshot.sha256'), 'utf8')).trim(), 'Backup checksum mismatch.');
    const backup = JSON.parse(bytes);
    assert.equal(backup.database, process.env.MYSQL_DATABASE || 'vitaltrack_db', 'Backup database does not match.');
    plan = backup.plan.map(p => ({ ...p, before: p.after, after: p.before })).reverse();
  } else {
    const source = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
    const index = originalTextIndex(sqlStrings(source));
    for (const [table, fields] of Object.entries(TEXT_FIELDS)) {
      const available = fields.filter(f => columns.some(c => c.TABLE_NAME === table && c.COLUMN_NAME === f));
      if (!available.length) continue;
      const [rows] = await connection.query(`SELECT id, ${available.map(identifier).join(', ')} FROM ${identifier(table)} ORDER BY id`);
      for (const row of rows) for (const column of available) {
        const before = row[column];
        const isJSON = jsonFields.has(`${table}.${column}`);
        const parsed = isJSON && before != null ? JSON.parse(before) : before;
        let recovered = recoverKnownText(parsed, index);
        if (table === 'audit_logs' && column === 'description' && recovered === parsed) recovered = recoverAuditActorPrefix(parsed, row.user_name, index);
        if (JSON.stringify(parsed) !== JSON.stringify(recovered)) plan.push({ table, column, id: row.id, before, after: isJSON ? JSON.stringify(recovered) : recovered, preserveUpdatedAt: autoUpdated.has(table) });
      }
    }
  }
  for (const p of plan) {
    if (!TEXT_FIELDS[p.table]?.includes(p.column) || typeof p.before !== 'string' || typeof p.after !== 'string') throw new Error('Invalid repair plan.');
    if (jsonFields.has(`${p.table}.${p.column}`)) {
      // MySQL normalizes JSON spacing; use its canonical bytes for apply AND rollback guards.
      const [[canonical]] = await connection.query('SELECT CAST(? AS JSON) AS value', [p.after]);
      p.after = canonical.value;
    }
  }
  await mkdir('database/migrations', { recursive: true });
  if (rollback < 0 && plan.length) await writeFile('database/migrations/20261010_repair_seed_text.sql', repairSQL(plan));
  console.log(JSON.stringify({ mode: apply ? 'apply-local' : rollback >= 0 ? 'rollback-local' : 'dry-run', cells: plan.length, fields: [...new Set(plan.map(p => `${p.table}.${p.column}`))] }));
  if ((!apply && rollback < 0) || !plan.length) { console.log('No database changes made.'); }
  else {
    const [tables] = await connection.query("SELECT TABLE_NAME, ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME");
    if (tables.some(t => t.ENGINE !== 'InnoDB')) throw new Error('Transactional backup requires all tables to use InnoDB.');
    await connection.beginTransaction(); transaction = true;
    for (const p of plan) {
      const [[row]] = await connection.query(`SELECT ${identifier(p.column)} AS value FROM ${identifier(p.table)} WHERE id = ? FOR UPDATE`, [p.id]);
      assert.equal(row?.value, p.before, 'A target changed since planning; refusing to overwrite it.');
    }
    const snapshot = { checkedAt: new Date().toISOString(), database: process.env.MYSQL_DATABASE || 'vitaltrack_db', plan, tables: [] };
    for (const t of tables) {
      const [[ddl]] = await connection.query(`SHOW CREATE TABLE ${identifier(t.TABLE_NAME)}`);
      const [rows] = await connection.query(`SELECT * FROM ${identifier(t.TABLE_NAME)} ORDER BY id`);
      snapshot.tables.push({ name: t.TABLE_NAME, create: ddl['Create Table'], rows });
    }
    await mkdir('database/backups', { recursive: true });
    const backupDir = await mkdtemp(resolve('database/backups/text-encoding-'));
    const bytes = Buffer.from(JSON.stringify(snapshot, null, 2), 'utf8');
    await writeFile(join(backupDir, 'snapshot.json'), bytes, { flag: 'wx', mode: 0o600 });
    await writeFile(join(backupDir, 'snapshot.sha256'), createHash('sha256').update(bytes).digest('hex') + '\n', { flag: 'wx', mode: 0o600 });
    assert.deepEqual(await readFile(join(backupDir, 'snapshot.json')), bytes, 'Backup read-back verification failed.');
    await writeFile(join(backupDir, 'rollback.sql'), repairSQL(plan.map(p => ({ ...p, before: p.after, after: p.before })).reverse()), { flag: 'wx', mode: 0o600 });
    console.log(`Verified full backup of ${snapshot.tables.length} tables: ${backupDir}`);
    for (const p of plan) {
      const [result] = await connection.execute(`UPDATE ${identifier(p.table)} SET ${identifier(p.column)} = ?${p.preserveUpdatedAt ? ', updated_at = updated_at' : ''} WHERE id = ? AND HEX(${identifier(p.column)}) = ? LIMIT 1`, [p.after, p.id, hex(p.before).toUpperCase()]);
      assert.equal(result.affectedRows, 1, 'Unexpected update count; rolling back.');
    }
    // Prove every value outside the explicit text plan and all row counts remain identical.
    for (const t of snapshot.tables) {
      const expected = structuredClone(t.rows);
      for (const p of plan.filter(p => p.table === t.name)) expected.find(r => String(r.id) === String(p.id))[p.column] = p.after;
      const [actual] = await connection.query(`SELECT * FROM ${identifier(t.name)} ORDER BY id`);
      const canonical = rows => rows.map(row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v != null && jsonFields.has(`${t.name}.${k}`) ? JSON.parse(v) : v])));
      assert.deepEqual(canonical(actual), canonical(expected), 'Unexpected data change; rolling back.');
    }
    await connection.commit(); transaction = false;
    console.log(`Committed ${plan.length} verified text repairs. Row counts, measurements, goal progress inputs, timestamps, credentials and other fields unchanged.`);
  }
} catch (error) {
  if (transaction) await connection.rollback();
  console.error(`Text repair stopped (${error.code || error.message}). Any uncommitted writes were rolled back.`);
  process.exitCode = 1;
} finally { connection?.release(); await pool.end(); }
