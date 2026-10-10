export const REMINDER_TYPES = { water: 'Uống nước', exercise: 'Vận động', measurement: 'Ghi nhận chỉ số', medication: 'Thuốc theo chỉ định' };
export function jsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : fallback; } catch { return fallback; } }
  return fallback;
}
export function occurrence(reminder, now = new Date(), fallbackZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const zone = reminder.timezone || fallbackZone || 'Asia/Bangkok';
  let parts;
  try { parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value])); }
  catch { return { status: 'invalid', due: false, date: null, zone }; }
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const repeats = jsonArray(reminder.repeat_days, [0, 1, 2, 3, 4, 5, 6]);
  if (!reminder.is_active) return { date, zone, due: false, status: 'disabled' };
  if (!repeats.includes(weekday)) return { date, zone, due: false, status: 'unscheduled' };
  if (jsonArray(reminder.completed_dates).includes(date)) return { date, zone, due: false, status: 'completed' };
  const time = `${parts.hour}:${parts.minute}`, scheduled = String(reminder.time_of_day).slice(0, 5);
  return { date, zone, due: time >= scheduled, status: time > scheduled ? 'overdue' : 'pending' };
}
export const reminderPath = r => r.type === 'measurement' ? '/health?record=1' : '/reminders';
