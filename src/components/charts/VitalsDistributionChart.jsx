import React, { useMemo } from "react";
import { metricRecords } from '../../utils/metrics';
export const VitalsDistributionChart = ({
  records,
  title = "Phân Bố Tỷ Lệ Nguy Cơ Tim Mạch (AHA/ACC Classification)",
}) => {
  records = useMemo(() => metricRecords(records, ['systolic', 'diastolic']), [records]);
  const distribution = useMemo(() => {
    if (!records || records.length === 0) return null;
    let normal = 0;
    let elevated = 0;
    let stage1 = 0;
    let stage2 = 0;
    let crisis = 0;
    records.forEach((r) => {
      if (r.systolic >= 180 || r.diastolic >= 120) crisis++;
      else if (r.systolic >= 140 || r.diastolic >= 90) stage2++;
      else if (r.systolic >= 130 || r.diastolic >= 80) stage1++;
      else if (r.systolic >= 120 && r.diastolic < 80) elevated++;
      else normal++;
    });
    const total = records.length;
    return [
      {
        name: "Bình thường (<120/80)",
        count: normal,
        percent: Math.round((normal / total) * 100),
        color: "#10b981",
        /* indigo-500 */ bgClass:
          "bg-indigo-50 text-indigo-800 border-indigo-200",
        barColor: "bg-indigo-500",
      },
      {
        name: "Tiền tăng HA (120-129)",
        count: elevated,
        percent: Math.round((elevated / total) * 100),
        color: "#facc15",
        /* yellow-400 */ bgClass:
          "bg-yellow-50 text-yellow-800 border-yellow-200",
        barColor: "bg-yellow-400",
      },
      {
        name: "Tăng HA Độ 1 (130-139)",
        count: stage1,
        percent: Math.round((stage1 / total) * 100),
        color: "#f97316",
        /* orange-500 */ bgClass:
          "bg-orange-50 text-orange-800 border-orange-200",
        barColor: "bg-orange-500",
      },
      {
        name: "Tăng HA Độ 2 (≥140/90)",
        count: stage2,
        percent: Math.round((stage2 / total) * 100),
        color: "#ef4444",
        /* red-500 */ bgClass: "bg-rose-50 text-rose-800 border-rose-200",
        barColor: "bg-rose-500",
      },
      {
        name: "Cơn Khẩn Cấp (≥180/120)",
        count: crisis,
        percent: Math.round((crisis / total) * 100),
        color: "#881337",
        /* rose-900 */ bgClass:
          "bg-rose-100 text-rose-950 border-rose-300 font-bold",
        barColor: "bg-rose-900",
      },
    ];
  }, [records]);
  if (!distribution || records.length === 0) {
    return null;
  }
// Calculate SVG Donut segments
let cumulativeAngle = 0;
  const radius = 60;
  const strokeWidth = 16;
  const center = 80;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg border border-slate-100 flex flex-col">
      {" "}
      <div className="flex items-center justify-between mb-6">
        {" "}
        <div>
          {" "}
          <h4 className="text-base font-bold text-slate-900 tracking-tight">
            {title}
          </h4>{" "}
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng số {records.length} lượt đo huyết áp đã ghi nhận
          </p>{" "}
        </div>{" "}
      </div>{" "}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {" "}
        {/* SVG Donut Chart */}{" "}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          {" "}
          <div className="relative w-44 h-44 flex items-center justify-center">
            {" "}
            <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
              {" "}
              {distribution.map((item, idx) => {
                const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -(
                  (cumulativeAngle / 100) *
                  circumference
                );
                cumulativeAngle += item.percent;
                if (item.count === 0) return null;
                return (
                  <circle
                    key={idx}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500 hover:opacity-80"
                  />
                );
              })}{" "}
            </svg>{" "}
            {/* Inner text */}{" "}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              {" "}
              <span className="text-2xl font-bold font-mono text-slate-900">
                {records.length}
              </span>{" "}
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Lượt đo
              </span>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {/* Breakdown Progress Bars & Count list */}{" "}
        <div className="md:col-span-7 space-y-3">
          {" "}
          {distribution.map((item, idx) => (
            <div key={idx} className="space-y-1">
              {" "}
              <div className="flex justify-between items-center text-xs font-semibold">
                {" "}
                <span className="text-slate-700">{item.name}</span>{" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <span className="text-slate-500 font-mono text-[11px]">
                    {item.count} lượt
                  </span>{" "}
                  <span className="font-mono font-bold text-slate-900">
                    {item.percent}%
                  </span>{" "}
                </div>{" "}
              </div>{" "}
              {/* Progress track */}{" "}
              <div className="w-full bg-slate-100 h-2 rounded-sm overflow-hidden">
                {" "}
                <div
                  className={`h-full rounded-sm transition-all duration-500 ${item.barColor}`}
                  style={{ width: `${item.percent}%` }}
                />{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
