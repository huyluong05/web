// Read-only diagnostic: never imports server.js or executes DDL/DML.
// No credentials or unknown patient text are printed or written to the report.
import mysql from 'mysql2/promise';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { sqlStrings, originalTextIndex } from './lib/text-encoding.mjs';
const source = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
const masks = originalTextIndex(sqlStrings(source));
const ca = process.env.MYSQL_SSL_CA?.replace(/\\n/g, '\n');
const pool = mysql.createPool({ host: process.env.MYSQL_HOST || 'localhost', port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER || 'root', password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE || 'vitaltrack_db', charset: 'utf8mb4', connectTimeout: 5000, connectionLimit: 1, ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : process.env.MYSQL_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}) });
try {
  const [[session]] = await pool.query('SELECT @@character_set_client AS client, @@character_set_connection AS connection, @@character_set_results AS results, @@character_set_database AS database_charset, @@collation_database AS database_collation');
  const [columns] = await pool.query("SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND DATA_TYPE IN ('char', 'varchar', 'text', 'mediumtext', 'longtext', 'json') ORDER BY TABLE_NAME, ORDINAL_POSITION");
  const sample = 'Tiếng Việt: Kiểm soát cân nặng, huyết áp — 🫀';
  const [[echo]] = await pool.query('SELECT ? AS sample, HEX(?) AS hex', [sample, sample]);
  const findings = [];
  const identifier = name => '`' + name.replace(/`/g, '``') + '`';
  for (const col of columns) {
    if (['password', 'email', 'phone_number', 'ip_address', 'user_agent', 'avatar_url'].includes(col.COLUMN_NAME)) continue;
    const field = identifier(col.COLUMN_NAME), table = identifier(col.TABLE_NAME);
    const [[counts]] = await pool.query(`SELECT COUNT(*) AS total, SUM(${field} LIKE '%?%') AS question_marks, SUM(${field} LIKE ?) AS replacement_characters FROM ${table}`, ['%\uFFFD%']);
    const knownSeedMatches = [];
    if (Number(counts.question_marks)) {
      // Only inspect values already matching a damaged literal in the checked-in seed.
      const candidates = [...masks.keys()];
      const [matches] = await pool.query(`SELECT id, ${field} AS value FROM ${table} WHERE ${field} IN (${candidates.map(() => '?').join(',')}) LIMIT 100`, candidates);
      for (const row of matches) {
        const originals = [...(masks.get(row.value) || [])];
        if (originals.length === 1) knownSeedMatches.push({ id: row.id, original: originals[0], damaged: row.value, storedHex: Buffer.from(row.value, 'utf8').toString('hex') });
      }
    }
    findings.push({ table: col.TABLE_NAME, column: col.COLUMN_NAME, charset: col.CHARACTER_SET_NAME, collation: col.COLLATION_NAME, total: Number(counts.total), rowsWithQuestionMarks: Number(counts.question_marks || 0), rowsWithReplacementCharacters: Number(counts.replacement_characters || 0), knownSeedMatches });
  }
  const report = { checkedAt: new Date().toISOString(), readOnly: true, localConnection: ['localhost', '127.0.0.1', '::1'].includes(process.env.MYSQL_HOST || 'localhost'), session, utf8RoundTrip: echo.sample === sample && echo.hex.toLowerCase() === Buffer.from(sample).toString('hex'), findings };
  await mkdir('docs', { recursive: true });
  await writeFile('docs/TEXT-ENCODING-AUDIT.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ localConnection: report.localConnection, session, utf8RoundTrip: report.utf8RoundTrip, suspicious: findings.filter(f => f.rowsWithQuestionMarks || f.rowsWithReplacementCharacters).map(f => ({ table: f.table, column: f.column, rowsWithQuestionMarks: f.rowsWithQuestionMarks, rowsWithReplacementCharacters: f.rowsWithReplacementCharacters, knownSeedMatches: f.knownSeedMatches.map(m => ({ id: m.id, original: m.original, storedHex: m.storedHex })) })) }, null, 2));
} catch (error) {
  console.error(`Text encoding audit failed (${error.code || 'UNKNOWN'}). No database changes were attempted.`);
  process.exitCode = 1;
} finally { await pool.end(); }
