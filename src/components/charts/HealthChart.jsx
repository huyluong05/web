import React, { useState } from "react";
export const HealthChart = ({
  records,
  type = "weight",
  timeRange = "30d",
  onTimeRangeChange,
  title,
  subtitle = "/ Last 30 Days",
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null); // Toggle active record on mobile tap
const handleBarTap = (idx) => {
    setHoveredIdx((prev) => (prev === idx ? null : idx));
  }; // Default title based on type
const chartTitle =
    title ||
    (type === "weight"
      ? "Weight Journey"
      : type === "blood_pressure"
        ? "Huyết áp (Systolic / Diastolic)"
        : "Nhịp tim (Heart Rate)");
  if (!records || records.length === 0) {
    return (
      <div className="bg-white p-6 sm:p-8 rounded-lg border border-slate-100 flex flex-col items-center justify-center min-h-[240px] sm:min-h-[280px]">
        {" "}
        <p className="text-slate-500 text-sm font-medium text-center">
          Chưa có dữ liệu biểu đồ cho khoảng thời gian này.
        </p>{" "}
      </div>
    );
  }
// Minimum width based on record count to prevent squishing on mobile
const minVisualizerWidth =
    records.length > 7 ? `${records.length * 28}px` : "100%"; // Calculate scales
if (type === "weight") {
    const weights = records.map((r) => r.weight);
    const minW = Math.max(0, Math.min(...weights) - 2);
    const maxW = Math.max(...weights) + 2;
    const range = maxW - minW || 1;
    return (
      <div className="bg-white p-6 sm:p-8 rounded-lg border border-slate-200 flex flex-col flex-1">
        {" "}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          {" "}
          <div>
            {" "}
            <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
              {" "}
              {chartTitle}{" "}
              <span className="text-slate-500 font-medium ml-1 text-xs sm:text-sm">
                {subtitle}
              </span>{" "}
            </h3>{" "}
          </div>{" "}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {" "}
            {onTimeRangeChange && (
              <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-500">
                {" "}
                {["7d", "30d", "3m"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onTimeRangeChange(r)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${timeRange === r ? "bg-white text-primary-700  shadow-primary-500/10 font-bold border border-slate-200" : "hover:text-slate-900 hover:bg-slate-200/50"}`}
                  >
                    {" "}
                    {r === "7d"
                      ? "7 Ngày"
                      : r === "30d"
                        ? "30 Ngày"
                        : "3 Tháng"}{" "}
                  </button>
                ))}{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
        {/* Scrollable Container on small screens */}{" "}
        <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
          {" "}
          <div
            style={{ minWidth: minVisualizerWidth }}
            className="flex-1 flex items-end justify-between gap-2 sm:gap-4 px-2 min-h-[180px] sm:min-h-[220px] pb-4 pt-10 relative"
          >
            {" "}
            {records.map((rec, idx) => {
              const heightPercent = Math.min(
                95,
                Math.max(15, ((rec.weight - minW) / range) * 85 + 15),
              );
              const isLatest = idx === records.length - 1;
              const isHovered = hoveredIdx === idx;
              return (
                <div
                  key={rec.id || idx}
                  className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                  onClick={() => handleBarTap(idx)}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {" "}
                  {isHovered && (
                    <div className="absolute -top-14 z-20 bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded-md  whitespace-nowrap pointer-events-none">
                      {" "}
                      <span className="text-primary-400">
                        {rec.weight} kg
                      </span>{" "}
                      <span className="text-slate-500 ml-2 font-medium">
                        {" "}
                        {new Date(rec.recorded_at).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                        })}{" "}
                      </span>{" "}
                    </div>
                  )}{" "}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[48px] rounded-t-sm transition-all duration-300 relative overflow-hidden ${isLatest || isHovered ? "bg-primary-500 text-white" : "bg-primary-100 hover:bg-primary-200"}`}
                  >
                    {" "}
                  </div>{" "}
                </div>
              );
            })}{" "}
          </div>{" "}
        </div>{" "}
        {/* X-Axis labels */}{" "}
        <div className="flex justify-between text-[11px] text-slate-500 font-bold uppercase tracking-widest pt-4 border-t border-slate-100 mt-2">
          {" "}
          <span>
            {new Date(records[0]?.recorded_at).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "short",
            })}
          </span>{" "}
          <span>Hôm nay</span>{" "}
        </div>{" "}
      </div>
    );
  }
  if (type === "blood_pressure") {
    const sysValues = records.map((r) => r.systolic);
    const diaValues = records.map((r) => r.diastolic);
    const maxVal = Math.max(...sysValues, 140) + 10;
    const minVal = Math.min(...diaValues, 60) - 10;
    const range = maxVal - minVal || 1;
    return (
      <div className="bg-white p-5 sm:p-8 rounded-lg border border-slate-100 flex flex-col flex-1">
        {" "}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-6">
          {" "}
          <div>
            {" "}
            <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
              {" "}
              {chartTitle}{" "}
              <span className="text-slate-400 font-normal ml-1 text-xs sm:text-sm">
                {subtitle}
              </span>{" "}
            </h3>{" "}
          </div>{" "}
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            {" "}
            <div className="flex items-center gap-1.5 text-rose-600">
              {" "}
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />{" "}
              <span>Tâm thu</span>{" "}
            </div>{" "}
            <div className="flex items-center gap-1.5 text-sky-600">
              {" "}
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />{" "}
              <span>Tâm trương</span>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div className="w-full overflow-x-auto pb-2">
          {" "}
          <div
            style={{ minWidth: minVisualizerWidth }}
            className="flex-1 flex items-end justify-between gap-2 sm:gap-4 px-2 min-h-[160px] sm:min-h-[180px] pb-3 pt-8 relative"
          >
            {" "}
            {records.map((rec, idx) => {
              const sysHeight = Math.min(
                95,
                Math.max(20, ((rec.systolic - minVal) / range) * 90),
              );
              const diaHeight = Math.min(
                90,
                Math.max(10, ((rec.diastolic - minVal) / range) * 90),
              );
              const isHovered = hoveredIdx === idx;
              return (
                <div
                  key={rec.id || idx}
                  className="flex-1 flex items-end justify-center gap-1 h-full relative group cursor-pointer"
                  onClick={() => handleBarTap(idx)}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {" "}
                  {isHovered && (
                    <div className="absolute -top-12 z-20 bg-slate-900 text-white text-[11px] font-semibold py-1.5 px-3 rounded-md  whitespace-nowrap pointer-events-none">
                      {" "}
                      <span className="text-rose-600 font-bold">
                        {rec.systolic}
                      </span>{" "}
                      <span className="text-slate-500">/</span>{" "}
                      <span className="text-sky-400 font-bold">
                        {rec.diastolic} mmHg
                      </span>{" "}
                    </div>
                  )}{" "}
                  <div
                    style={{ height: `${sysHeight}%` }}
                    className="w-1/2 max-w-[20px] bg-rose-500 rounded-t-sm"
                  />{" "}
                  <div
                    style={{ height: `${diaHeight}%` }}
                    className="w-1/2 max-w-[20px] bg-sky-500 rounded-t-sm"
                  />{" "}
                </div>
              );
            })}{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex justify-between text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-wider pt-3 border-t border-slate-100">
          {" "}
          <span>
            {new Date(records[0]?.recorded_at).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "short",
            })}
          </span>{" "}
          <span>Hôm nay</span>{" "}
        </div>{" "}
      </div>
    );
  }
