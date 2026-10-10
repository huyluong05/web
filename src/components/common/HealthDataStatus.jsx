import React from 'react';
import { displayTime, isStale } from '../../utils/health';
export function HealthDataStatus({ current = {} }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs text-slate-600">
    {[['weight', 'Cân nặng', 'kg'], ['systolic', 'Huyết áp tâm thu', 'mmHg'], ['diastolic', 'Huyết áp tâm trương', 'mmHg'], ['heart_rate', 'Nhịp tim', 'bpm']].map(([key, label, unit]) => {
      const m = current[key] ?? (key === 'systolic' ? current.blood_pressure : key === 'diastolic' && current.blood_pressure ? { ...current.blood_pressure, value: current.blood_pressure.diastolic } : null);
      return <div key={key} className="rounded-lg border border-slate-200 bg-white p-3">
        <p className="font-semibold text-slate-800">{label}: {m ? `${m.value}${key === 'blood_pressure' ? `/${m.diastolic}` : ''} ${unit}` : 'Chưa có số đo'}</p>
        {m && <><p className="mt-1">Đo: {displayTime(m.recorded_at)}</p><p>Cập nhật: {m.updated_at ? displayTime(m.updated_at) : 'Chưa có thông tin thời điểm sửa'}</p>{isStale(m.recorded_at) && <p className="mt-1 text-amber-800">Số đo đã cũ; hãy ghi nhận lại để phản ánh tình trạng hiện tại.</p>}</>}
      </div>;
    })}
  </div>;
}
