// Recover only exact, unambiguous matches to known original text. Never guess.
export function sqlStrings(source) {
  const values = [];
  for (let i = 0; i < source.length; i++) {
    if (source.startsWith('--', i) && /\s/.test(source[i + 2] || '')) { i = source.indexOf('\n', i); if (i < 0) break; }
    else if (source[i] === '#') { i = source.indexOf('\n', i); if (i < 0) break; }
    else if (source.startsWith('/*', i)) { i = source.indexOf('*/', i + 2); if (i < 0) break; i++; }
    else if (source[i] === "'") {
      let value = '', closed = false;
      while (++i < source.length) {
        const c = source[i];
        if (c === '\\') {
          const escaped = source[++i];
          value += ({ n: '\n', r: '\r', t: '\t', '0': '\0', Z: '\x1a' })[escaped] ?? escaped;
        } else if (c === "'") {
          if (source[i + 1] === "'") { value += "'"; i++; }
          else { closed = true; break; }
        } else value += c;
      }
      if (!closed) throw new Error('Unterminated SQL string in reference file.');
      values.push(value);
    }
  }
  return values;
}
export function lossyVariants(text) {
  return [text.replace(/[^\x00-\x7f]/gu, '?'), [...Buffer.from(text, 'utf8')].map(b => b > 127 ? '?' : String.fromCharCode(b)).join('')];
}
export function originalTextIndex(values) {
  const index = new Map();
  const add = value => {
    if (Array.isArray(value)) { value.forEach(add); return; }
    if (value && typeof value === 'object') { Object.values(value).forEach(add); return; }
    if (typeof value !== 'string') return;
    if (/[^\x00-\x7f]/.test(value) && !value.includes('?') && !value.includes('\uFFFD')) {
      for (const variant of lossyVariants(value)) {
        if (!index.has(variant)) index.set(variant, new Set());
        index.get(variant).add(value);
      }
    }
    try { const parsed = JSON.parse(value); if (typeof parsed !== 'string') add(parsed); } catch { /* Ordinary text. */ }
  };
  values.forEach(add);
  return index;
}
export function recoverKnownText(value, index) {
  if (typeof value === 'string') {
    const matches = index.get(value);
    return matches?.size === 1 ? [...matches][0] : value;
  }
  if (Array.isArray(value)) return value.map(v => recoverKnownText(v, index));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, recoverKnownText(v, index)]));
  return value;
}
export function recoverAuditActorPrefix(description, actor, index) {
  if (typeof description !== 'string' || typeof actor !== 'string') return description;
  const original = recoverKnownText(actor, index);
  for (const damaged of lossyVariants(original)) {
    if (index.get(damaged)?.size !== 1 || !index.get(damaged).has(original)) continue;
    for (const prefix of ['', 'Admin ']) {
      const start = prefix + damaged, rest = description.slice(start.length);
      if (description.startsWith(start) && (!rest || /^[\s:,.\u2014-]/u.test(rest))) return prefix + original + rest;
    }
  }
  return description;
}
export const TEXT_FIELDS = {
  users: ['full_name', 'chronic_conditions', 'allergies'],
  health_records: ['notes'], goals: ['title', 'unit'], reminders: ['title'],
  connected_devices: ['name'], audit_logs: ['user_name', 'description', 'metadata'],
};
export const identifier = name => '`' + name.replace(/`/g, '``') + '`';
export const hex = text => Buffer.from(String(text), 'utf8').toString('hex');
export function repairSQL(plan) {
  const literal = value => `CONVERT(0x${hex(value)} USING utf8mb4)`;
  return ['-- Review before applying. Exact ID + original UTF-8 bytes required for each update.',
    '-- Back up the target database first. This file never recreates tables or seed rows.',
    'SET NAMES utf8mb4;', 'START TRANSACTION;',
    ...plan.map(p => `UPDATE ${identifier(p.table)} SET ${identifier(p.column)} = ${literal(p.after)}${p.preserveUpdatedAt ? ', updated_at = updated_at' : ''} WHERE id = ${literal(p.id)} AND HEX(${identifier(p.column)}) = '${hex(p.before).toUpperCase()}' LIMIT 1;`),
    '-- Verify affected-row counts and text before committing; ROLLBACK if they differ.',
    '-- COMMIT; -- deliberately requires an explicit decision',
  ].join('\n') + '\n';
}
