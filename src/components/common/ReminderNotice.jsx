import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { occurrence, reminderPath } from '../../utils/reminders';
export function ReminderNotice({ reminders }) {
  const { user } = useAuth();
  const [notice, setNotice] = useState(null), [tick, setTick] = useState(0);
  const shown = useRef(new Set());
  useEffect(() => { const timer = setInterval(() => { if (document.visibilityState === 'visible') setTick(t => t + 1); }, 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (user?.role === 'admin') return;
    let found = null;
    for (const r of reminders) {
      const slot = occurrence(r), key = `vitaltrack_notice_${user?.id}_${r.id}_${slot.date}`;
      let seen = shown.current.has(key);
      try { seen = seen || localStorage.getItem(key) === '1'; } catch { /* Optional deduplication storage. */ }
      if (slot.due && !seen) { found = { ...r, key }; break; }
    }
    if (!notice && found) { shown.current.add(found.key); try { localStorage.setItem(found.key, '1'); } catch { /* In-memory deduplication remains active. */ } setNotice(found); }
    // A nonempty list can contain only disabled, pending or already-seen reminders.
    else if (notice && !reminders.some(r => r.id === notice.id && occurrence(r).due)) setNotice(null);
  }, [reminders, tick, user?.id, notice]);
  const dismiss = () => { if (!notice) return; try { localStorage.setItem(notice.key, '1'); } catch { /* Optional preference storage. */ } setNotice(null); };
  if (!notice) return null;
  return <div role="status" className="mb-4 p-3 border border-amber-200 bg-amber-50 rounded-xl flex flex-wrap gap-3 items-center text-sm text-amber-900"><span>Đến lịch: {notice.title} ({String(notice.time_of_day).slice(0, 5)})</span><Link onClick={dismiss} className="underline font-semibold" to={reminderPath(notice)}>Mở chức năng</Link><button type="button" className="ml-auto underline" onClick={dismiss}>Đã xem — đóng</button></div>;
}
