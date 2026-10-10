import React, { useState, useEffect, useRef } from "react";
import { UserHeader } from "../../components/layout/UserHeader";
import { HealthChart } from "../../components/charts/HealthChart";
import { RecordMetricModal } from "../../components/forms/RecordMetricModal";
import { healthApi, goalsApi, remindersApi } from "../../api/client";
import {
  Droplets,
  Activity,
  Check,
  ArrowDown,
  ArrowUp,
  Brain,
  Wifi,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  HeartPulse
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { motion } from "motion/react";
import { useDataSync } from '../../hooks/useDataSync';
import { DataStatus } from '../../components/common/DataStatus';
import { HealthDataStatus } from '../../components/common/HealthDataStatus';

export const DashboardPage = () => {
  const { success } = useToast();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [latestRecord, setLatestRecord] = useState(null);
  const [previousRecord, setPreviousRecord] = useState(null);
  const [goals, setGoals] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState("30d");
  const [current, setCurrent] = useState({}), [loadError, setLoadError] = useState('');

  const loadVersion = useRef(0);
  const fetchData = async () => {
    const version = ++loadVersion.current;
    try {
      setLoading(true);
      const [recordsRes, latestRes, goalsRes, remindersRes] = await Promise.all(
        [
          healthApi.getAll(timeRange),
          healthApi.getLatest(),
          goalsApi.getAll(),
          remindersApi.getAll(),
        ],
      );
      if (version !== loadVersion.current) return;
      setLoadError([recordsRes, latestRes, goalsRes, remindersRes].filter(r => !r.success).map(r => r.message).join(' · '));
      if (recordsRes.success && recordsRes.data) setRecords(recordsRes.data);
      if (latestRes.success && latestRes.data) {
        const cur = latestRes.data.current ?? {};
        setCurrent(cur);
        setLatestRecord(latestRes.data.latest ? { weight: cur.weight?.value ?? null, systolic: cur.blood_pressure?.value ?? null, diastolic: cur.blood_pressure?.diastolic ?? null, heart_rate: cur.heart_rate?.value ?? null } : null);
        setPreviousRecord({ weight: latestRes.data.previous_by_metric?.weight ?? null, heart_rate: latestRes.data.previous_by_metric?.heart_rate ?? null });
      }
      if (goalsRes.success && goalsRes.data) setGoals(goalsRes.data);
      if (remindersRes.success && remindersRes.data)
        setReminders(remindersRes.data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);
  useDataSync(fetchData, ['health', 'goals', 'reminders', 'profile'], true);

  const handleToggleReminder = async (rem) => {
    const updatedStatus = !rem.is_active;
    const res = await remindersApi.update(rem.id, { is_active: updatedStatus });
    if (res.success && res.data) {
      setReminders((prev) => prev.map((r) => (r.id === rem.id ? res.data : r)));
      success(updatedStatus ? "Đã bật nhắc nhở" : "Đã tạm tắt nhắc nhở");
    }
  };

  const handleMetricRecorded = () => {
    fetchData();
  };

  // Metric Deltas calculation
const weightDiff =
    latestRecord?.weight != null && previousRecord?.weight != null
      ? latestRecord.weight - previousRecord.weight
      : 0;
  const hrDiff =
    latestRecord?.heart_rate != null && previousRecord?.heart_rate != null
      ? latestRecord.heart_rate - previousRecord.heart_rate
      : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 350, damping: 25 },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col flex-1 gap-6"
    >
      <UserHeader
        title="Tổng quan"
        italicTitle="Hôm nay"
        onRecordClick={() => setIsRecordModalOpen(true)}
      />

      {/* Top 3 Metric Highlight Cards */}
      <DataStatus loading={loading} error={loadError} onRetry={fetchData} />
      <HealthDataStatus current={current} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Current Weight */}
        <motion.div
          variants={itemVariants}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
              <Activity className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              Cân nặng
            </p>
          </div>
          <div className="flex items-baseline gap-1.5 mt-auto">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">
              {latestRecord?.weight ?? "--"}
            </span>
            <span className="text-slate-500 font-semibold text-sm">kg</span>
          </div>
          <div className="mt-4 flex items-center text-[13px] font-medium">
            {weightDiff < 0 ? (
              <span className="text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100/50">
                <TrendingDown className="w-4 h-4" />
                Giảm {Math.abs(weightDiff).toFixed(1)}kg
              </span>
            ) : weightDiff > 0 ? (
              <span className="text-rose-600 flex items-center gap-1.5 bg-rose-50 px-2 py-1 rounded-md border border-rose-100/50">
                <TrendingUp className="w-4 h-4" />
                Tăng {weightDiff.toFixed(1)}kg
              </span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                <Minus className="w-4 h-4" />
                Không đổi
              </span>
            )}
          </div>
        </motion.div>

        {/* Card 2: Blood Pressure */}
        <motion.div
          variants={itemVariants}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100/50">
              <HeartPulse className="w-5 h-5 text-rose-500" />
            </div>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              Cặp huyết áp cùng lần đo
            </p>
          </div>
          <div className="flex items-baseline gap-1.5 mt-auto">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">
              {latestRecord?.systolic != null
                ? `${latestRecord.systolic}/${latestRecord.diastolic}`
                : "--/--"}
            </span>
            <span className="text-slate-500 font-semibold text-sm">mmHg</span>
          </div>
          <div className="mt-4 flex items-center text-[13px] font-medium">
            {latestRecord?.systolic != null && latestRecord?.diastolic != null &&
            latestRecord.systolic < 120 &&
            latestRecord.diastolic < 80 ? (
              <span className="text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100/50">
                <Check className="w-4 h-4" />
                Mức tối ưu
              </span>
            ) : latestRecord?.systolic != null ? (
              <span className="text-amber-600 flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-md border border-amber-100/50">
                <Activity className="w-4 h-4" />
                Cần theo dõi
              </span>
            ) : (
              <span className="text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Chưa có dữ liệu</span>
            )}
          </div>
        </motion.div>

        {/* Card 3: Avg Heart Rate */}
        <motion.div
          variants={itemVariants}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 border border-primary-100/50">
              <Activity className="w-5 h-5 text-primary-500" />
            </div>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              Nhịp tim
            </p>
          </div>
          <div className="flex items-baseline gap-1.5 mt-auto">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">
              {latestRecord?.heart_rate ?? "--"}
            </span>
            <span className="text-slate-500 font-semibold text-sm">bpm</span>
          </div>
          <div className="mt-4 flex items-center text-[13px] font-medium">
            {hrDiff < 0 ? (
              <span className="text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100/50">
                <TrendingDown className="w-4 h-4" />
                Giảm {Math.abs(hrDiff)} bpm
              </span>
            ) : hrDiff > 0 ? (
              <span className="text-slate-600 flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md border border-slate-200/60">
                <TrendingUp className="w-4 h-4" />
                Tăng {Math.abs(hrDiff)} bpm
              </span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                <Minus className="w-4 h-4" />
                Ổn định
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Feature Banners */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <Link
          to="/ai-diagnostics"
          className="p-6 rounded-2xl bg-slate-950 text-white flex items-center justify-between transition-opacity hover:opacity-90 shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-center shrink-0 shadow-inner">
              <Brain className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-base font-bold tracking-tight">
                  Trợ lý sức khỏe AI
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-primary-600/20 text-primary-400 border border-primary-500/20">
                  Mới
                </span>
              </div>
              <p className="text-sm text-slate-400 font-medium">
                Giải thích chỉ số theo nguồn tham chiếu
              </p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-slate-600 shrink-0 ml-2" />
        </Link>
        
        <Link
          to="/devices"
          className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex items-center justify-between hover:border-primary-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-primary-50 group-hover:text-primary-600 group-hover:border-primary-100 transition-colors">
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-base font-bold tracking-tight text-slate-900">
                  Thiết bị & Kết nối
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-500 border border-slate-200/60">
                  Đăng ký
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium">
                Quản lý thiết bị và hướng dẫn nhập số đo
              </p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-primary-500 transition-colors shrink-0 ml-2" />
        </Link>
      </motion.div>

      {/* Main Grid: Chart + Goals & Reminders */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-5 gap-6"
      >
        {/* Left Column: Weight Journey */}
        <div className="lg:col-span-3 flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <HealthChart
            records={records}
            type="weight"
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            title="Biểu đồ Cân nặng"
            subtitle={`/ ${timeRange === "7d" ? "7 Ngày qua" : timeRange === "30d" ? "30 Ngày qua" : "3 Tháng qua"}`}
          />
        </div>

        {/* Right Column: Active Goals & Reminders */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Active Goals Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Mục tiêu hiện tại
              </h3>
              <Link
                to="/goals"
                className="text-[11px] font-bold text-primary-600 hover:text-primary-700 hover:underline uppercase tracking-wider transition-colors"
              >
                Chi tiết
              </Link>
            </div>
            <div className="space-y-5">
              {goals.length === 0 ? (
                <p className="text-sm text-slate-500 font-medium text-center py-5 bg-slate-50 rounded-xl border border-slate-100/60">
                  Chưa có mục tiêu sức khỏe.
                </p>
              ) : (
                goals.slice(0, 3).map((goal, index) => (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex justify-between text-sm font-bold mb-2.5 text-slate-700">
                      <span>{goal.title}</span>
                      <span className="text-slate-900">
                        {goal.progress_percentage || 0}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${goal.progress_percentage || 0}%` }}
                        className="h-full bg-primary-500 rounded-full transition-all duration-1000 ease-out"
                      />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Reminders Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Nhắc nhở y tế
              </h3>
              <Link
                to="/reminders"
                className="text-[11px] font-bold text-primary-600 hover:text-primary-700 hover:underline uppercase tracking-wider transition-colors"
              >
                Quản lý
              </Link>
            </div>
            <div className="space-y-3">
              {reminders.length === 0 ? (
                <p className="text-sm text-slate-500 font-medium text-center py-5 bg-slate-50 rounded-xl border border-slate-100/60">
                  Không có nhắc nhở.
                </p>
              ) : (
                reminders.map((rem, index) => (
                  <motion.div
                    key={rem.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleToggleReminder(rem)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer group ${
                      rem.is_active
                        ? "bg-white border-slate-200 hover:border-primary-200 shadow-sm"
                        : "bg-slate-50/50 border-slate-100 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors border ${
                          rem.is_active ? "bg-primary-50 text-primary-600 border-primary-100/50" : "bg-slate-100 text-slate-400 border-transparent"
                        }`}
                      >
                        {rem.type === "water" ? (
                          <Droplets className="w-5 h-5" />
                        ) : (
                          <Activity className="w-5 h-5" />
                        )}
                      </div>
                      <div className="text-sm min-w-0">
                        <p
                          className={`font-bold truncate ${
                            rem.is_active ? "text-slate-800" : "text-slate-500"
                          }`}
                        >
                          {rem.title}
                        </p>
                        <p className={`text-[10px] uppercase font-bold tracking-wider mt-1 ${
                          rem.is_active ? "text-slate-500" : "text-slate-400"
                        }`}>
                          {rem.time_of_day}
                        </p>
                      </div>
                    </div>
                    
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all border ${
                        rem.is_active
                          ? "border-primary-600 bg-primary-600 text-white shadow-sm shadow-primary-600/20"
                          : "border-slate-300 bg-transparent text-transparent group-hover:border-slate-400"
                      }`}
                    >
                      {rem.is_active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Record Metric Modal */}
      <RecordMetricModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={handleMetricRecorded}
      />
    </motion.div>
  );
};
