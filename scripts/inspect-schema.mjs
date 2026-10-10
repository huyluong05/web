// Read-only preflight. Load connection variables using node --env-file=.env.
// This script never imports the application or executes DDL/DML.
import mysql from 'mysql2/promise';
import { mkdir, writeFile } from 'node:fs/promises';
for (const key of ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_DATABASE']) if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
const ca = process.env.MYSQL_SSL_CA?.replace(/\\n/g, '\n');
const pool = mysql.createPool({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE, connectTimeout: 5000, connectionLimit: 1, ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : process.env.MYSQL_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}) });
try {
  const [[server]] = await pool.query('SELECT VERSION() AS version, @@session.time_zone AS session_timezone, @@system_time_zone AS system_timezone');
  const [columns] = await pool.query('SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION');
  const [indexes] = await pool.query('SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX');
  await mkdir('docs', { recursive: true });
  await writeFile('docs/MYSQL-SCHEMA-INSPECTION.json', JSON.stringify({ checkedAt: new Date().toISOString(), source: 'read-only configured MySQL connection; no credentials or personal rows included', server, columns, indexes }, null, 2));
  console.log(`Read-only schema inspection succeeded: ${new Set(columns.map(c => c.TABLE_NAME)).size} tables. Saved docs/MYSQL-SCHEMA-INSPECTION.json`);
} catch (error) {
  console.error(`Schema inspection unavailable (${error.code || 'UNKNOWN'}). No database changes were attempted.`);
  process.exitCode = 1;
} finally { await pool.end(); }
