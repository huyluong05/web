import React, { useMemo } from "react";
import { Sun, Sunset, Moon, Sunrise, AlertCircle } from "lucide-react";
export const CircadianBPRhythmChart = ({ records }) => {
  const circadianStats = useMemo(() => {
    if (!records || records.length === 0) return null; // Time buckets // Sáng sớm (06:00 - 09:59) - Morning surge window // Trưa (10:00 - 13:59) // Chiều (14:00 - 17:59) // Tối & Đêm (18:00 - 05:59) - Nocturnal dipping window
const morning = [];
    const noon = [];
    const evening = [];
    const night = [];
    records.forEach((r) => {
      const hour = new Date(r.recorded_at).getHours();
      if (hour >= 6 && hour < 10) morning.push(r);
      else if (hour >= 10 && hour < 14) noon.push(r);
      else if (hour >= 14 && hour < 18) evening.push(r);
      else night.push(r);
    });
    const calcAvg = (arr) => {
      if (arr.length === 0) return { avgSys: 0, avgDia: 0, avgHr: 0, count: 0 };
      const sys = Math.round(
        arr.reduce((a, b) => a + b.systolic, 0) / arr.length,
      );
      const dia = Math.round(
        arr.reduce((a, b) => a + b.diastolic, 0) / arr.length,
      );
      const hr = Math.round(
        arr.reduce((a, b) => a + b.heart_rate, 0) / arr.length,
      );
      return { avgSys: sys, avgDia: dia, avgHr: hr, count: arr.length };
    };
    const m = calcAvg(morning);
    const n = calcAvg(noon);
    const e = calcAvg(evening);
    const nt = calcAvg(night); // Morning surge detection
const isMorningSurge =
      m.avgSys > 0 && nt.avgSys > 0 && m.avgSys - nt.avgSys >= 20;
    return { morning: m, noon: n, evening: e, night: nt, isMorningSurge };
  }, [records]);
  if (!circadianStats || records.length === 0) return null;
  const buckets = [
    {
      title: "Sáng sớm (06h - 10h)",
      sub: "Khung giờ Morning Surge",
      icon: Sunrise,
      data: circadianStats.morning,
      accent: "bg-slate-50 text-slate-800 border-slate-100",
      iconColor: "text-amber-600",
    },
    {
      title: "Buổi trưa (10h - 14h)",
      sub: "Hoạt động công việc",
      icon: Sun,
      data: circadianStats.noon,
      accent: "bg-slate-50 text-slate-800 border-slate-100",
      iconColor: "text-sky-600",
    },
    {
      title: "Chiều tối (14h - 18h)",
      sub: "Thời điểm sau giờ làm",
      icon: Sunset,
      data: circadianStats.evening,
      accent: "bg-slate-50 text-slate-800 border-slate-100",
      iconColor: "text-orange-600",
    },
    {
      title: "Ban đêm (18h - 06h)",
      sub: "Hạ huyết áp tự nhiên (Dipping)",
      icon: Moon,
      data: circadianStats.night,
      accent: "bg-slate-50 text-slate-800 border-slate-100",
      iconColor: "text-indigo-600",
    },
  ];
  return (
    <div className="glass-panel p-6 sm:p-8 rounded-xl border border-slate-200/60 flex flex-col shadow-sm hover-lift">
      {" "}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        {" "}
        <div>
          {" "}
          <h4 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {" "}
            Nhịp Sinh Học Huyết Áp 24 Giờ <span className="text-xs font-semibold px-2 py-1 bg-primary-50 text-primary-600 rounded-full">Premium</span>
          </h4>{" "}
          <p className="text-xs text-slate-500 mt-1">
            {" "}
            Theo dõi dao động huyết áp theo các mốc sinh học trong ngày{" "}
          </p>{" "}
        </div>{" "}
        {circadianStats.isMorningSurge && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
            {" "}
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />{" "}
            <span>
              Cảnh báo: Có dấu hiệu Tăng HA Sáng Sớm (Morning Surge)
            </span>{" "}
          </div>
        )}{" "}
      </div>{" "}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {" "}
        {buckets.map((b, i) => {
          const Icon = b.icon;
          return (
            <div
              key={i}
              className={`p-4 rounded-lg border ${b.accent} flex flex-col justify-between`}
            >
              {" "}
              <div className="flex items-center justify-between mb-3">
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <Icon className={`w-4 h-4 ${b.iconColor}`} />{" "}
                  <span className="font-bold text-xs">{b.title}</span>{" "}
                </div>{" "}
                <span className="text-[10px] font-mono opacity-60 font-semibold">
                  {b.data.count} lần đo
                </span>{" "}
              </div>{" "}
              <div className="space-y-1">
                {" "}
                {b.data.count > 0 ? (
                  <>
                    {" "}
                    <p className="text-xl font-mono font-black tracking-tight">
                      {" "}
                      {b.data.avgSys}/{b.data.avgDia}{" "}
                      <span className="text-xs font-normal opacity-70">
                        mmHg
                      </span>{" "}
                    </p>{" "}
                    <p className="text-[11px] opacity-80">
                      Nhịp tim TB: {b.data.avgHr} bpm
                    </p>{" "}
                  </>
                ) : (
                  <p className="text-xs italic opacity-60 py-2">
                    Chưa có dữ liệu lượt đo
                  </p>
                )}{" "}
              </div>{" "}
              <p className="text-[10px] opacity-60 border-t border-current/10 pt-2 mt-3 font-medium">
                {" "}
                {b.sub}{" "}
              </p>{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
    </div>
  );
};
