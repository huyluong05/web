import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/client";
import {
  FileText,
  Radio,
  Search,
  RefreshCw,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Laptop,
  Smartphone,
  Globe,
  Clock,
  UserX,
  Shield,
  LogIn,
  LogOut,
  KeyRound,
  UserCheck,
  Activity,
  Layers,
  ArrowDownRight,
  ClipboardList,
} from "lucide-react";
import { Button } from "../../components/common/Button";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "../../context/ToastContext";
export const AdminLogsPage = () => {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState("logs"); // Logs state
const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [logLimit, setLogLimit] = useState(100); // Sessions state
const [sessions, setSessions] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const fetchLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const res = await adminApi.getSystemLogs({
        action: selectedAction !== "all" ? selectedAction : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        search: searchQuery.trim() || undefined,
        limit: logLimit,
      });
      if (res.success && res.data) {
        setLogs(res.data.logs);
        setTotalLogs(res.data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  }, [selectedAction, selectedStatus, searchQuery, logLimit]);
  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const res = await adminApi.getActiveSessions();
      if (res.success && res.data) {
        setSessions(res.data.sessions);
        setActiveCount(res.data.activeCount);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => {
      fetchSessions();
    }, 15000); // Polling online sessions every 15s
return () => clearInterval(interval);
  }, [fetchSessions]);
  const handleTerminateSession = async (sessionId, userName) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn buộc ngắt phiên làm việc của người dùng"${userName}" không?`,
      )
    ) {
      return;
    }
    try {
      const res = await adminApi.terminateSession(sessionId);
      if (res.success) {
        success(`Đã kết thúc phiên truy cập của ${userName}`);
        fetchSessions();
        fetchLogs();
      } else {
        error(res.message || "Không thể kết thúc phiên");
      }
    } catch (err) {
      error("Lỗi kết nối máy chủ");
    }
  };
  const getActionBadge = (action) => {
    switch (action) {
      case "LOGIN_SUCCESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-200/60 ">
            {" "}
            <LogIn className="w-3.5 h-3.5" /> Đăng nhập thành công{" "}
          </span>
        );
      case "LOGIN_FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-widest border border-rose-200/60 ">
            {" "}
            <XCircle className="w-3.5 h-3.5" /> Đăng nhập thất bại{" "}
          </span>
        );
      case "LOGOUT":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest border border-slate-200 ">
            {" "}
            <LogOut className="w-3.5 h-3.5" /> Đăng xuất{" "}
          </span>
        );
      case "REGISTER":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-[10px] font-black uppercase tracking-widest border border-sky-200/60 ">
            {" "}
            <UserCheck className="w-3.5 h-3.5" /> Đăng ký mới{" "}
          </span>
        );
      case "ACCOUNT_LOCKED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-800 text-[10px] font-black uppercase tracking-widest border border-orange-300 ">
            {" "}
            <AlertTriangle className="w-3.5 h-3.5" /> Khóa tài khoản{" "}
          </span>
        );
      case "PASSWORD_CHANGE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-[10px] font-black uppercase tracking-widest border border-purple-200 ">
            {" "}
            <KeyRound className="w-3.5 h-3.5" /> Đổi mật khẩu{" "}
          </span>
        );
      case "ROLE_CHANGED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest border border-blue-200 ">
            {" "}
            <Shield className="w-3.5 h-3.5" /> Đổi phân quyền{" "}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest border border-slate-200 ">
            {" "}
            <Activity className="w-3.5 h-3.5" /> {action}{" "}
          </span>
        );
    }
  };
  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      case "danger":
        return <XCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-sky-500 shrink-0" />;
    }
  };
  const formatDateTime = (isoString) => {
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        time: d.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
    } catch {
      return { date: isoString, time: "" };
    }
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col flex-1 pb-12"
    >
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Giám sát an ninh & Phiên truy cập</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Nhật ký Hệ Thống
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ghi nhận chi tiết lịch sử ra vào, bảo mật và tài khoản trực tuyến
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/audit-logs"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition-colors "
          >
            <ClipboardList className="w-4 h-4" />
            <span>Nhật ký Kiểm toán (Audit)</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchLogs();
              fetchSessions();
            }}
            leftIcon={
              <RefreshCw
                className={`w-4 h-4 ${loadingLogs || loadingSessions ? "animate-spin text-slate-500" : ""}`}
              />
            }
          >
            Làm mới
          </Button>
        </div>
      </header>
      {/* Primary Tab Navigation & Counters */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
      >
        {/* Tab 1: System Logs */}
        <button
          onClick={() => setActiveTab("logs")}
          className={`p-4 rounded-xl border text-left transition-all duration-300 relative overflow-hidden flex items-center justify-between group hover-lift ${activeTab === "logs" ? "glass-panel border-slate-900 shadow-float" : "glass border-slate-200 hover:border-slate-300"}`}
        >
          <div className="flex items-center gap-4 relative z-10">
            <div
              className={`w-12 h-12 rounded flex items-center justify-center shrink-0 transition-colors ${activeTab === "logs" ? "bg-slate-900 text-white " : "bg-white text-slate-500 border border-slate-200"}`}
            >
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                Nhật ký ra vào & Tác vụ
              </p>
              <p className="text-2xl font-bold font-mono text-slate-900 tracking-tighter">
                {totalLogs}
                <span className="text-xs font-semibold text-slate-500 font-sans tracking-normal ml-1">
                  bản ghi
                </span>
              </p>
            </div>
          </div>
          <span
            className={`text-[9px] px-2 py-1 rounded font-semibold uppercase tracking-wider relative z-10 ${activeTab === "logs" ? "bg-slate-100 text-slate-800" : "text-slate-500 bg-white border border-slate-200"}`}
          >
            Chi tiết
          </span>
        </button>
        {/* Tab 2: Active Online Sessions */}
        <button
          onClick={() => setActiveTab("sessions")}
          className={`p-4 rounded-xl border text-left transition-all duration-300 relative overflow-hidden flex items-center justify-between group hover-lift ${activeTab === "sessions" ? "glass-panel border-blue-600 shadow-float" : "glass border-slate-200 hover:border-blue-200"}`}
        >
          <div className="flex items-center gap-4 relative z-10">
            <div
              className={`w-12 h-12 rounded flex items-center justify-center shrink-0 transition-colors ${activeTab === "sessions" ? "bg-blue-600 text-white " : "bg-white text-blue-500 border border-blue-100"}`}
            >
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${activeTab === "sessions" ? "bg-blue-500 animate-ping" : "bg-slate-300"}`}
                />
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Tài khoản đang hoạt động
                </p>
              </div>
              <p className="text-2xl font-bold font-mono text-blue-700 tracking-tighter">
                {activeCount}
                <span className="text-xs font-semibold text-slate-500 font-sans tracking-normal ml-1">
                  phiên trực tuyến
                </span>
              </p>
            </div>
          </div>
          <span
            className={`text-[9px] px-2 py-1 rounded font-semibold uppercase tracking-wider relative z-10 ${activeTab === "sessions" ? "bg-blue-50 text-blue-700" : "text-slate-500 bg-white border border-slate-200"}`}
          >
            Trực tiếp
          </span>
        </button>
      </motion.div>
      {/* CONTENT TAB 1: SYSTEM AUDIT LOGS */}
      {activeTab === "logs" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 flex-1 flex flex-col"
        >
          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-md border border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo email, tên, IP hoặc chi tiết..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 transition-all"
              />
            </div>
            {/* Filter by Action */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-md border border-slate-200 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer w-full min-w-[130px]"
                >
                  <option value="all">Tất cả hành động</option>
                  <option value="LOGIN_SUCCESS">Đăng nhập thành công</option>
                  <option value="LOGIN_FAILED">Đăng nhập thất bại</option>
                  <option value="LOGOUT">Đăng xuất</option>
                  <option value="REGISTER">Đăng ký mới</option>
                  <option value="ACCOUNT_LOCKED">Khóa tài khoản</option>
                  <option value="PASSWORD_CHANGE">Đổi mật khẩu</option>
                  <option value="ROLE_CHANGED">Đổi phân quyền</option>
                </select>
              </div>
              {/* Filter by Status */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 transition-all cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="success">Thành công (Success)</option>
                <option value="danger">Thất bại (Danger)</option>
                <option value="warning">Cảnh báo (Warning)</option>
                <option value="info">Thông tin (Info)</option>
              </select>
              {/* Limit */}
              <select
                value={logLimit}
                onChange={(e) => setLogLimit(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 transition-all cursor-pointer"
              >
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
                <option value={200}>200 dòng</option>
              </select>
            </div>
          </div>
          {/* Logs Table */}
          <div className="glass rounded-xl border border-slate-200/60 overflow-hidden flex-1 flex flex-col shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Hành động</th>
                    <th className="py-3 px-4">Tài khoản & Vai trò</th>
                    <th className="py-3 px-4">Địa chỉ IP & Thiết bị</th>
                    <th className="py-3 px-4">Nội dung chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
                          <span className="font-medium text-sm">
                            Đang tải nhật ký kiểm toán hệ thống...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Layers className="w-10 h-10 text-slate-400" />
                          <p className="font-medium text-slate-600 text-sm">
                            Không tìm thấy bản ghi nhật ký nào phù hợp.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const dt = formatDateTime(log.timestamp);
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 bg-slate-50 rounded border border-slate-200">
                                {getStatusIcon(log.status)}
                              </div>
                              <div>
                                <p className="font-semibold font-mono text-slate-800 text-sm">
                                  {dt.time}
                                </p>
                                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
                                  {dt.date}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {getActionBadge(log.action)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">
                                {log.user_name || "Khách vãng lai"}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">
                                {log.user_email}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 w-fit">
                                <Globe className="w-3 h-3 text-slate-500" />
                                {log.ip_address}
                              </span>
                              <span
                                className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider truncate max-w-[220px]"
                                title={log.user_agent}
                              >
                                {log.user_agent?.includes("iPhone") ||
                                log.user_agent?.includes("Android") ? (
                                  <span className="inline-flex items-center gap-1 text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                                    <Smartphone className="w-3 h-3" /> Mobile
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                    <Laptop className="w-3 h-3" /> Máy tính (PC)
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-slate-700">
                              {log.details}
                            </p>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Table Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between mt-auto">
              <span className="text-xs font-semibold text-slate-500">
                Hiển thị {logs.length} / {totalLogs} bản ghi gần nhất
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Lưu vết bảo mật
              </span>
            </div>
          </div>
        </motion.div>
      )}
      {/* CONTENT TAB 2: ACTIVE ONLINE SESSIONS */}
      {activeTab === "sessions" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 flex-1 flex flex-col"
        >
          {/* Header Banner */}
          <div className="glass-dark text-white p-6 rounded-xl border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-float">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-slate-800 text-blue-600 flex items-center justify-center shrink-0 border border-slate-700">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  Danh sách tài khoản đang Online
                  <span className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                    {sessions.length}
                  </span>
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Theo dõi phiên truy cập trực tiếp, thời gian đăng nhập, địa chỉ IP và ngắt kết nối.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSessions}
              leftIcon={
                <RefreshCw
                  className={`w-4 h-4 ${loadingSessions ? "animate-spin" : ""}`}
                />
              }
              className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
            >
              Cập nhật tức thì
            </Button>
          </div>
          {/* Sessions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 content-start">
            <AnimatePresence>
              {loadingSessions ? (
                <div className="col-span-full py-20 text-center text-slate-500 bg-white rounded-md border border-slate-200 flex flex-col items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin mb-3 text-slate-500" />
                  <span className="font-semibold text-sm">
                    Đang kiểm tra các phiên kết nối trực tuyến...
                  </span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-500 bg-white rounded-md border border-slate-200 flex flex-col items-center justify-center">
                  <UserX className="w-10 h-10 mb-3 text-slate-400" />
                  <p className="font-medium text-slate-600 text-sm">
                    Hiện không có phiên người dùng nào đang hoạt động.
                  </p>
                </div>
              ) : (
                sessions.map((sess) => {
                  const loginDt = formatDateTime(sess.loginAt);
                  const lastDt = formatDateTime(sess.lastActivityAt);
                  const isMobile =
                    sess.userAgent?.includes("iPhone") ||
                    sess.userAgent?.includes("Android");
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={sess.sessionId}
                      className="glass p-4 rounded-xl border border-slate-200 flex flex-col justify-between hover-lift transition-all group"
                    >
                      {/* Top Status */}
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded bg-slate-50 text-slate-700 font-semibold text-sm flex items-center justify-center shrink-0 relative border border-slate-200">
                            {sess.userName.charAt(0).toUpperCase()}
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white absolute -top-1 -right-1" />
                          </div>
                          <div className="min-w-0">
                            <p
                              className="font-semibold text-slate-900 text-sm truncate"
                              title={sess.userName}
                            >
                              {sess.userName}
                            </p>
                            <p
                              className="text-[10px] text-slate-500 truncate"
                              title={sess.userEmail}
                            >
                              {sess.userEmail}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded shrink-0 ${sess.userRole === "admin" ? "bg-orange-50 text-orange-700 border border-orange-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}
                        >
                          {sess.userRole === "admin"
                            ? "Quản trị viên"
                            : "Thành viên"}
                        </span>
                      </div>
                      {/* Metadata details */}
                      <div className="space-y-2.5 p-3 bg-slate-50 rounded border border-slate-200 mb-4 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> IP
                          </span>
                          <span className="font-mono font-semibold text-slate-700 text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {sess.ipAddress}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            {isMobile ? (
                              <Smartphone className="w-3 h-3" />
                            ) : (
                              <Laptop className="w-3 h-3" />
                            )}
                            Thiết bị
                          </span>
                          <span className="font-medium text-slate-700 text-[10px]">
                            {isMobile ? "Di động" : "Máy tính (PC/Mac)"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Đăng nhập
                          </span>
                          <span className="font-medium text-slate-700 text-[10px]">
                            {loginDt.time} - {loginDt.date}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 pt-2 border-t border-slate-200">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <ArrowDownRight className="w-3 h-3 text-slate-500" />
                            Tương tác cuối
                          </span>
                          <span className="font-semibold text-slate-700 text-[10px]">
                            {lastDt.time} ({lastDt.date})
                          </span>
                        </div>
                      </div>
                      {/* Force terminate action */}
                      <div className="mt-auto">
                        <button
                          onClick={() =>
                            handleTerminateSession(
                              sess.sessionId,
                              sess.userName,
                            )
                          }
                          className="w-full py-2 px-3 rounded bg-white hover:bg-rose-50 text-rose-600 text-[10px] font-semibold uppercase tracking-wider border border-slate-200 hover:border-rose-200 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <UserX className="w-3.5 h-3.5" /> Buộc ngắt phiên
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
