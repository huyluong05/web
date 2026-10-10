import React from 'react';
import { Link } from 'react-router-dom';
import { occurrence, reminderPath } from '../../utils/reminders';
const LABELS = { pending: 'Chưa hoàn thành', overdue: 'Quá giờ nhắc — chưa hoàn thành', completed: 'Đã hoàn thành hôm nay', disabled: 'Đã tắt', unscheduled: 'Không có lịch hôm nay', invalid: 'Múi giờ không hợp lệ' };
export function ReminderOccurrence({ reminder, onComplete, scheduling }) {
  const slot = occurrence(reminder);
  return <div className="text-xs mt-2 flex flex-wrap items-center gap-2">
    <span className={slot.status === 'overdue' ? 'text-amber-800' : 'text-slate-600'}>{LABELS[slot.status]} · {slot.zone}</span>
    {scheduling && ['pending', 'overdue', 'completed'].includes(slot.status) && <button type="button" className="underline text-primary-700" onClick={() => onComplete(reminder, slot.status !== 'completed')}>{slot.status === 'completed' ? 'Bỏ hoàn thành' : 'Hoàn thành hôm nay'}</button>}
    {reminder.type === 'measurement' && <Link className="underline text-primary-700" to={reminderPath(reminder)}>Ghi nhận ngay</Link>}
  </div>;
}
