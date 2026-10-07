import React, { useState, useMemo } from "react";
import { Activity, Heart } from "lucide-react";
export const ClinicalAnalyticsChart = ({
  records,
  title = "Biểu Đồ Xu Hướng Huyết Áp & Chỉ Số Lâm Sàng",
  subtitle = "Phân tầng theo Tiêu chuẩn Tim mạch Quốc tế AHA / ESC",
  height = 360,
  showAhaZones = true,
  showMap: initialShowMap = false,
  showPulsePressure: initialShowPulse = false,
  onRecordClick,
}) => {
  const [timeFilter, setTimeFilter] = useState("30d");
  const [visibleMetrics, setVisibleMetrics] = useState({
    systolic: true,
    diastolic: true,
    heartRate: true,
    map: initialShowMap,
    pulsePressure: initialShowPulse,
  });
  const [hoveredRecord, setHoveredRecord] = useState(null); // Filter & sort records ascending by date
const sortedRecords = useMemo(() => {
    if (!records || records.length === 0) return [];
    const now = new Date().getTime();
    let cutoff = 0;
    if (timeFilter === "7d") cutoff = now - 7 * 86400000;
    else if (timeFilter === "30d") cutoff = now - 30 * 86400000;
    else if (timeFilter === "90d") cutoff = now - 90 * 86400000;
    return [...records]
      .filter((r) => !cutoff || new Date(r.recorded_at).getTime() >= cutoff)
      .sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
      );
  }, [records, timeFilter]); // Statistics calculation
const stats = useMemo(() => {
    if (sortedRecords.length === 0) return null;
    const sysArr = sortedRecords.map((r) => r.systolic);
    const diaArr = sortedRecords.map((r) => r.diastolic);
    const hrArr = sortedRecords.map((r) => r.heart_rate);
    const avgSys = Math.round(
      sysArr.reduce((a, b) => a + b, 0) / sysArr.length,
    );
    const avgDia = Math.round(
      diaArr.reduce((a, b) => a + b, 0) / diaArr.length,
    );
    const avgHr = Math.round(hrArr.reduce((a, b) => a + b, 0) / hrArr.length);
    const maxSys = Math.max(...sysArr);
    const maxDia = Math.max(...diaArr);
    const minSys = Math.min(...sysArr);
    const minDia = Math.min(...diaArr); // Mean Arterial Pressure (MAP) = (2*Dia + Sys)/3
const avgMap = Math.round((2 * avgDia + avgSys) / 3); // Pulse pressure = Sys - Dia
const avgPulsePressure = avgSys - avgDia; // AHA Classification of Average
let ahaCategory = "Bình thường";
    let ahaColor = "text-indigo-700 bg-indigo-50 border-indigo-200";
    if (avgSys >= 180 || avgDia >= 120) {
      ahaCategory = "Cơn tăng HA Khẩn cấp (Crisis)";
      ahaColor = "text-rose-900 bg-rose-100 border-rose-300";
    } else if (avgSys >= 140 || avgDia >= 90) {
      ahaCategory = "Tăng huyết áp Độ 2 (Stage 2)";
      ahaColor = "text-rose-700 bg-rose-50 border-rose-200";
    } else if (avgSys >= 130 || avgDia >= 80) {
      ahaCategory = "Tăng huyết áp Độ 1 (Stage 1)";
      ahaColor = "text-amber-800 bg-amber-50 border-amber-200";
    } else if (avgSys >= 120 && avgDia < 80) {
      ahaCategory = "Tiền tăng huyết áp (Elevated)";
      ahaColor = "text-amber-700 bg-amber-50/70 border-amber-100";
    }
    return {
      avgSys,
      avgDia,
      avgHr,
      maxSys,
      maxDia,
      minSys,
      minDia,
      avgMap,
      avgPulsePressure,
      ahaCategory,
      ahaColor,
    };
  }, [sortedRecords]); // Chart coordinates
const svgWidth = 800;
  const svgHeight = height;
  const padding = { top: 30, right: 30, bottom: 40, left: 50 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;
  const yMin = 40;
  const yMax = 200;
  const yScale = (val) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    return (
      padding.top +
      graphHeight -
      ((clamped - yMin) / (yMax - yMin)) * graphHeight
    );
  };
  const xScale = (index) => {
    if (sortedRecords.length <= 1) return padding.left + graphWidth / 2;
    return padding.left + (index / (sortedRecords.length - 1)) * graphWidth;
  }; // Generate SVG paths
