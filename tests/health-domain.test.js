import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progress, validateRecord, loadHealthSnapshot, goalWithCurrent, syncGoals, inTransaction, riskCategory } from '../server/health-domain.js';
import { occurrence } from '../src/utils/reminders.js';
import { metricRecords } from '../src/utils/metrics.js';
import { referenceAnalysis, formatDiagnosis } from '../server/ai-routes.js';
import { MemoryPool } from './support/memory-pool.js';

test('progress counts direction, increase, decrease, zero and equal targets', () => {
  const p = (start, target, current) => progress({ start_value: start, target_value: target, current_value: current });
  assert.equal(p(70, 65, 72), 0); assert.equal(p(70, 65, 68), 40); assert.equal(p(60, 70, 65), 50);
  assert.equal(p('0', '100', '50'), 50); assert.equal(p(70, 70, 71), 0); assert.equal(p(70, 70, 70), 100);
  assert.equal(p(70, 65, null), 0); assert.equal(p(70, 65, undefined), 0); assert.equal(p(70, 65, 64), 100);
});
test('record validation rejects fake/missing/zero/NaN/future and handles migrated partial records', () => {
  const good = { weight: 70, systolic: 120, diastolic: 80, heart_rate: 72 };
  for (const value of [0, null, undefined, '', 'NaN', Infinity, false]) assert.throws(() => validateRecord({ ...good, weight: value }));
  assert.throws(() => validateRecord({ ...good, recorded_at: 'bad-date' }));
  assert.throws(() => validateRecord({ ...good, recorded_at: '2026-02-30T00:00:00Z' }));
  assert.throws(() => validateRecord({ ...good, recorded_at: '2099-01-01T00:00:00Z' }));
  assert.equal(validateRecord({ weight: '71.2' }, { nullable: true }).weight, 71.2);
  assert.equal(validateRecord({ weight: 71 }, { nullable: true }).heart_rate, null);
  assert.throws(() => validateRecord({}, { nullable: true }));
  assert.deepEqual(validateRecord({ notes: 'Keep notes' }, { partial: true }), { notes: 'Keep notes' });
});
test('latest by measured time and id; skip missing metrics; deleted latest falls back', async () => {
  const pool = new MemoryPool();
  pool.tables.health_records = [
    { id: 1, user_id: 1, weight: 70, systolic: 120, diastolic: 80, heart_rate: 70, recorded_at: '2026-01-01T00:00:00Z' },
    { id: 2, user_id: 1, weight: 69, recorded_at: '2026-01-05T00:00:00Z' },
    { id: 3, user_id: 1, weight: 68, recorded_at: '2026-01-10T00:00:00Z' },
    { id: 4, user_id: 1, weight: 67, recorded_at: '2026-01-10T00:00:00Z' },
    { id: 5, user_id: 1, weight: null, heart_rate: 75, recorded_at: '2026-01-11T00:00:00Z' },
    { id: 6, user_id: 3, weight: 80, recorded_at: '2026-01-12T00:00:00Z' },
    { id: 7, user_id: 1, weight: 50, recorded_at: '2099-01-12T00:00:00Z' },
  ];
  assert.equal((await loadHealthSnapshot(pool, 1)).current.weight.value, 67);
  pool.tables.health_records[0].weight = 71;
  assert.equal((await loadHealthSnapshot(pool, 1)).current.weight.value, 67);
  pool.tables.health_records = pool.tables.health_records.filter(r => r.id !== 4);
  const snapshot = await loadHealthSnapshot(pool, 1);
  assert.equal(snapshot.current.weight.value, 68); assert.equal(snapshot.current.heart_rate.value, 75);
  assert.equal(snapshot.current.blood_pressure.value, 120);
  assert.equal(goalWithCurrent({ metric_type: 'weight', start_value: 70, target_value: 65 }, snapshot).progress_percentage, 40);
  assert.equal(goalWithCurrent({ metric_type: 'weight', current_value: 50 }, { current: {} }).current_value, null);
});
test('partial pressure records keep independent latest values without inventing a simultaneous pair', async () => {
  const pool = new MemoryPool();
  pool.tables.health_records = [
    { id: 1, user_id: 1, systolic: 120, diastolic: 80, recorded_at: '2026-01-01T00:00:00Z' },
    { id: 2, user_id: 1, systolic: 115, recorded_at: '2026-01-02T00:00:00Z' },
    { id: 3, user_id: 1, diastolic: 75, recorded_at: '2026-01-03T00:00:00Z' },
  ];
  const snapshot = await loadHealthSnapshot(pool, 1);
  assert.equal(snapshot.latest.id, 3); assert.equal(snapshot.current.systolic.value, 115); assert.equal(snapshot.current.diastolic.value, 75);
  assert.equal(snapshot.current.blood_pressure.record_id, 1);
  assert.equal(goalWithCurrent({ metric_type: 'blood_pressure', start_value: 120, target_value: 110 }, snapshot).current_value, 115);
  assert.equal(riskCategory({ systolic: null, diastolic: null }), 'unknown');
});
test('persisted AI history supports legacy arrays and nullable JSON without fabricated probabilities', () => {
  const legacy = formatDiagnosis({ vital_analysis: null, possible_conditions: '{}', recommendations: '["Historical advice"]' });
  assert.deepEqual(legacy.recommendations.immediateActions, ['Historical advice']); assert.deepEqual(legacy.possibleConditions, []);
  const modern = formatDiagnosis({ recommendations: JSON.stringify(referenceAnalysis({ systolic: 120, diastolic: 80 }).recommendations) });
  assert.ok(Array.isArray(modern.recommendations.dietaryTips)); assert.equal(modern.riskScore, null);
});
test('goal synchronization preserves starting values and handles all measured types', async () => {
  const pool = new MemoryPool();
  pool.tables.health_records = [{ id: 1, user_id: 1, weight: 68, systolic: 118, diastolic: 76, heart_rate: 72, recorded_at: '2026-01-10T00:00:00Z' }];
  pool.tables.goals = [{ id: 1, user_id: 1, metric_type: 'weight', start_value: 70, target_value: 65, current_value: 70, status: 'in_progress' }, { id: 2, user_id: 1, metric_type: 'heart_rate', start_value: 90, target_value: 70, current_value: 90, status: 'in_progress' }];
  await syncGoals(pool, 1);
  assert.equal(pool.tables.goals[0].current_value, 68); assert.equal(pool.tables.goals[0].start_value, 70);
  assert.equal(pool.tables.goals[1].current_value, 72);
});
test('failed transaction rolls back and releases connection', async () => {
  const pool = new MemoryPool(); let released = false; pool.release = () => { released = true; };
  await assert.rejects(inTransaction(pool, async c => { c.tables.goals.push({ id: 1 }); throw new Error('failed'); }));
  assert.equal(pool.tables.goals.length, 0); assert.ok(released);
});
test('reminders respect local date, weekday, completion and disabled state', () => {
  const base = { is_active: true, timezone: 'Asia/Ho_Chi_Minh', time_of_day: '08:00', repeat_days: [0, 1, 2, 3, 4, 5, 6] };
  const now = new Date('2026-10-10T01:01:00Z');
  assert.equal(occurrence(base, now).status, 'overdue');
  assert.equal(occurrence({ ...base, completed_dates: '["2026-10-10"]' }, now).status, 'completed');
  assert.equal(occurrence({ ...base, is_active: false }, now).due, false);
  assert.equal(occurrence({ ...base, repeat_days: [1] }, now).status, 'unscheduled');
  assert.equal(occurrence({ ...base, timezone: 'America/Los_Angeles' }, now).date, '2026-10-09');
});
test('charts normalize MySQL decimals without coercing missing values to zero', () => {
  const rows = metricRecords([{ recorded_at: '2026-01-01', weight: '68.50' }, { recorded_at: '2026-01-02', weight: null }, { recorded_at: '2026-01-03', weight: 0 }], ['weight']);
  assert.equal(rows.length, 1); assert.equal(rows[0].weight, 68.5);
});
test('AI references do not infer disease probability and urgent symptoms are escalated', () => {
  const result = referenceAnalysis({ systolic: 190, diastolic: 125, heart_rate: 110 }, ['Tức ngực']);
  assert.equal(result.riskLevel, 'critical'); assert.equal(result.riskScore, null);
  assert.match(result.recommendations.immediateActions[0], /115/);
  assert.equal(referenceAnalysis({ systolic: 190, diastolic: 125 }, []).riskLevel, 'high');
  assert.ok(result.possibleConditions.every(c => !c.probability.includes('%')));
});
