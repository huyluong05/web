import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sqlStrings, lossyVariants, originalTextIndex, recoverKnownText, recoverAuditActorPrefix, repairSQL } from '../scripts/lib/text-encoding.mjs';

test('recover both screenshot goal titles from exact original SQL; preserve valid and unknown text', async () => {
  const source = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const index = originalTextIndex(sqlStrings(source));
  for (const title of ['Kiểm soát cân nặng tiêu chuẩn', 'Huyết áp tâm thu ổn định dưới 120 mmHg']) {
    for (const damaged of lossyVariants(title)) assert.equal(recoverKnownText(damaged, index), title);
    assert.equal(recoverKnownText(title, index), title);
  }
  for (const value of [null, undefined, 0, false, '', 'Cần đo lại?', 'Một mục tiêu riêng???', 'Unknown ??? text', 'Tiếng Việt 🫀']) assert.equal(recoverKnownText(value, index), value);
});
test('ambiguous lost accents cannot overwrite a user value', () => {
  const index = originalTextIndex(['má', 'mà']);
  for (const damaged of lossyVariants('má')) assert.equal(recoverKnownText(damaged, index), damaged);
});
test('audit repair can restore its verified actor prefix without rewriting the logged action', () => {
  const actor = 'Trần Minh Huy', index = originalTextIndex([actor]);
  const damaged = lossyVariants(actor)[1], action = ': VIEW_PAGE — ghi chú riêng???';
  assert.equal(recoverAuditActorPrefix(damaged + action, damaged, index), actor + action);
  assert.equal(recoverAuditActorPrefix('Admin ' + damaged + action, actor, index), 'Admin ' + actor + action);
  for (const value of ['User: ' + damaged, damaged + 'Extra', 'Unknown??? action']) assert.equal(recoverAuditActorPrefix(value, actor, index), value);
  assert.equal(recoverAuditActorPrefix(damaged + action, 'Other user', index), damaged + action);
});
test('known JSON values recover without changing keys, numbers, booleans or unknown clinical text', () => {
  const index = originalTextIndex(['["Hải sản vỏ cứng", "Kháng sinh Penicillin"]', '{"title":"Giảm cân về 65kg"}']);
  const original = { title: lossyVariants('Giảm cân về 65kg')[1], count: 0, active: false, other: 'Triệu chứng ??? không có bản gốc', nested: [lossyVariants('Hải sản vỏ cứng')[1], null] };
  const before = structuredClone(original);
  assert.deepEqual(recoverKnownText(original, index), { ...original, title: 'Giảm cân về 65kg', nested: ['Hải sản vỏ cứng', null] });
  assert.deepEqual(original, before, 'diagnostics must not mutate source data');
});
test('SQL reference parsing ignores comments and preserves escaped quotes and JSON', () => {
  assert.deepEqual(sqlStrings("-- 'not data'\n/* 'also not data' */\nINSERT INTO t VALUES ('O''Brien', 'l\\'été', '[\"Tiếng Việt\"]'); # 'comment'\n"), ["O'Brien", "l'été", '["Tiếng Việt"]']);
  assert.throws(() => sqlStrings("SELECT 'unfinished"));
});
test('review SQL uses ASCII hex literals and exact old-byte guards, preserving timestamps', () => {
  const sql = repairSQL([{ table: 'goals', column: 'title', id: 1, before: 'Ki???m', after: 'Kiểm', preserveUpdatedAt: true }]);
  assert.ok(/^[\x00-\x7f]*$/.test(sql), 'SQL remains intact even through an ASCII terminal');
  assert.ok(sql.includes('CONVERT(0x4b69e1bb836d USING utf8mb4)'));
  assert.ok(sql.includes("HEX(`title`) = '4B693F3F3F6D' LIMIT 1"));
  assert.ok(sql.includes('updated_at = updated_at'));
  assert.ok(!sql.split('\n').some(line => /^COMMIT;/.test(line)), 'review file must not silently commit');
});
