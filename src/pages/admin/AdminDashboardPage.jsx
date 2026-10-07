import React, { useState, useEffect } from "react";
import { adminApi } from "../../api/client";
import {
  Users,
  Activity,
  ArrowRight,
  FileText,
  Bot,
  Cpu,
  Settings,
  Zap,
  Sliders,
  Server,
  Database,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AdminHealthStatsSuite } from "../../components/admin/AdminHealthStatsSuite";
import { motion } from "motion/react";

export const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const statsRes = await adminApi.getDashboardStats();
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
      {/* Page Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
          Tổng quan Hệ thống
        </h1>
        <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-600" /> Trung tâm giám sát lâm sàng & phân quyền
        </p>
      </header>

      {/* Bento Grid layout for top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Hero Metric: Active Users */}
        <motion.div
          variants={itemVariants}
          className="md:col-span-2 bg-slate-900 rounded-lg p-6  flex flex-col justify-between text-white relative overflow-hidden group"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/20" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Đang trực tuyến
              </p>
            </div>
            <p className="text-5xl sm:text-6xl font-black tracking-tight drop-">
              {stats ? (stats.onlineSessionsCount ?? 1) : "--"}
            </p>
          </div>
          {/* Abstract background shape */}
          <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 w-48 h-48 bg-white/5 blur-2xl rounded-full pointer-events-none transition-transform group-hover:scale-110 duration-700" />
        </motion.div>

        {/* Sub Metric 1: Total Users */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-md p-5 border border-slate-200 flex flex-col justify-between hover:border-slate-400 transition-colors"
        >
          <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-600 mb-4 border border-slate-100">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Tổng người dùng
            </p>
            <p className="text-3xl font-bold tracking-tight text-slate-900">
              {stats ? stats.totalUsers : "--"}
            </p>
          </div>
        </motion.div>

        {/* Sub Metric 2: Total Records */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-md p-5 border border-slate-200 flex flex-col justify-between hover:border-slate-400 transition-colors"
        >
          <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-600 mb-4 border border-slate-100">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Bản ghi y tế
            </p>
            <p className="text-3xl font-bold tracking-tight text-slate-900">
              {stats ? stats.totalHealthRecords : "--"}
            </p>
          </div>
        </motion.div>
      </div>

      {/* AdminHealthStatsSuite */}
      <motion.section variants={itemVariants} className="mb-8">
        <AdminHealthStatsSuite initialRange="30d" />
      </motion.section>

      {/* Quick Access Modules */}
      <div className="mb-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-900 mb-1 flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-600" /> Công cụ Quản trị
        </h2>
        <p className="text-sm text-slate-500 font-medium">
          Truy cập nhanh các phân hệ nghiệp vụ hệ thống
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
      >
        {/* Module 1 */}
        <Link
          to="/admin/telemetry"
          className="bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between hover:border-slate-400 transition-colors group"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-100">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                Sinh Tồn & Biểu Đồ
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Giám sát chỉ số huyết áp, nhịp tim thời gian thực của toàn bộ bệnh nhân.
            </p>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1">
            Mở module <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module 2 */}
        <Link
          to="/admin/users"
          className="bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between hover:border-slate-400 transition-colors group"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-100">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                Phân Quyền (RBAC)
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Quản trị người dùng, gán quyền bác sĩ, điều dưỡng và kỹ thuật viên.
            </p>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1">
            Mở module <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module 3 */}
        <Link
          to="/admin/ai-reviews"
          className="bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between hover:border-slate-400 transition-colors group"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-100">
                <Bot className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                Kiểm Duyệt AI
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Thẩm định kết luận y khoa từ hệ thống Gemini AI. Cải thiện mô hình học máy.
            </p>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1">
            Mở module <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module 4 */}
        <Link
          to="/admin/devices"
          className="bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between hover:border-slate-400 transition-colors group"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-100">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                Thiết bị & IoT
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Quản lý Smartwatch, máy đo huyết áp Bluetooth và luồng dữ liệu IoT.
            </p>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1">
            Mở module <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module 5 */}
        <Link
          to="/admin/logs"
          className="bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between hover:border-slate-400 transition-colors group"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-100">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                Audit Logs
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Nhật ký kiểm toán truy cập và các phiên hoạt động bảo mật.
            </p>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1">
            Mở module <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module 6 */}
        <Link
          to="/admin/settings"
          className="bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between hover:border-slate-400 transition-colors group"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded bg-slate-900 text-slate-200 flex items-center justify-center border border-slate-800">
                <Settings className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                Cấu hình Hệ thống
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Thay đổi các chuẩn y tế, tham số kỹ thuật hệ thống và giao diện.
            </p>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1">
            Mở module <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
};
