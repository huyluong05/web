// Only existing schema fields; baseline/target never insert a health measurement.
export function profileFields(body) {
  const updates = [], params = [];
  const fail = field => { throw Object.assign(new Error(`Trường hồ sơ không hợp lệ: ${field}`), { status: 400 }); };
  const add = (field, value) => { updates.push(`${field} = ?`); params.push(value); };
  const text = { phone_number: 30, occupation: 100, address: 255, avatar_url: 10000, blood_type: 10, activity_level: 30, current_medications: 10000, medical_notes: 10000, primary_doctor: 150, hospital_clinic: 150, emergency_contact_name: 150, emergency_contact_relationship: 50, emergency_contact_phone: 30 };
  for (const [field, limit] of Object.entries(text)) if (body[field] !== undefined) {
    if (body[field] !== null && (typeof body[field] !== 'string' || body[field].length > limit)) fail(field);
    add(field, body[field]?.trim() ?? null);
  }
  for (const [field, min, max] of [['height_cm', 40, 260], ['base_weight_kg', 10, 400], ['target_weight_kg', 10, 400]]) if (body[field] !== undefined) {
    const value = body[field];
    if (value !== null && (value === '' || typeof value === 'boolean' || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max)) fail(field);
    add(field, value === null ? null : Math.round(Number(value) * 100) / 100);
  }
  if (body.date_of_birth !== undefined) {
    const date = body.date_of_birth;
    if (date !== null && date !== '' && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(new Date(date).getTime()) || new Date(date).toISOString().slice(0, 10) !== date || date > new Date().toISOString().slice(0, 10))) fail('date_of_birth');
    add('date_of_birth', date || null);
  }
  for (const [field, choices] of Object.entries({ gender: ['male', 'female', 'other'], weight_unit: ['kg', 'lbs'], height_unit: ['cm', 'inch'] })) if (body[field] !== undefined) {
    if (!choices.includes(body[field])) fail(field);
    add(field, body[field]);
  }
  for (const field of ['chronic_conditions', 'allergies']) if (body[field] !== undefined) {
    if (!Array.isArray(body[field]) || body[field].length > 100 || body[field].some(v => typeof v !== 'string' || v.length > 300)) fail(field);
    add(field, JSON.stringify(body[field].map(v => v.trim()).filter(Boolean)));
  }
  if (body.vital_alert_thresholds !== undefined) {
    const value = body.vital_alert_thresholds;
    if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(value).length > 5000) fail('vital_alert_thresholds');
    add('vital_alert_thresholds', JSON.stringify(value));
  }
  if (body.email_notifications !== undefined) {
    if (typeof body.email_notifications !== 'boolean') fail('email_notifications');
    add('email_notifications', body.email_notifications ? 1 : 0);
  }
  return { updates, params };
}
