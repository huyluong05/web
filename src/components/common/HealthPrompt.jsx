import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isStale, STALE_DAYS } from '../../utils/health';
import { occurrence } from '../../utils/reminders';
export function HealthPrompt({ snapshot, reminders }) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false), [never, setNever] = useState(false);
  const key = `vitaltrack_measure_prompt_${user?.id}`;
  useEffect(() => {
    if (!user || user.role === 'admin' || snapshot === undefined) return;
    let preference = {}, seen = false;
    try { preference = JSON.parse(localStorage.getItem(key) || '{}'); seen = sessionStorage.getItem(`${key}_seen`) === '1'; } catch { /* Storage disabled: reminder is limited to this mount. */ }
    if (preference.disabled || preference.snoozeUntil > Date.now() || seen) return;
    const due = reminders.some(r => r.type === 'measurement' && occurrence(r).due);
    if (!snapshot.latest || isStale(snapshot.latest.recorded_at) || due) {
      setVisible(true);
      try { sessionStorage.setItem(`${key}_seen`, '1'); } catch { /* Optional persistence. */ }
    }
  }, [user?.id, snapshot, reminders, key]);
  const dismiss = () => {
    try { localStorage.setItem(key, JSON.stringify({ disabled: never, snoozeUntil: Date.now() + 86400000 })); } catch { /* Optional preference storage. */ }
    setVisible(false);
  };
  useEffect(() => {
    if (!visible) return;
    const escape = e => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [visible, never]);
  if (!visible) return null;
  return <aside role="region" aria-label="Lời nhắc ghi nhận sức khỏe" className="rounded-2xl border border-primary-200 bg-white shadow-sm p-4 mb-4 relative">
    <button type="button" onClick={dismiss} aria-label="Đóng lời nhắc" className="absolute right-3 top-2 p-2 text-slate-600">✕</button>
    <h2 className="font-bold text-primary-800 pr-8">{snapshot.latest ? 'Đã đến lúc kiểm tra lại chỉ số' : 'Chào mừng bạn đến với VitalTrack!'}</h2>
    <p className="text-sm text-slate-600 mt-2">{snapshot.latest ? `Số đo gần nhất đã cũ (ngưỡng ${STALE_DAYS} ngày) hoặc đến lịch nhắc bạn thiết lập. Ghi nhận lại khi thuận tiện.` : 'Hãy ghi nhận các chỉ số sức khỏe đầu tiên để hệ thống có thể theo dõi sự thay đổi và hỗ trợ bạn đặt mục tiêu phù hợp.'}</p>
    <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" checked={never} onChange={e => setNever(e.target.checked)} />Không nhắc lại trên trình duyệt này</label>
    <div className="flex flex-wrap gap-3 mt-3"><Link to="/health?record=1" onClick={dismiss} className="rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-semibold">Ghi nhận ngay</Link><button type="button" className="px-4 py-2 text-sm text-slate-700" onClick={dismiss}>Để sau — nhắc lại sau 24 giờ</button></div>
  </aside>;
}
