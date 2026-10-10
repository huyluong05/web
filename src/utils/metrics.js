const limits = { weight: [10, 400], systolic: [50, 260], diastolic: [30, 180], heart_rate: [30, 240] };
export function numericRecords(records) {
  if (!Array.isArray(records)) return [];
  return records.map(r => ({ ...r, ...Object.fromEntries(Object.entries(limits).map(([key, [min, max]]) => {
    const raw = r[key], n = Number(raw);
    return [key, raw !== null && raw !== undefined && raw !== '' && Number.isFinite(n) && n >= min && n <= max ? n : null];
  })) }));
}
export function metricRecords(records, fields) {
  return numericRecords(records).filter(r => fields.every(f => r[f] !== null) && Number.isFinite(new Date(r.recorded_at).getTime()));
}
