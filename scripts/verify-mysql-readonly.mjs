// SELECT / EXPLAIN only. No app startup, DDL, DML or real patient rows.
process.env.VITALTRACK_NO_AUTOSTART = 'true';
const { getMySQLPool } = await import('../server.js');
const { healthCapabilities, loadHealthSnapshot, columnsFor } = await import('../server/health-domain.js');
const pool = getMySQLPool();
try {
  const [[session]] = await pool.query('SELECT @@session.time_zone AS timezone, VERSION() AS version');
  const capabilities = await healthCapabilities(pool);
  // Schema user IDs are unsigned-by-business positive auto-increment IDs.
  const snapshot = await loadHealthSnapshot(pool, -1);
  if (snapshot.latest !== null) throw new Error('Unexpected fixture user ID; aborting.');
  const reminders = await columnsFor(pool, 'reminders');
  const [plan] = await pool.query('EXPLAIN SELECT * FROM health_records WHERE user_id = -1 AND weight BETWEEN 10 AND 400 AND recorded_at <= UTC_TIMESTAMP() ORDER BY recorded_at DESC, id DESC LIMIT 2');
  console.log(JSON.stringify({ session, capabilities, snapshotQueries: 'passed against absent user -1; no patient rows', reminders: { timezone: 'timezone' in reminders, completion: 'completed_dates' in reminders }, queryPlan: plan.map(row => ({ table: row.table, type: row.type, possible_keys: row.possible_keys, key: row.key })) }, null, 2));
} finally { await pool.end(); }
