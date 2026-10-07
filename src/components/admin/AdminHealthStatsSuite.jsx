import React, { useState, useEffect } from "react";
import { adminApi } from "../../api/client";
import {
  Users,
  Activity,
  Heart,
  Scale,
  PieChart as PieChartIcon,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Info,
} from "lucide-react";
export const AdminHealthStatsSuite = ({ initialRange = "30d" }) => {
  const [range, setRange] = useState(initialRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchStatistics = async (selectedRange) => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getSystemStatistics(selectedRange);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || "Không thể tải dữ liệu thống kê từ hệ thống.");
      }
    } catch (err) {
      console.error("Error fetching admin statistics:", err);
      setError(err.message || "Đã xảy ra lỗi khi kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchStatistics(range);
  }, [range]);
  const rangeLabels = {
    "7d": "7 ngày qua",
    "30d": "30 ngày qua",
    "3m": "3 tháng qua",
    "12m": "12 tháng qua",
  };
  return (
    <div className="space-y-8">
      {" "}
      {/* Control Bar Header */}{" "}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-100 ">
        {" "}
        <div>
          {" "}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 text-[11px] font-bold uppercase tracking-wider mb-1">
            {" "}
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />{" "}
            <span>Admin Data Aggregation Engine</span>{" "}
          </div>{" "}
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {" "}
            Thống Kê Dữ Liệu Sức Khỏe Toàn Hệ Thống{" "}
          </h2>{" "}
          <p className="text-xs text-slate-500 mt-0.5">
            {" "}
            Dữ liệu tổng hợp thực tế của toàn bộ người dùng theo thời gian (
            {rangeLabels[range]}){" "}
          </p>{" "}
        </div>{" "}
        {/* Time Range Selector */}{" "}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {" "}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-bold text-slate-600">
            {" "}
            {["7d", "30d", "3m", "12m"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${range === r ? "bg-white text-slate-900 shadow-xs font-extrabold" : "hover:text-slate-900"}`}
              >
                {" "}
                {r === "7d"
                  ? "7 Ngày"
                  : r === "30d"
                    ? "30 Ngày"
                    : r === "3m"
                      ? "3 Tháng"
                      : "12 Tháng"}{" "}
              </button>
            ))}{" "}
          </div>{" "}
          <button
            onClick={() => fetchStatistics(range)}
            disabled={loading}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu thống kê"
          >
            {" "}
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin text-amber-600" : ""}`}
            />{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Loading State */}{" "}
      {loading && (
        <div className="bg-white p-12 rounded-lg border border-slate-100  flex flex-col items-center justify-center text-center min-h-[360px]">
          {" "}
          <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mb-3" />{" "}
          <p className="text-sm font-bold text-slate-700">
            Đang tổng hợp dữ liệu toàn viện...
          </p>{" "}
          <p className="text-xs text-slate-500 mt-1">
            {" "}
            Hệ thống đang truy vấn database, tính toán count, average, min, max
            và phân loại sức khỏe{" "}
          </p>{" "}
        </div>
      )}{" "}
      {/* Error State */}{" "}
      {!loading && error && (
        <div className="bg-rose-50/70 p-6 rounded-lg border border-rose-200 text-rose-800 flex items-start gap-4">
          {" "}
          <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />{" "}
          <div className="flex-1">
            {" "}
            <h3 className="text-sm font-bold">
              Không thể tải dữ liệu thống kê
            </h3>{" "}
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>{" "}
            <button
              onClick={() => fetchStatistics(range)}
              className="mt-3 px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-rose-700 transition-all cursor-pointer"
            >
              {" "}
              Thử lại ngay{" "}
            </button>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Ready State */}{" "}
      {!loading && !error && data && (
        <>
          {" "}
          {/* Top 4 Macro Metric Badges */}{" "}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {" "}
            <div className="bg-white p-5 rounded-lg border border-slate-100 ">
              {" "}
              <div className="flex items-center justify-between mb-2">
                {" "}
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tổng User Toàn Viện
                </span>{" "}
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  {" "}
                  <Users className="w-4 h-4" />{" "}
                </div>{" "}
              </div>{" "}
              <p className="text-2xl font-bold text-slate-900">
                {data.summary.totalUsers}
              </p>{" "}
              <p className="text-[11px] text-indigo-600 font-bold mt-1">
                {" "}
                +{data.summary.newUsersInRange} tài khoản mới (
                {rangeLabels[range]}){" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-white p-5 rounded-lg border border-slate-100 ">
              {" "}
              <div className="flex items-center justify-between mb-2">
                {" "}
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tổng Bản Ghi Đo
                </span>{" "}
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  {" "}
                  <Activity className="w-4 h-4" />{" "}
                </div>{" "}
              </div>{" "}
              <p className="text-2xl font-bold text-slate-900">
                {data.summary.totalHealthRecords}
              </p>{" "}
              <p className="text-[11px] text-indigo-700 font-bold mt-1">
                {" "}
                {data.summary.recordsInRange} bản ghi đo ({rangeLabels[range]}
                ){" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-white p-5 rounded-lg border border-slate-100 ">
              {" "}
              <div className="flex items-center justify-between mb-2">
                {" "}
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Huyết Áp TB Hệ Thống
                </span>{" "}
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  {" "}
                  <Heart className="w-4 h-4" />{" "}
                </div>{" "}
              </div>{" "}
              <p className="text-2xl font-bold text-rose-700">
                {" "}
                {data.summary.overallAvgSystolic ?? "--"} /{" "}
                {data.summary.overallAvgDiastolic ?? "--"}{" "}
                <span className="text-xs text-slate-500 font-normal ml-1">
                  mmHg
                </span>{" "}
              </p>{" "}
              <p className="text-[11px] text-slate-500 mt-1">
                Tâm thu / Tâm trương trung bình
              </p>{" "}
            </div>{" "}
            <div className="bg-white p-5 rounded-lg border border-slate-100 ">
              {" "}
              <div className="flex items-center justify-between mb-2">
                {" "}
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Cân Nặng & Tim TB
                </span>{" "}
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  {" "}
                  <Scale className="w-4 h-4" />{" "}
                </div>{" "}
              </div>{" "}
              <p className="text-2xl font-bold text-indigo-700">
                {" "}
                {data.summary.overallAvgWeight ?? "--"}{" "}
                <span className="text-xs text-slate-500 font-normal">kg</span>{" "}
                <span className="text-slate-400 mx-1.5 font-light">|</span>{" "}
                <span className="text-amber-600 font-bold">
                  {data.summary.overallAvgHeartRate ?? "--"}
                </span>{" "}
                <span className="text-xs text-slate-500 font-normal">
                  bpm
                </span>{" "}
              </p>{" "}
              <p className="text-[11px] text-slate-500 mt-1">
                Cân nặng & Nhịp tim trung bình
              </p>{" "}
            </div>{" "}
          </div>{" "}
          {/* ======================================================= */}{" "}
          {/* 6 REQUIRED ADMIN CHARTS GRID */}{" "}
          {/* ======================================================= */}{" "}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {" "}
            {/* 1. CHART 1: TỔNG SỐ NGƯỜI DÙNG & USER MỚI */}{" "}
            <AdminSvgBarLineChart
              title="1. Thống Kê Người Dùng Toàn Hệ Thống"
              subtitle={`Tổng User tích lũy & số lượng User mới đăng ký theo ${range === "12m" ? "tháng" : "ngày"}`}
              unit="Người dùng"
              icon={<Users className="w-5 h-5 text-amber-600" />}
              data={data.timeSeries}
              barKey="newUsersCount"
              barName="User Mới"
              barColor="#f59e0b"
              lineKey="totalUsersCumulative"
              lineName="Tổng User Tích Lũy"
              lineColor="#0f172a"
              footerText={`Khoảng thời gian: ${rangeLabels[range]} • Tổng cộng: ${data.summary.totalUsers} tài khoản`}
            />{" "}
            {/* 2. CHART 2: SỐ LƯỢNG BẢN GHI SỨC KHỎE */}{" "}
            <AdminSvgBarChart
              title="2. Khối Lượng Bản Ghi Sức Khỏe Hệ Thống"
              subtitle="Tổng số lượt đo sinh tồn phát sinh của toàn bộ người dùng theo thời gian"
              unit="Bản ghi"
              icon={<Activity className="w-5 h-5 text-indigo-600" />}
              data={data.timeSeries}
              barKey="recordsCount"
              barName="Số Bản Ghi Đo"
              barColor="#0d9488"
              footerText={`Khoảng thời gian: ${rangeLabels[range]} • Tổng ghi nhận: ${data.summary.recordsInRange} lượt`}
            />{" "}
            {/* 3. CHART 3: THỐNG KÊ CÂN NẶNG TRUNG BÌNH (AVG/MIN/MAX) */}{" "}
            <AdminSvgMultiLineChart
              title="3. Thống Kê Cân Nặng Trung Bình Toàn Viện"
              subtitle="Giá trị trung bình cân nặng toàn bộ User kèm dải biến thiên Min - Max"
              unit="kg"
              icon={<Scale className="w-5 h-5 text-indigo-600" />}
              data={data.timeSeries}
              mainLineKey="avgWeight"
              mainLineName="Cân Nặng TB"
              mainLineColor="#4f46e5"
              minLineKey="minWeight"
              minLineName="Cân Nặng Min"
              maxLineKey="maxWeight"
              maxLineName="Cân Nặng Max"
              overallAvg={data.summary.overallAvgWeight}
              footerText={`Khoảng thời gian: ${rangeLabels[range]} • TB Toàn viện: ${data.summary.overallAvgWeight ?? "--"} kg`}
            />{" "}
            {/* 4. CHART 4: THỐNG KÊ HUYẾT ÁP TRUNG BÌNH (SYSTOLIC & DIASTOLIC) */}{" "}
            <AdminSvgBloodPressureChart
              title="4. Thống Kê Huyết Áp Trung Bình Hệ Thống"
              subtitle="Huyết áp tâm thu (Systolic) & tâm trương (Diastolic) trung bình toàn hệ thống"
              unit="mmHg"
              icon={<Heart className="w-5 h-5 text-rose-600" />}
              data={data.timeSeries}
              overallSys={data.summary.overallAvgSystolic}
              overallDia={data.summary.overallAvgDiastolic}
              footerText={`Khoảng thời gian: ${rangeLabels[range]} • TB: ${data.summary.overallAvgSystolic ?? "--"} / ${data.summary.overallAvgDiastolic ?? "--"} mmHg`}
            />{" "}
            {/* 5. CHART 5: THỐNG KÊ NHỊP TIM TRUNG BÌNH */}{" "}
            <AdminSvgHeartRateChart
              title="5. Thống Kê Nhịp Tim Trung Bình Toàn Hệ Thống"
              subtitle="Nhịp tim khi nghỉ ngơi (Resting Heart Rate) trung bình của toàn bộ User"
              unit="bpm"
              icon={<Activity className="w-5 h-5 text-amber-500" />}
              data={data.timeSeries}
              overallHeartRate={data.summary.overallAvgHeartRate}
              footerText={`Khoảng thời gian: ${rangeLabels[range]} • TB Toàn viện: ${data.summary.overallAvgHeartRate ?? "--"} bpm`}
            />{" "}
            {/* 6. CHART 6: PHÂN BỐ DỮ LIỆU SỨC KHỎE THEO CHUẨN AHA */}{" "}
            <AdminHealthDistributionChart
              title="6. Phân Bố Tình Trạng Sức Khỏe Toàn Hệ Thống"
              subtitle="Tỷ lệ phân loại nguy cơ tim mạch của toàn bộ người dùng theo AHA/ACC 2017"
              unit="% & Lượt"
              icon={<PieChartIcon className="w-5 h-5 text-indigo-600" />}
              distribution={data.healthDistribution}
              totalRecords={
                data.summary.recordsInRange || data.summary.totalHealthRecords
              }
            />{" "}
          </div>{" "}
        </>
      )}{" "}
    </div>
  );
};
// 1. Bar + Line Composite Chart
const AdminSvgBarLineChart = ({
  title,
  subtitle,
  unit,
  icon,
  data,
  barKey,
  barName,
  barColor,
  lineKey,
  lineName,
  lineColor,
  footerText,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  if (!data || data.length === 0) {
    return <EmptyStateCard title={title} subtitle={subtitle} icon={icon} />;
  }
  const maxBar = Math.max(...data.map((d) => d[barKey] || 0), 1);
  const maxLine = Math.max(...data.map((d) => d[lineKey] || 0), 1);
  const svgHeight = 220;
  const paddingBottom = 28;
  const paddingTop = 20;
  const graphHeight = svgHeight - paddingBottom - paddingTop; // Calculate line points
const points = data
    .map((d, i) => {
      const x = ((i + 0.5) / data.length) * 100;
      const val = d[lineKey] || 0;
      const y = paddingTop + graphHeight - (val / maxLine) * graphHeight;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-100  flex flex-col justify-between">
      {" "}
      <div className="flex items-start justify-between gap-4 mb-4">
        {" "}
        <div>
          {" "}
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {" "}
            {icon} <span>{title}</span>{" "}
          </h3>{" "}
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>{" "}
        </div>{" "}
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 shrink-0">
          {" "}
          Đơn vị: {unit}{" "}
        </span>{" "}
      </div>{" "}
      {/* Legend */}{" "}
      <div className="flex items-center gap-4 text-xs font-bold mb-2">
        {" "}
        <div className="flex items-center gap-1.5">
          {" "}
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{ backgroundColor: barColor }}
          />{" "}
          <span className="text-slate-600">{barName}</span>{" "}
        </div>{" "}
        <div className="flex items-center gap-1.5">
          {" "}
          <span
            className="w-3 h-1 rounded-full inline-block"
            style={{ backgroundColor: lineColor }}
          />{" "}
          <span className="text-slate-600">{lineName}</span>{" "}
        </div>{" "}
      </div>{" "}
      {/* Chart Canvas */}{" "}
      <div className="relative w-full h-[220px] select-none">
        {" "}
        <svg
          viewBox={`0 0 100 ${svgHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          {" "}
          {/* Horizontal gridlines */}{" "}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + graphHeight * (1 - ratio);
            return (
              <line
                key={`grid-${idx}`}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="0.8"
              />
            );
          })}{" "}
          {/* Bars */}{" "}
          {data.map((d, i) => {
            const width = Math.max(1, 70 / data.length);
            const x = ((i + 0.5) / data.length) * 100 - width / 2;
            const barVal = d[barKey] || 0;
            const barH = (barVal / maxBar) * graphHeight;
            const y = paddingTop + graphHeight - barH;
            return (
              <rect
                key={`bar-${i}`}
                x={x}
                y={y}
                width={width}
                height={Math.max(1, barH)}
                rx={0}
                fill={barColor}
                opacity={hoveredIdx === i ? 1 : 0.85}
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}{" "}
          {/* Cumulative Line */}{" "}
          <polyline
            fill="none"
            stroke={lineColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />{" "}
          {/* Dots */}{" "}
          {data.map((d, i) => {
            const x = ((i + 0.5) / data.length) * 100;
            const val = d[lineKey] || 0;
            const y = paddingTop + graphHeight - (val / maxLine) * graphHeight;
            return (
              <circle
                key={`dot-${i}`}
                cx={x}
                cy={y}
                r={hoveredIdx === i ? 2.5 : 1.2}
                fill={lineColor}
                stroke="#ffffff"
                strokeWidth="0.8"
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}{" "}
        </svg>{" "}
        {/* X-Axis labels */}{" "}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-slate-500 font-mono px-1">
          {" "}
          <span>{data[0]?.period}</span>{" "}
          {data.length > 2 && (
            <span>{data[Math.floor(data.length / 2)]?.period}</span>
          )}{" "}
          <span>{data[data.length - 1]?.period}</span>{" "}
        </div>{" "}
        {/* Hover Tooltip Overlay */}{" "}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div
            className="absolute top-2 z-20 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-sm pointer-events-none transform -translate-x-1/2 border border-slate-800"
            style={{ left: `${((hoveredIdx + 0.5) / data.length) * 100}%` }}
          >
            {" "}
            <p className="font-bold text-amber-600 text-[11px] mb-1">
              {data[hoveredIdx].period}
            </p>{" "}
            <p className="flex items-center justify-between gap-3 text-[11px]">
              {" "}
              <span className="text-amber-300">User Mới:</span>{" "}
              <span className="font-mono font-bold">
                +{data[hoveredIdx].newUsersCount}
              </span>{" "}
            </p>{" "}
            <p className="flex items-center justify-between gap-3 text-[11px]">
              {" "}
              <span className="text-slate-400">Tổng User:</span>{" "}
              <span className="font-mono font-bold">
                {data[hoveredIdx].totalUsersCumulative}
              </span>{" "}
            </p>{" "}
          </div>
        )}{" "}
      </div>{" "}
      <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
        {" "}
        <span>{footerText}</span>{" "}
      </div>{" "}
    </div>
  );
};
// 2. Pure Bar Chart (Record volume)
const AdminSvgBarChart = ({
  title,
  subtitle,
  unit,
  icon,
  data,
  barKey,
  barName,
  barColor,
  footerText,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  if (!data || data.length === 0) {
    return <EmptyStateCard title={title} subtitle={subtitle} icon={icon} />;
  }
  const maxBar = Math.max(...data.map((d) => d[barKey] || 0), 1);
  const svgHeight = 220;
  const paddingBottom = 28;
  const paddingTop = 20;
  const graphHeight = svgHeight - paddingBottom - paddingTop;
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-100  flex flex-col justify-between">
      {" "}
      <div className="flex items-start justify-between gap-4 mb-4">
        {" "}
        <div>
          {" "}
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {" "}
            {icon} <span>{title}</span>{" "}
          </h3>{" "}
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>{" "}
        </div>{" "}
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 shrink-0">
          {" "}
          Đơn vị: {unit}{" "}
        </span>{" "}
      </div>{" "}
      <div className="flex items-center gap-2 text-xs font-bold mb-2">
        {" "}
        <span
          className="w-3 h-3 rounded-sm inline-block"
          style={{ backgroundColor: barColor }}
        />{" "}
        <span className="text-slate-600">{barName}</span>{" "}
      </div>{" "}
      <div className="relative w-full h-[220px] select-none">
        {" "}
        <svg
          viewBox={`0 0 100 ${svgHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          {" "}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + graphHeight * (1 - ratio);
            return (
              <line
                key={`grid-${idx}`}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="0.8"
              />
            );
          })}{" "}
          {data.map((d, i) => {
            const width = Math.max(1, 75 / data.length);
            const x = ((i + 0.5) / data.length) * 100 - width / 2;
            const barVal = d[barKey] || 0;
            const barH = (barVal / maxBar) * graphHeight;
            const y = paddingTop + graphHeight - barH;
            return (
              <rect
                key={`bar-${i}`}
                x={x}
                y={y}
                width={width}
                height={Math.max(1, barH)}
                rx={0}
                fill={barColor}
                opacity={hoveredIdx === i ? 1 : 0.85}
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}{" "}
        </svg>{" "}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-slate-500 font-mono px-1">
          {" "}
          <span>{data[0]?.period}</span>{" "}
          {data.length > 2 && (
            <span>{data[Math.floor(data.length / 2)]?.period}</span>
          )}{" "}
          <span>{data[data.length - 1]?.period}</span>{" "}
        </div>{" "}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div
            className="absolute top-2 z-20 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-sm pointer-events-none transform -translate-x-1/2 border border-slate-800"
            style={{ left: `${((hoveredIdx + 0.5) / data.length) * 100}%` }}
          >
            {" "}
            <p className="font-bold text-indigo-600 text-[11px] mb-1">
              {data[hoveredIdx].period}
            </p>{" "}
            <p className="flex items-center justify-between gap-3 text-[11px]">
              {" "}
              <span className="text-slate-400">Khối lượng đo:</span>{" "}
              <span className="font-mono font-bold">
                {data[hoveredIdx][barKey]} bản ghi
              </span>{" "}
            </p>{" "}
          </div>
        )}{" "}
      </div>{" "}
      <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
        {" "}
        <span>{footerText}</span>{" "}
      </div>{" "}
    </div>
  );
};
// 3. Weight Multi-Line Chart (Avg / Min / Max)
const AdminSvgMultiLineChart = ({
  title,
  subtitle,
  unit,
  icon,
  data,
  mainLineKey,
  mainLineName,
  mainLineColor,
  minLineKey,
  minLineName,
  maxLineKey,
  maxLineName,
  overallAvg,
  footerText,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  if (!data || data.length === 0 || overallAvg === null) {
    return (
      <EmptyStateCard
        title={title}
        subtitle={subtitle}
        icon={icon}
        reason="Chưa có dữ liệu cân nặng trong giai đoạn này"
      />
    );
  }
  const validWeights = data
    .flatMap((d) => [d[mainLineKey], d[minLineKey], d[maxLineKey]])
    .filter((v) => typeof v === "number" && v > 0);
  const minW = Math.max(30, Math.min(...validWeights) - 3);
  const maxW = Math.max(...validWeights, minW + 10) + 3;
  const range = maxW - minW || 1;
  const svgHeight = 220;
  const paddingBottom = 28;
  const paddingTop = 20;
  const graphHeight = svgHeight - paddingBottom - paddingTop;
  const getPoints = (key) => {
    return data
      .filter((d) => d[key] !== null && d[key] !== undefined)
      .map((d) => {
        const idx = data.indexOf(d);
        const x = ((idx + 0.5) / data.length) * 100;
        const val = d[key];
        const y =
          paddingTop + graphHeight - ((val - minW) / range) * graphHeight;
        return `${x},${y}`;
      })
      .join(" ");
  };
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-100  flex flex-col justify-between">
      {" "}
      <div className="flex items-start justify-between gap-4 mb-4">
        {" "}
        <div>
          {" "}
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {" "}
            {icon} <span>{title}</span>{" "}
          </h3>{" "}
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>{" "}
        </div>{" "}
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 shrink-0">
          {" "}
          Đơn vị: {unit}{" "}
        </span>{" "}
      </div>{" "}
      <div className="flex items-center gap-4 text-xs font-bold mb-2">
        {" "}
        <div className="flex items-center gap-1.5">
          {" "}
          <span
            className="w-3 h-1.5 rounded-full inline-block"
            style={{ backgroundColor: mainLineColor }}
          />{" "}
          <span className="text-slate-700">{mainLineName}</span>{" "}
        </div>{" "}
        <div className="flex items-center gap-1.5">
          {" "}
          <span className="w-3 h-0.5 bg-slate-400 inline-block border-t border-dashed border-slate-400" />{" "}
          <span className="text-slate-500">
            {minLineName} / {maxLineName}
          </span>{" "}
        </div>{" "}
      </div>{" "}
      <div className="relative w-full h-[220px] select-none">
        {" "}
        <svg
          viewBox={`0 0 100 ${svgHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          {" "}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + graphHeight * (1 - ratio);
            const labelVal = Math.round(minW + ratio * range);
            return (
              <g key={`grid-${idx}`}>
                {" "}
                <line
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="0.8"
                />{" "}
                <text
                  x="1"
                  y={y - 2}
                  fill="#94a3b8"
                  fontSize="6"
                  fontFamily="monospace"
                >
                  {" "}
                  {labelVal}{" "}
                </text>{" "}
              </g>
            );
          })}{" "}
          {/* Min & Max dashed lines */}{" "}
          <polyline
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="2 2"
            points={getPoints(minLineKey)}
          />{" "}
          <polyline
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1"
            strokeDasharray="2 2"
            points={getPoints(maxLineKey)}
          />{" "}
          {/* Main Average Line */}{" "}
          <polyline
            fill="none"
            stroke={mainLineColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={getPoints(mainLineKey)}
          />{" "}
          {/* Dots on main line */}{" "}
          {data.map((d, i) => {
            if (d[mainLineKey] === null) return null;
            const x = ((i + 0.5) / data.length) * 100;
            const val = d[mainLineKey];
            const y =
              paddingTop + graphHeight - ((val - minW) / range) * graphHeight;
            return (
              <circle
                key={`dot-${i}`}
                cx={x}
                cy={y}
                r={hoveredIdx === i ? 2.5 : 1.2}
                fill={mainLineColor}
                stroke="#ffffff"
                strokeWidth="0.8"
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}{" "}
        </svg>{" "}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-slate-500 font-mono px-1">
          {" "}
          <span>{data[0]?.period}</span>{" "}
          {data.length > 2 && (
            <span>{data[Math.floor(data.length / 2)]?.period}</span>
          )}{" "}
          <span>{data[data.length - 1]?.period}</span>{" "}
        </div>{" "}
        {hoveredIdx !== null &&
          data[hoveredIdx] &&
          data[hoveredIdx][mainLineKey] !== null && (
            <div
              className="absolute top-2 z-20 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-sm pointer-events-none transform -translate-x-1/2 border border-slate-800"
              style={{ left: `${((hoveredIdx + 0.5) / data.length) * 100}%` }}
            >
              {" "}
              <p className="font-bold text-indigo-300 text-[11px] mb-1">
                {data[hoveredIdx].period}
              </p>{" "}
              <p className="flex items-center justify-between gap-3 text-[11px]">
                {" "}
                <span className="text-indigo-600 font-bold">
                  Cân Nặng TB:
                </span>{" "}
                <span className="font-mono font-bold">
                  {data[hoveredIdx][mainLineKey]} kg
                </span>{" "}
              </p>{" "}
              {data[hoveredIdx][minLineKey] !== null && (
                <p className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                  {" "}
                  <span>Dải Min - Max:</span>{" "}
                  <span className="font-mono">
                    {data[hoveredIdx][minLineKey]} -{" "}
                    {data[hoveredIdx][maxLineKey]} kg
                  </span>{" "}
                </p>
              )}{" "}
            </div>
          )}{" "}
      </div>{" "}
      <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
        {" "}
        <span>{footerText}</span>{" "}
      </div>{" "}
    </div>
  );
};
// 4. Blood Pressure Line Chart (Systolic + Diastolic)
const AdminSvgBloodPressureChart = ({
  title,
  subtitle,
  unit,
  icon,
  data,
  overallSys,
  overallDia,
  footerText,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  if (!data || data.length === 0 || overallSys === null) {
    return (
      <EmptyStateCard
        title={title}
        subtitle={subtitle}
        icon={icon}
        reason="Chưa có dữ liệu đo huyết áp trong giai đoạn này"
      />
    );
  }
  const minBP = 50;
  const maxBP = 180;
  const range = maxBP - minBP;
  const svgHeight = 220;
  const paddingBottom = 28;
  const paddingTop = 20;
  const graphHeight = svgHeight - paddingBottom - paddingTop;
  const getPoints = (key) => {
    return data
      .filter((d) => d[key] !== null && d[key] !== undefined)
      .map((d) => {
        const idx = data.indexOf(d);
        const x = ((idx + 0.5) / data.length) * 100;
        const val = d[key];
        const y =
          paddingTop + graphHeight - ((val - minBP) / range) * graphHeight;
        return `${x},${y}`;
      })
      .join(" ");
  };
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-100  flex flex-col justify-between">
      {" "}
      <div className="flex items-start justify-between gap-4 mb-4">
        {" "}
        <div>
          {" "}
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {" "}
            {icon} <span>{title}</span>{" "}
          </h3>{" "}
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>{" "}
        </div>{" "}
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 shrink-0">
          {" "}
          Đơn vị: {unit}{" "}
        </span>{" "}
      </div>{" "}
      <div className="flex items-center gap-4 text-xs font-bold mb-2">
        {" "}
        <div className="flex items-center gap-1.5">
          {" "}
          <span className="w-3 h-1.5 rounded-full inline-block bg-rose-600" />{" "}
          <span className="text-rose-700">Tâm Thu TB (Systolic)</span>{" "}
        </div>{" "}
        <div className="flex items-center gap-1.5">
          {" "}
          <span className="w-3 h-1.5 rounded-full inline-block bg-sky-600" />{" "}
          <span className="text-sky-700">Tâm Trương TB (Diastolic)</span>{" "}
        </div>{" "}
      </div>{" "}
      <div className="relative w-full h-[220px] select-none">
        {" "}
        <svg
          viewBox={`0 0 100 ${svgHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          {" "}
          {/* Reference bands for 120 and 140 systolic */}{" "}
          <line
            x1="0"
            y1={
              paddingTop + graphHeight - ((140 - minBP) / range) * graphHeight
            }
            x2="100"
            y2={
              paddingTop + graphHeight - ((140 - minBP) / range) * graphHeight
            }
            stroke="#fee2e2"
            strokeWidth="1"
            strokeDasharray="2 2"
          />{" "}
          <line
            x1="0"
            y1={
              paddingTop + graphHeight - ((120 - minBP) / range) * graphHeight
            }
            x2="100"
            y2={
              paddingTop + graphHeight - ((120 - minBP) / range) * graphHeight
            }
            stroke="#dcfce7"
            strokeWidth="1"
            strokeDasharray="2 2"
          />{" "}
          {[50, 80, 100, 120, 140, 180].map((val) => {
            const y =
              paddingTop + graphHeight - ((val - minBP) / range) * graphHeight;
            return (
              <g key={`grid-bp-${val}`}>
                {" "}
                <line
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="0.8"
                />{" "}
                <text
                  x="1"
                  y={y - 2}
                  fill="#94a3b8"
                  fontSize="6"
                  fontFamily="monospace"
                >
                  {" "}
                  {val}{" "}
                </text>{" "}
              </g>
            );
          })}{" "}
          {/* Diastolic Line */}{" "}
          <polyline
            fill="none"
            stroke="#0284c7"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={getPoints("avgDiastolic")}
          />{" "}
          {/* Systolic Line */}{" "}
          <polyline
            fill="none"
            stroke="#e11d48"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={getPoints("avgSystolic")}
          />{" "}
          {/* Systolic & Diastolic Dots */}{" "}
          {data.map((d, i) => {
            if (d.avgSystolic === null) return null;
            const x = ((i + 0.5) / data.length) * 100;
            const ySys =
              paddingTop +
              graphHeight -
              ((d.avgSystolic - minBP) / range) * graphHeight;
            const yDia =
              paddingTop +
              graphHeight -
              ((d.avgDiastolic - minBP) / range) * graphHeight;
            return (
              <g key={`bp-dots-${i}`}>
                {" "}
                <circle
                  cx={x}
                  cy={ySys}
                  r={hoveredIdx === i ? 2.5 : 1.2}
                  fill="#e11d48"
                  stroke="#ffffff"
                  strokeWidth="0.8"
                  className="transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />{" "}
                <circle
                  cx={x}
                  cy={yDia}
                  r={hoveredIdx === i ? 2.5 : 1.2}
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="0.8"
                  className="transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />{" "}
              </g>
            );
          })}{" "}
        </svg>{" "}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-slate-500 font-mono px-1">
          {" "}
          <span>{data[0]?.period}</span>{" "}
          {data.length > 2 && (
            <span>{data[Math.floor(data.length / 2)]?.period}</span>
          )}{" "}
          <span>{data[data.length - 1]?.period}</span>{" "}
        </div>{" "}
        {hoveredIdx !== null &&
          data[hoveredIdx] &&
          data[hoveredIdx].avgSystolic !== null && (
            <div
              className="absolute top-2 z-20 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-sm pointer-events-none transform -translate-x-1/2 border border-slate-800"
              style={{ left: `${((hoveredIdx + 0.5) / data.length) * 100}%` }}
            >
              {" "}
              <p className="font-bold text-rose-300 text-[11px] mb-1">
                {data[hoveredIdx].period}
              </p>{" "}
              <p className="flex items-center justify-between gap-3 text-[11px]">
                {" "}
                <span className="text-rose-600 font-bold">
                  Tâm Thu TB:
                </span>{" "}
                <span className="font-mono font-bold">
                  {data[hoveredIdx].avgSystolic} mmHg
                </span>{" "}
              </p>{" "}
              <p className="flex items-center justify-between gap-3 text-[11px]">
                {" "}
                <span className="text-sky-400 font-bold">
                  Tâm Trương TB:
                </span>{" "}
                <span className="font-mono font-bold">
                  {data[hoveredIdx].avgDiastolic} mmHg
                </span>{" "}
              </p>{" "}
            </div>
          )}{" "}
      </div>{" "}
      <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
        {" "}
        <span>{footerText}</span>{" "}
      </div>{" "}
    </div>
  );
};
// 5. Heart Rate Line Chart
const AdminSvgHeartRateChart = ({
  title,
  subtitle,
  unit,
  icon,
  data,
  overallHeartRate,
  footerText,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  if (!data || data.length === 0 || overallHeartRate === null) {
    return (
      <EmptyStateCard
        title={title}
        subtitle={subtitle}
        icon={icon}
        reason="Chưa có dữ liệu đo nhịp tim trong giai đoạn này"
      />
    );
  }
  const validHrs = data
    .map((d) => d.avgHeartRate)
    .filter((v) => typeof v === "number" && v > 0);
  const minHR = Math.max(40, Math.min(...validHrs) - 5);
  const maxHR = Math.max(...validHrs, minHR + 15) + 5;
  const range = maxHR - minHR || 1;
  const svgHeight = 220;
  const paddingBottom = 28;
  const paddingTop = 20;
  const graphHeight = svgHeight - paddingBottom - paddingTop;
  const points = data
    .filter((d) => d.avgHeartRate !== null && d.avgHeartRate !== undefined)
    .map((d) => {
      const idx = data.indexOf(d);
      const x = ((idx + 0.5) / data.length) * 100;
      const val = d.avgHeartRate;
      const y =
        paddingTop + graphHeight - ((val - minHR) / range) * graphHeight;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-100  flex flex-col justify-between">
      {" "}
      <div className="flex items-start justify-between gap-4 mb-4">
        {" "}
        <div>
          {" "}
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {" "}
            {icon} <span>{title}</span>{" "}
          </h3>{" "}
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>{" "}
        </div>{" "}
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 shrink-0">
          {" "}
          Đơn vị: {unit}{" "}
        </span>{" "}
      </div>{" "}
      <div className="flex items-center gap-2 text-xs font-bold mb-2">
        {" "}
        <span className="w-3 h-1.5 rounded-full inline-block bg-amber-500" />{" "}
        <span className="text-slate-700">
          Nhịp Tim Nghỉ TB (Resting Heart Rate)
        </span>{" "}
      </div>{" "}
      <div className="relative w-full h-[220px] select-none">
        {" "}
        <svg
          viewBox={`0 0 100 ${svgHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          {" "}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + graphHeight * (1 - ratio);
            const labelVal = Math.round(minHR + ratio * range);
            return (
              <g key={`grid-hr-${idx}`}>
                {" "}
                <line
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="0.8"
                />{" "}
                <text
                  x="1"
                  y={y - 2}
                  fill="#94a3b8"
                  fontSize="6"
                  fontFamily="monospace"
                >
                  {" "}
                  {labelVal}{" "}
                </text>{" "}
              </g>
            );
          })}{" "}
          {/* Area under curve */}
          {/* Heart rate line */}{" "}
          <polyline
            fill="none"
            stroke="#d97706"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />{" "}
          {/* Dots */}{" "}
          {data.map((d, i) => {
            if (d.avgHeartRate === null) return null;
            const x = ((i + 0.5) / data.length) * 100;
            const val = d.avgHeartRate;
            const y =
              paddingTop + graphHeight - ((val - minHR) / range) * graphHeight;
            return (
              <circle
                key={`dot-hr-${i}`}
                cx={x}
                cy={y}
                r={hoveredIdx === i ? 2.5 : 1.2}
                fill="#d97706"
                stroke="#ffffff"
                strokeWidth="0.8"
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}{" "}
        </svg>{" "}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-slate-500 font-mono px-1">
          {" "}
          <span>{data[0]?.period}</span>{" "}
          {data.length > 2 && (
            <span>{data[Math.floor(data.length / 2)]?.period}</span>
          )}{" "}
          <span>{data[data.length - 1]?.period}</span>{" "}
        </div>{" "}
        {hoveredIdx !== null &&
          data[hoveredIdx] &&
          data[hoveredIdx].avgHeartRate !== null && (
            <div
              className="absolute top-2 z-20 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-sm pointer-events-none transform -translate-x-1/2 border border-slate-800"
              style={{ left: `${((hoveredIdx + 0.5) / data.length) * 100}%` }}
            >
              {" "}
              <p className="font-bold text-amber-300 text-[11px] mb-1">
                {data[hoveredIdx].period}
              </p>{" "}
              <p className="flex items-center justify-between gap-3 text-[11px]">
                {" "}
                <span className="text-amber-600 font-bold">
                  Nhịp Tim TB:
                </span>{" "}
                <span className="font-mono font-bold">
                  {data[hoveredIdx].avgHeartRate} bpm
                </span>{" "}
              </p>{" "}
            </div>
          )}{" "}
      </div>{" "}
      <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
        {" "}
        <span>{footerText}</span>{" "}
      </div>{" "}
    </div>
  );
};
// 6. Health Risk Distribution Category Chart
const AdminHealthDistributionChart = ({
  title,
  subtitle,
  unit,
  icon,
  distribution,
  totalRecords,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-100  flex flex-col justify-between">
      {" "}
      <div className="flex items-start justify-between gap-4 mb-4">
        {" "}
        <div>
          {" "}
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {" "}
            {icon} <span>{title}</span>{" "}
          </h3>{" "}
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>{" "}
        </div>{" "}
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 shrink-0">
          {" "}
          Đơn vị: {unit}{" "}
        </span>{" "}
      </div>{" "}
      {/* Visual Percentage Stacked Progress Bar */}{" "}
      <div className="w-full h-4 rounded-sm bg-slate-100 flex overflow-hidden mb-4 border border-slate-200">
        {" "}
        {distribution.map((cat, idx) => {
          if (cat.percentage <= 0) return null;
          return (
            <div
              key={`bar-seg-${idx}`}
              className="h-full transition-all"
              style={{
                width: `${cat.percentage}%`,
                backgroundColor: cat.color,
              }}
              title={`${cat.name}: ${cat.count} lượt (${cat.percentage}%)`}
            />
          );
        })}{" "}
      </div>{" "}
      {/* Category Breakdown Cards */}{" "}
      <div className="space-y-2 mb-2">
        {" "}
        {distribution.map((cat, idx) => (
          <div
            key={`cat-card-${idx}`}
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
          >
            {" "}
            <div className="flex items-center gap-2.5">
              {" "}
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: cat.color }}
              />{" "}
              <div>
                {" "}
                <p className="font-bold text-slate-800">{cat.name}</p>{" "}
                <p className="text-[10px] text-slate-500">
                  {cat.description}
                </p>{" "}
              </div>{" "}
            </div>{" "}
            <div className="text-right">
              {" "}
              <span className="font-mono font-bold text-slate-900 text-sm">
                {cat.count}
              </span>{" "}
              <span className="text-xs text-slate-500 ml-1">
                ({cat.percentage}%)
              </span>{" "}
            </div>{" "}
          </div>
        ))}{" "}
      </div>{" "}
      <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
        {" "}
        <span>Tiêu chuẩn phân loại: AHA/ACC 2017 Guidelines</span>{" "}
        <span className="font-bold text-indigo-700">
          Tổng mẫu khảo sát: {totalRecords}
        </span>{" "}
      </div>{" "}
    </div>
  );
};
const EmptyStateCard = ({
  title,
  subtitle,
  icon,
  reason = "Chưa có dữ liệu thống kê trong khoảng thời gian này",
}) => (
  <div className="bg-white p-6 rounded-lg border border-slate-100  flex flex-col justify-between">
    {" "}
    <div className="flex items-start justify-between gap-4 mb-4">
      {" "}
      <div>
        {" "}
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          {" "}
          {icon} <span>{title}</span>{" "}
        </h3>{" "}
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>{" "}
      </div>{" "}
    </div>{" "}
    <div className="h-[220px] flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
      {" "}
      <Info className="w-6 h-6 text-slate-400 mb-2" />{" "}
      <p className="text-xs font-bold text-slate-500">{reason}</p>{" "}
      <p className="text-[11px] text-slate-500 mt-0.5">
        Dữ liệu sẽ tự động xuất hiện khi có phát sinh lượt đo của người dùng
      </p>{" "}
    </div>{" "}
    <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
      {" "}
      <span>Trạng thái: Trống (Empty State)</span>{" "}
    </div>{" "}
  </div>
);