const getPath = (getter) => {
    if (sortedRecords.length === 0) return "";
    return sortedRecords.reduce((acc, r, i) => {
      const x = xScale(i);
      const y = yScale(getter(r));
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
  };
  const sysPath = getPath((r) => r.systolic);
  const diaPath = getPath((r) => r.diastolic);
  const hrPath = getPath((r) => r.heart_rate);
  const mapPath = getPath((r) =>
    Math.round((2 * r.diastolic + r.systolic) / 3),
  );
  if (!records || records.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg border border-slate-100 flex flex-col items-center justify-center min-h-[300px]">
        {" "}
        <Activity className="w-10 h-10 text-slate-400 mb-2" />{" "}
        <p className="text-slate-500 font-bold text-sm">
          Chưa có dữ liệu sinh tồn
        </p>{" "}
        <p className="text-slate-500 text-xs mt-1">
          Các chỉ số đo huyết áp & nhịp tim sẽ hiển thị trực quan tại đây
        </p>{" "}
      </div>
    );
  }
  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg border border-slate-100 flex flex-col">
      {" "}
      {/* Header & Controls */}{" "}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        {" "}
        <div>
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />{" "}
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              {title}
            </h3>{" "}
          </div>{" "}
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>{" "}
        </div>{" "}
        {/* Time Filter & Metrics Toggles */}{" "}
        <div className="flex flex-wrap items-center gap-2">
          {" "}
          {/* Time range selector */}{" "}
          <div className="flex bg-slate-100/80 p-1 rounded-lg text-xs font-bold text-slate-600">
            {" "}
            {[
              { id: "7d", label: "7 Ngày" },
              { id: "30d", label: "30 Ngày" },
              { id: "90d", label: "3 Tháng" },
              { id: "all", label: "Toàn bộ" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${timeFilter === t.id ? "bg-white text-slate-900 shadow-xs font-black" : "hover:text-slate-900"}`}
              >
                {" "}
                {t.label}{" "}
              </button>
            ))}{" "}
          </div>{" "}
          {/* Metric Toggle Chips */}{" "}
          <div className="flex flex-wrap items-center gap-1.5">
            {" "}
            <button
              type="button"
              onClick={() =>
                setVisibleMetrics((v) => ({ ...v, systolic: !v.systolic }))
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${visibleMetrics.systolic ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-slate-50 border-slate-200 text-slate-500 opacity-60"}`}
            >
              {" "}
              <span className="w-2 h-2 rounded-full bg-rose-500" />{" "}
              <span>Tâm thu (Sys)</span>{" "}
            </button>{" "}
            <button
              type="button"
              onClick={() =>
                setVisibleMetrics((v) => ({ ...v, diastolic: !v.diastolic }))
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${visibleMetrics.diastolic ? "bg-sky-50 border-sky-200 text-sky-700" : "bg-slate-50 border-slate-200 text-slate-500 opacity-60"}`}
            >
              {" "}
              <span className="w-2 h-2 rounded-full bg-sky-500" />{" "}
              <span>Tâm trương (Dia)</span>{" "}
            </button>{" "}
            <button
              type="button"
              onClick={() =>
                setVisibleMetrics((v) => ({ ...v, heartRate: !v.heartRate }))
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${visibleMetrics.heartRate ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-500 opacity-60"}`}
            >
              {" "}
              <Heart className="w-3 h-3 text-amber-500" />{" "}
              <span>Nhịp tim (Bpm)</span>{" "}
            </button>{" "}
            <button
              type="button"
              onClick={() => setVisibleMetrics((v) => ({ ...v, map: !v.map }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${visibleMetrics.map ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-slate-50 border-slate-200 text-slate-500 opacity-60"}`}
              title="Áp lực động mạch trung bình (Mean Arterial Pressure)"
            >
              {" "}
              <span>MAP</span>{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Clinical KPI Ribbon */}{" "}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 p-3.5 sm:p-4 bg-slate-50 rounded-lg sm:rounded-lg border border-slate-100 mb-6 text-xs">
          {" "}
          <div>
            {" "}
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Huyết áp TB
            </span>{" "}
            <span className="text-sm sm:text-base font-bold font-mono text-slate-900">
              {" "}
              {stats.avgSys}/{stats.avgDia}{" "}
              <span className="text-xs font-normal text-slate-500">
                mmHg
              </span>{" "}
            </span>{" "}
          </div>{" "}
          <div>
            {" "}
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Phân loại lâm sàng
            </span>{" "}
            <span
              className={`inline-block px-2 py-0.5 rounded-lg border text-[10px] sm:text-[11px] font-bold ${stats.ahaColor}`}
            >
              {" "}
              {stats.ahaCategory}{" "}
            </span>{" "}
          </div>{" "}
          <div>
            {" "}
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Nhịp tim TB
            </span>{" "}
            <span className="text-sm sm:text-base font-bold font-mono text-amber-800">
              {" "}
              {stats.avgHr}{" "}
              <span className="text-xs font-normal text-slate-500">
                bpm
              </span>{" "}
            </span>{" "}
          </div>{" "}
          <div>
            {" "}
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Biên độ áp lực (PP)
            </span>{" "}
            <span className="text-sm sm:text-base font-bold font-mono text-indigo-700">
              {" "}
              {stats.avgPulsePressure}{" "}
              <span className="text-xs font-normal text-slate-500">
                mmHg
              </span>{" "}
            </span>{" "}
          </div>{" "}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            {" "}
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Số lượt đo
            </span>{" "}
            <span className="text-sm sm:text-base font-bold font-mono text-slate-700">
              {" "}
              {sortedRecords.length}{" "}
              <span className="text-xs font-normal text-slate-500">
                bản ghi
              </span>{" "}
            </span>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* SVG Interactive Multi-Zone Graph with horizontal scroll if needed */}{" "}
      <div className="relative w-full overflow-x-auto pb-2">
        {" "}
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[500px] select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          {" "}
          <defs>
            {" "}
            {/* Gradient for area below systolic */}{" "}
            <linearGradient id="sysGradient" x1="0" y1="0" x2="0" y2="1">
              {" "}
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />{" "}
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />{" "}
            </linearGradient>{" "}
            {/* Gradient for area below diastolic */}{" "}
            <linearGradient id="diaGradient" x1="0" y1="0" x2="0" y2="1">
              {" "}
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />{" "}
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />{" "}
            </linearGradient>{" "}
          </defs>{" "}
          {/* AHA Background Safety & Risk Zones */}
          {showAhaZones && (
            <g className="aha-zones opacity-10">
              {" "}
              {/* Hypertensive Crisis >= 180 */}{" "}
              <rect
                x={padding.left}
                y={yScale(200)}
                width={graphWidth}
                height={yScale(180) - yScale(200)}
                fill="#fee2e2"
              />{" "}
              {/* Stage 2: 140 - 180 */}{" "}
              <rect
                x={padding.left}
                y={yScale(180)}
                width={graphWidth}
                height={yScale(140) - yScale(180)}
                fill="#ffedd5"
              />{" "}
              {/* Stage 1: 130 - 140 */}{" "}
              <rect
                x={padding.left}
                y={yScale(140)}
                width={graphWidth}
                height={yScale(130) - yScale(140)}
                fill="#fef9c3"
              />{" "}
              {/* Elevated: 120 - 130 */}{" "}
              <rect
                x={padding.left}
                y={yScale(130)}
                width={graphWidth}
                height={yScale(120) - yScale(130)}
                fill="#fef08a"
              />{" "}
              {/* Normal < 120 */}{" "}
              <rect
                x={padding.left}
                y={yScale(120)}
                width={graphWidth}
                height={yScale(40) - yScale(120)}
                fill="#dcfce7"
              />{" "}
            </g>
          )}{" "}
          {/* Grid lines & Y-Axis values */}{" "}
          {[60, 80, 100, 120, 140, 160, 180].map((val) => {
            const y = yScale(val);
            return (
              <g key={val}>
                {" "}
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={
                    val === 120 || val === 80 || val === 140 ? "4 4" : "2 2"
                  }
                  strokeWidth={val === 120 || val === 80 ? "1.5" : "1"}
                />{" "}
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] font-mono font-bold fill-slate-400"
                >
                  {" "}
                  {val}{" "}
                </text>{" "}
              </g>
            );
          })}{" "}
          {/* Reference Line Badges on right axis */}{" "}
          <text
            x={svgWidth - padding.right + 6}
            y={yScale(180) + 4}
            className="text-[9px] font-bold fill-rose-600"
          >
            {" "}
            CRISIS (180){" "}
          </text>{" "}
          <text
            x={svgWidth - padding.right + 6}
            y={yScale(140) + 4}
            className="text-[9px] font-bold fill-amber-700"
          >
            {" "}
            STAGE 2 (140){" "}
          </text>{" "}
          <text
            x={svgWidth - padding.right + 6}
            y={yScale(120) + 4}
            className="text-[9px] font-bold fill-indigo-600"
          >
            {" "}
            TARGET (120){" "}
          </text>{" "}
          {/* MAP Line */}
          {visibleMetrics.map && mapPath && (
            <path
              d={mapPath}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}{" "}
          {/* Heart Rate Line */}{" "}
          {visibleMetrics.heartRate && hrPath && (
            <path
              d={hrPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )}{" "}
          {/* Diastolic Line */}{" "}
          {visibleMetrics.diastolic && diaPath && (
            <path
              d={diaPath}
              fill="none"
              stroke="#0284c7"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )}{" "}
          {/* Systolic Line */}{" "}
          {visibleMetrics.systolic && sysPath && (
            <path
              d={sysPath}
              fill="none"
              stroke="#e11d48"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )}{" "}
          {/* Interactive Data Points & Hover Targets */}{" "}
          {sortedRecords.map((r, i) => {
            const x = xScale(i);
            const ySys = yScale(r.systolic);
            const yDia = yScale(r.diastolic);
            const yHr = yScale(r.heart_rate);
            const isCrisis = r.systolic >= 180 || r.diastolic >= 120;
            return (
              <g
                key={r.id || i}
                className="cursor-pointer group"
                onClick={() => onRecordClick && onRecordClick(r)}
                onMouseEnter={() =>
                  setHoveredRecord({ record: r, x, ySys, yDia })
                }
                onMouseLeave={() => setHoveredRecord(null)}
              >
                {" "}
                {/* Vertical hover track line */}{" "}
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={svgHeight - padding.bottom}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />{" "}
                {/* Connecting bar between Sys and Dia for each measurement */}{" "}
                {visibleMetrics.systolic && visibleMetrics.diastolic && (
                  <line
                    x1={x}
                    y1={ySys}
                    x2={x}
                    y2={yDia}
                    stroke="#f43f5e"
                    strokeWidth="2"
                    strokeOpacity="0.4"
                  />
                )}{" "}
                {/* Systolic Point */}{" "}
                {visibleMetrics.systolic && (
                  <circle
                    cx={x}
                    cy={ySys}
                    r={2}
                    fill={isCrisis ? "#b91c1c" : "#e11d48"}
                    stroke="#ffffff"
                    strokeWidth="1"
                    className="transition-transform group-hover:scale-[2]"
                  />
                )}{" "}
                {/* Diastolic Point */}{" "}
                {visibleMetrics.diastolic && (
                  <circle
                    cx={x}
                    cy={yDia}
                    r={2}
                    fill="#0284c7"
                    stroke="#ffffff"
                    strokeWidth="1"
                    className="transition-transform group-hover:scale-[2]"
                  />
                )}{" "}
                {/* Heart Rate Point */}{" "}
                {visibleMetrics.heartRate && (
                  <circle
                    cx={x}
                    cy={yHr}
                    r={1.5}
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                )}{" "}
              </g>
            );
          })}{" "}
          {/* X-Axis Date markers */}{" "}
          {sortedRecords.map((r, i) => {
            // Show date on 1st, middle, and last points or evenly spaced
const step = Math.max(1, Math.floor(sortedRecords.length / 5));
            if (i === 0 || i === sortedRecords.length - 1 || i % step === 0) {
              const x = xScale(i);
              const dateStr = new Date(r.recorded_at).toLocaleDateString(
                "vi-VN",
                { day: "2-digit", month: "2-digit" },
              );
              return (
                <text
                  key={`date-${i}`}
                  x={x}
                  y={svgHeight - padding.bottom + 18}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-bold fill-slate-400"
                >
                  {" "}
                  {dateStr}{" "}
                </text>
              );
            }
            return null;
          })}{" "}
        </svg>{" "}
        {/* Hover Tooltip Overlay */}{" "}
        {hoveredRecord && (
          <div
            className="absolute z-30 bg-slate-900 text-white p-3 rounded-lg  border border-slate-800 pointer-events-none transition-all"
            style={{
              left: `${Math.min(Math.max(10, (hoveredRecord.x / svgWidth) * 100), 75)}%`,
              top: `${Math.max(10, (hoveredRecord.ySys / svgHeight) * 100 - 15)}%`,
            }}
          >
            {" "}
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5 mb-2">
              {" "}
              <span className="text-[11px] text-slate-500 font-mono">
                {" "}
                {new Date(hoveredRecord.record.recorded_at).toLocaleString(
                  "vi-VN",
                )}{" "}
              </span>{" "}
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                {" "}
                Lượt đo #{hoveredRecord.record.id}{" "}
              </span>{" "}
            </div>{" "}
            <div className="space-y-1 text-xs">
              {" "}
              <div className="flex justify-between items-center gap-4">
                {" "}
                <span className="text-slate-500">Huyết áp:</span>{" "}
                <span className="font-mono font-bold text-sm text-white">
                  {" "}
                  <span className="text-rose-600">
                    {hoveredRecord.record.systolic}
                  </span>{" "}
                  /{" "}
                  <span className="text-sky-400">
                    {hoveredRecord.record.diastolic}
                  </span>{" "}
                  mmHg{" "}
                </span>{" "}
              </div>{" "}
              <div className="flex justify-between items-center gap-4">
                {" "}
                <span className="text-slate-500">Nhịp tim:</span>{" "}
                <span className="font-mono font-bold text-amber-600">
                  {" "}
                  {hoveredRecord.record.heart_rate} bpm{" "}
                </span>{" "}
              </div>{" "}
              <div className="flex justify-between items-center gap-4">
                {" "}
                <span className="text-slate-500">Cân nặng:</span>{" "}
                <span className="font-mono font-bold text-indigo-600">
                  {" "}
                  {hoveredRecord.record.weight} kg{" "}
                </span>{" "}
              </div>{" "}
              {hoveredRecord.record.notes && (
                <p className="text-[11px] text-slate-400 italic border-t border-slate-800 pt-1.5 mt-1">
                  "{hoveredRecord.record.notes}"{" "}
                </p>
              )}{" "}
            </div>{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* AHA Clinical Legend Guide */}{" "}
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 font-medium">
        {" "}
        <div className="flex flex-wrap items-center gap-3">
          {" "}
          <span className="font-bold text-slate-700">
            Tiêu chuẩn phân tầng AHA/ACC:
          </span>{" "}
          <span className="inline-flex items-center gap-1.5">
            {" "}
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />{" "}
            <span>Bình thường (&lt;120/80)</span>{" "}
          </span>{" "}
          <span className="inline-flex items-center gap-1.5">
            {" "}
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />{" "}
            <span>Tiền tăng HA (120-129)</span>{" "}
          </span>{" "}
          <span className="inline-flex items-center gap-1.5">
            {" "}
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />{" "}
            <span>Độ 1 (130-139/80-89)</span>{" "}
          </span>{" "}
          <span className="inline-flex items-center gap-1.5">
            {" "}
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />{" "}
            <span>Độ 2 (&ge;140/90)</span>{" "}
          </span>{" "}
          <span className="inline-flex items-center gap-1.5">
            {" "}
            <span className="w-2.5 h-2.5 rounded-full bg-rose-900" />{" "}
            <span>Khẩn cấp (&ge;180/120)</span>{" "}
          </span>{" "}
        </div>{" "}
        <span className="text-[10px] font-mono text-slate-500">
          {" "}
          Chỉ số MAP = (2×Dia + Sys) ÷ 3 | PP = Sys - Dia{" "}
        </span>{" "}
      </div>{" "}
    </div>
  );
};
