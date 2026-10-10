import React, { useState, useEffect, useRef } from "react";
import { UserHeader } from "../../components/layout/UserHeader";
import { HealthChart } from "../../components/charts/HealthChart";
import { ClinicalAnalyticsChart } from "../../components/charts/ClinicalAnalyticsChart";
import { VitalsDistributionChart } from "../../components/charts/VitalsDistributionChart";
import { CircadianBPRhythmChart } from "../../components/charts/CircadianBPRhythmChart";
import { healthApi } from "../../api/client";
import {
  Scale,
  Heart,
  BarChart3,
  Clock,
  PieChart,
} from "lucide-react";
import { motion } from "motion/react";
import { useDataSync } from '../../hooks/useDataSync';
import { DataStatus } from '../../components/common/DataStatus';

export const AnalyticsPage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
  const [activeTab, setActiveTab] = useState("clinical");
  const [loadError, setLoadError] = useState('');

  const loadVersion = useRef(0);
  const fetchRecords = async () => {
    const version = ++loadVersion.current;
    try {
      setLoading(true);
      const res = await healthApi.getAll(timeRange);
      if (version !== loadVersion.current) return;
      setLoadError(res.success ? '' : res.message);
      if (res.success && res.data) {
        setRecords(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [timeRange]);
  useDataSync(fetchRecords, ['health'], true);

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
      className="flex flex-col flex-1 pb-8"
    >
      <UserHeader
        title="Báo cáo"
        italicTitle="Phân tích"
        subtitle="Hệ thống phân tích biểu đồ chuyên sâu: Phân tầng nguy cơ AHA/ESC, chỉ số MAP, phân bố rủi ro & nhịp 24h"
      />

      {/* Filter and Switcher Bar */}
      <DataStatus loading={loading} error={loadError} onRetry={fetchRecords} />
      <motion.div
        variants={itemVariants}
        className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm"
      >
        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-500 overflow-x-auto custom-scrollbar flex-1 xl:max-w-4xl border border-slate-100/80">
          <button
            onClick={() => setActiveTab("clinical")}
            className={`shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap shadow-sm ${
              activeTab === "clinical" 
                ? "bg-white text-rose-700 border border-slate-200/60" 
                : "hover:text-slate-800 hover:bg-white/60 border border-transparent shadow-none"
            }`}
          >
            <Heart className={`w-4 h-4 shrink-0 ${activeTab === "clinical" ? "text-rose-600" : "text-slate-400"}`} />
            <span>Lâm sàng AHA & MAP</span>
          </button>
          <button
            onClick={() => setActiveTab("distribution")}
            className={`shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap shadow-sm ${
              activeTab === "distribution" 
                ? "bg-white text-indigo-700 border border-slate-200/60" 
                : "hover:text-slate-800 hover:bg-white/60 border border-transparent shadow-none"
            }`}
          >
            <PieChart className={`w-4 h-4 shrink-0 ${activeTab === "distribution" ? "text-indigo-600" : "text-slate-400"}`} />
            <span>Phân bố Nguy cơ</span>
          </button>
          <button
            onClick={() => setActiveTab("circadian")}
            className={`shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap shadow-sm ${
              activeTab === "circadian" 
                ? "bg-white text-emerald-700 border border-slate-200/60" 
                : "hover:text-slate-800 hover:bg-white/60 border border-transparent shadow-none"
            }`}
          >
            <Clock className={`w-4 h-4 shrink-0 ${activeTab === "circadian" ? "text-emerald-600" : "text-slate-400"}`} />
            <span>Nhịp tim 24h</span>
          </button>
          <button
            onClick={() => setActiveTab("weight")}
            className={`shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap shadow-sm ${
              activeTab === "weight" 
                ? "bg-white text-primary-700 border border-slate-200/60" 
                : "hover:text-slate-800 hover:bg-white/60 border border-transparent shadow-none"
            }`}
          >
            <Scale className={`w-4 h-4 shrink-0 ${activeTab === "weight" ? "text-primary-600" : "text-slate-400"}`} />
            <span>Cân nặng & BMI</span>
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap shadow-sm ${
              activeTab === "all" 
                ? "bg-slate-900 text-white border border-slate-900" 
                : "hover:text-slate-800 hover:bg-white/60 border border-transparent shadow-none"
            }`}
          >
            <BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === "all" ? "text-slate-300" : "text-slate-400"}`} />
            <span>Tổng Hợp</span>
          </button>
        </div>

        {/* Time Range Pills */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl text-sm font-bold text-slate-500 border border-slate-100/80">
          <button
            onClick={() => setTimeRange("7d")}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg transition-all text-center shadow-sm ${
              timeRange === "7d" 
                ? "bg-white text-slate-900 border border-slate-200/60" 
                : "hover:text-slate-800 hover:bg-white/60 border border-transparent shadow-none"
            }`}
          >
            7 Ngày
          </button>
          <button
            onClick={() => setTimeRange("30d")}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg transition-all text-center shadow-sm ${
              timeRange === "30d" 
                ? "bg-white text-slate-900 border border-slate-200/60" 
                : "hover:text-slate-800 hover:bg-white/60 border border-transparent shadow-none"
            }`}
          >
            30 Ngày
          </button>
          <button
            onClick={() => setTimeRange("3m")}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg transition-all text-center shadow-sm ${
              timeRange === "3m" 
                ? "bg-white text-slate-900 border border-slate-200/60" 
                : "hover:text-slate-800 hover:bg-white/60 border border-transparent shadow-none"
            }`}
          >
            3 Tháng
          </button>
        </div>
      </motion.div>

      {/* Dynamic Chart Visualizations */}
      <motion.div variants={containerVariants} className="space-y-6">
        {(activeTab === "clinical" || activeTab === "all") && (
          <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <ClinicalAnalyticsChart
              records={records}
              title="Biểu Đồ Xu Hướng Huyết Áp & Phân Tầng Lâm Sàng AHA"
              subtitle="Đánh giá chi tiết áp lực động mạch trung bình (MAP), huyết áp tâm thu / tâm trương và nhịp tim"
            />
          </motion.div>
        )}

        {(activeTab === "distribution" || activeTab === "all") && (
          <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <VitalsDistributionChart
              records={records}
              title="Phân Tầng Tỷ Lệ Nguy Cơ Tim Mạch (AHA/ACC Standard)"
            />
          </motion.div>
        )}

        {(activeTab === "circadian" || activeTab === "all") && (
          <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <CircadianBPRhythmChart records={records} />
          </motion.div>
        )}

        {(activeTab === "weight" || activeTab === "all") && (
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <HealthChart
                records={records}
                type="weight"
                timeRange={timeRange}
                title="Biểu Đồ Cân Nặng (Body Weight)"
                subtitle={`/ ${timeRange === "7d" ? "7 ngày gần đây" : timeRange === "30d" ? "30 ngày qua" : "3 tháng"}`}
              />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <HealthChart
                records={records}
                type="heart_rate"
                timeRange={timeRange}
                title="Biểu Đồ Nhịp Tim Khi Nghỉ (Resting Heart Rate)"
                subtitle={`/ ${timeRange === "7d" ? "7 ngày gần đây" : timeRange === "30d" ? "30 ngày qua" : "3 tháng"}`}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};
