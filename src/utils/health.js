export function localDateTime(value = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export const STALE_DAYS = Math.max(1, Number(import.meta.env.VITE_HEALTH_STALE_DAYS) || 7);
export const isStale = time => !time || Date.now() - new Date(time).getTime() > STALE_DAYS * 86400000;
export function displayTime(time) {
  return time && Number.isFinite(new Date(time).getTime()) ? new Date(time).toLocaleString('vi-VN') : 'Chưa có thông tin';
}