// Heart rate chart
const hrValues = records.map((r) => r.heart_rate);
  const minHr = Math.min(...hrValues, 55) - 5;
  const maxHr = Math.max(...hrValues, 95) + 5;
  const hrRange = maxHr - minHr || 1;
  return (
    <div className="bg-white p-5 sm:p-8 rounded-lg border border-slate-100 flex flex-col flex-1">
      {" "}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-6">
        {" "}
        <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
          {" "}
          {chartTitle}{" "}
          <span className="text-slate-400 font-normal ml-1 text-xs sm:text-sm">
            {subtitle}
          </span>{" "}
        </h3>{" "}
        <div className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/60 self-start sm:self-auto">
          {" "}
          Trung bình:{" "}
          {Math.round(
            hrValues.reduce((a, b) => a + b, 0) / hrValues.length,
          )}{" "}
          bpm{" "}
        </div>{" "}
      </div>{" "}
      <div className="w-full overflow-x-auto pb-2">
        {" "}
        <div
          style={{ minWidth: minVisualizerWidth }}
          className="flex-1 flex items-end justify-between gap-2 sm:gap-4 px-2 min-h-[160px] sm:min-h-[180px] pb-3 pt-8 relative"
        >
          {" "}
          {records.map((rec, idx) => {
            const heightPercent = Math.min(
              95,
              Math.max(15, ((rec.heart_rate - minHr) / hrRange) * 85 + 15),
            );
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={rec.id || idx}
                className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer"
                onClick={() => handleBarTap(idx)}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {" "}
                {isHovered && (
                  <div className="absolute -top-12 z-20 bg-slate-900 text-white text-[11px] font-semibold py-1.5 px-3 rounded-md  whitespace-nowrap pointer-events-none">
                    {" "}
                    <span className="font-bold text-amber-600">
                      {rec.heart_rate} bpm
                    </span>{" "}
                    <span className="text-slate-500 ml-1.5">
                      {" "}
                      {new Date(rec.recorded_at).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                      })}{" "}
                    </span>{" "}
                  </div>
                )}{" "}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[36px] bg-amber-500 hover:bg-amber-600 rounded-t-sm transition-all"
                />{" "}
              </div>
            );
          })}{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex justify-between text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-wider pt-3 border-t border-slate-100">
        {" "}
        <span>
          {new Date(records[0]?.recorded_at).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "short",
          })}
        </span>{" "}
        <span>Hôm nay</span>{" "}
      </div>{" "}
    </div>
  );
};
