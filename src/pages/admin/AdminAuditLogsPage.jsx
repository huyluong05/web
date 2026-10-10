import { DataStatus } from '../../components/common/DataStatus';
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { adminApi } from "../../api/client";
import {
  ClipboardList,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Globe,
  User,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  X,
  Copy,
  Check,
  FileCode2,
  Calendar,
  Laptop,
  Activity,
  Lock,
  Database,
} from "lucide-react";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "../../context/ToastContext";

export const AdminAuditLogsPage = () => {
  const [loadError, setLoadError] = useState('');

  const { success } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedResourceType, setSelectedResourceType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  
  const [stats, setStats] = useState({
    total: 0,
    totalSuccess: 0,
    totalFailed: 0,
    totalWarning: 0,
  });
  
  const [filterOptions, setFilterOptions] = useState({
    availableModules: [],
    availableActions: [],
    availableRoles: [],
    availableResourceTypes: [],
  });

  const [inspectingLog, setInspectingLog] = useState(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAuditLogs({
        search: searchQuery.trim() || undefined,
        module: selectedModule !== "all" ? selectedModule : undefined,
        action: selectedAction !== "all" ? selectedAction : undefined,
        role: selectedRole !== "all" ? selectedRole : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        resourceType:
          selectedResourceType !== "all" ? selectedResourceType : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: currentPage,
        limit: pageSize,
      });
      if (!res.success) { setLoadError(res.message); return; }
      setLoadError('');
      if (res.success && res.data) {
        setLogs(res.data.logs || []);
        if (res.data.pagination) setPagination(res.data.pagination);
        if (res.data.stats) setStats(res.data.stats);
        if (res.data.filters) setFilterOptions(res.data.filters);
      }
    } catch (err) {
      console.error("Lỗi tải nhật ký kiểm toán:", err);
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery,
    selectedModule,
    selectedAction,
    selectedRole,
    selectedStatus,
    selectedResourceType,
    startDate,
    endDate,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedModule("all");
    setSelectedAction("all");
    setSelectedRole("all");
    setSelectedStatus("all");
    setSelectedResourceType("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return "--";
    const d = new Date(isoStr);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatRelativeTime = (isoStr) => {
    if (!isoStr) return "";
    const diffMs = Date.now() - new Date(isoStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  };

  const getActionBadge = (action = "") => {
    const act = action.toUpperCase();
    if (act.includes("DELETE") || act.includes("LOCK") || act.includes("TERMINATE")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (act.includes("CREATE") || act.includes("REGISTER") || act.includes("UNLOCKED")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (act.includes("UPDATE") || act.includes("ROLE") || act.includes("PASSWORD") || act.includes("RESET")) {
      return "bg-orange-50 text-orange-700 border-orange-200";
    }
    if (act.includes("LOGIN") || act.includes("LOGOUT")) {
      return "bg-sky-50 text-sky-700 border-sky-200";
    }
    if (act.includes("VIEW")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getStatusBadge = (status = "") => {
    switch (status.toUpperCase()) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Thành công
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> Thất bại
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
            <AlertTriangle className="w-3 h-3" /> Cảnh báo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `vitaltrack_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    success("Đã tải xuống file JSON");
  };

  const handleExportCsv = () => {
    const headers = [
      "ID", "Thời gian", "Người dùng", "Vai trò", "Phân hệ", "Trang",
      "Hành động", "Đối tượng", "ID Đối tượng", "Trạng thái", "Mô tả", "IP"
    ];
    const rows = logs.map((l) => [
      l.id,
      l.created_at,
      `"${(l.user_name || "").replace(/"/g, '""')}"`,
      l.user_role || "",
      `"${(l.module || "").replace(/"/g, '""')}"`,
      `"${(l.page || "").replace(/"/g, '""')}"`,
      l.action || "",
      l.resource_type || "",
      l.resource_id || "",
      l.status || "",
      `"${(l.description || "").replace(/"/g, '""')}"`,
      l.ip_address || "",
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vitaltrack_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    success("Đã tải xuống báo cáo CSV");
  };

  const handleCopyJson = (obj) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedJson(true);
    success("Đã sao chép JSON payload");
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } },
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex flex-col flex-1 pb-8">
      <DataStatus error={loadError} onRetry={fetchAuditLogs} />
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Security & Audit Trails
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Giám sát và truy vết chi tiết hoạt động hệ thống
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />}
            onClick={fetchAuditLogs}
            disabled={loading}
          >
            Làm mới
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4 text-emerald-600" />}
            onClick={handleExportCsv}
            disabled={logs.length === 0}
          >
            Xuất CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<FileCode2 className="w-4 h-4" />}
            onClick={handleExportJson}
            disabled={logs.length === 0}
          >
            Xuất JSON
          </Button>
        </div>
      </header>

      {/* KPI Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-slate-200  flex items-center gap-4">
          <div className="w-10 h-10 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng sự kiện</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.total.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200  flex items-center gap-4">
          <div className="w-10 h-10 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Thành công</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.totalSuccess.toLocaleString()}
              <span className="text-[10px] font-bold text-emerald-600 ml-1.5">
                ({stats.total > 0 ? Math.round((stats.totalSuccess / stats.total) * 100) : 100}%)
              </span>
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200  flex items-center gap-4">
          <div className="w-10 h-10 rounded-md bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Thất bại</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalFailed.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200  flex items-center gap-4">
          <div className="w-10 h-10 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phân hệ theo dõi</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{filterOptions.availableModules.length}</p>
          </div>
        </div>
      </motion.div>

      {/* Filter Bar */}
      <motion.div variants={itemVariants} className="bg-white p-4 rounded-lg border border-slate-200  mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
          {/* Search query */}
          <div className="sm:col-span-2 relative">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Tìm kiếm từ khóa</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2" />
              <input
                type="text"
                placeholder="Người dùng, email, IP..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-2 text-slate-500 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Module Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Phân hệ</label>
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:border-blue-500 outline-none"
            >
              <option value="all">Tất cả</option>
              {filterOptions.availableModules.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Hành động</label>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:border-blue-500 outline-none"
            >
              <option value="all">Tất cả</option>
              {filterOptions.availableActions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Vai trò</label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:border-blue-500 outline-none"
            >
              <option value="all">Tất cả</option>
              <option value="admin">Quản trị viên</option>
              <option value="user">Người dùng</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Kết quả</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:border-blue-500 outline-none"
            >
              <option value="all">Tất cả</option>
              <option value="SUCCESS">Thành công</option>
              <option value="FAILED">Thất bại</option>
              <option value="WARNING">Cảnh báo</option>
            </select>
          </div>
        </div>

        {/* Date range & Reset Filter line */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 mt-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-600">Từ:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-sm bg-white border border-slate-300 rounded focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">Đến:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-sm bg-white border border-slate-300 rounded focus:border-blue-500 outline-none"
              />
            </div>
            {(searchQuery ||
              selectedModule !== "all" ||
              selectedAction !== "all" ||
              selectedRole !== "all" ||
              selectedStatus !== "all" ||
              startDate ||
              endDate) && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Xóa bộ lọc
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600">Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 text-sm bg-white border border-slate-300 rounded focus:border-blue-500 outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Audit Logs Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-lg border border-slate-200  overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-40">Thời gian</th>
                <th className="py-3 px-4 w-48">Chủ thể</th>
                <th className="py-3 px-4 w-40">Phân hệ & Trang</th>
                <th className="py-3 px-4 w-32">Hành động</th>
                <th className="py-3 px-4 w-32">Đối tượng</th>
                <th className="py-3 px-4">Mô tả</th>
                <th className="py-3 px-4 w-28">Kết quả</th>
                <th className="py-3 px-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                    Đang tải nhật ký...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Không tìm thấy bản ghi nào.
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {logs.map((log) => {
                    const hasChanges = log.metadata?.changed_fields && log.metadata.changed_fields.length > 0;
                    return (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={log.id}
                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                        onClick={() => setInspectingLog(log)}
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{formatDate(log.created_at)}</span>
                            <span className="text-[10px] text-slate-500">{formatRelativeTime(log.created_at)}</span>
                          </div>
                        </td>
                        
                        {/* Actor */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                              log.user_role === "admin" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-700"
                            }`}>
                              {log.user_name ? log.user_name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate max-w-[140px]">
                                {log.user_name || "Khách / Vô danh"}
                              </p>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <span className="uppercase">{log.user_role || "GUEST"}</span>
                                <span>•</span>
                                <span className="font-mono">{log.ip_address || "127.0.0.1"}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Module & Page */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                              {log.module || "Hệ thống"}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]" title={log.page}>
                              {log.page || "--"}
                            </span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getActionBadge(log.action)}`}>
                            {log.action}
                          </span>
                        </td>

                        {/* Target Resource */}
                        <td className="py-3 px-4">
                          {log.resource_type ? (
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="font-semibold text-slate-700">{log.resource_type}</span>
                              {log.resource_id != null && (
                                <span className="text-slate-500 font-mono">#{log.resource_id}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">--</span>
                          )}
                        </td>

                        {/* Description */}
                        <td className="py-3 px-4">
                          <p className="text-slate-700 text-sm line-clamp-1" title={log.description}>
                            {log.description || "--"}
                          </p>
                          {hasChanges && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-600 mt-1">
                              <ArrowUpDown className="w-3 h-3" /> {log.metadata.changed_fields.length} thay đổi
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {getStatusBadge(log.status)}
                        </td>

                        {/* Action button */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingLog(log);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-t border-slate-200 bg-slate-50 mt-auto">
          <div className="text-xs text-slate-500">
            Hiển thị <span className="font-bold text-slate-900">{logs.length}</span> / <span className="font-bold text-slate-900">{pagination.total}</span> bản ghi
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Trước
            </Button>
            <span className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-md">
              {currentPage} / {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              disabled={currentPage >= pagination.totalPages || loading}
            >
              Sau <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Detailed Inspection Modal */}
      <Modal
        isOpen={!!inspectingLog}
        onClose={() => setInspectingLog(null)}
        title={`Chi tiết Log #${inspectingLog?.id}`}
        subtitle={`${formatDate(inspectingLog?.created_at)}`}
        maxWidth="3xl"
      >
        {inspectingLog && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* 5W1H Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-[11px] font-bold tracking-wider text-slate-500 mb-1 flex items-center gap-1.5 uppercase">
                  <User className="w-3.5 h-3.5" /> Chủ thể
                </p>
                <p className="text-sm font-semibold text-slate-900">{inspectingLog.user_name || "Hệ thống"}</p>
                <p className="text-xs text-slate-500 mt-1 uppercase">{inspectingLog.user_role || "guest"}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-[11px] font-bold tracking-wider text-slate-500 mb-1 flex items-center gap-1.5 uppercase">
                  <Activity className="w-3.5 h-3.5" /> Hành động
                </p>
                <div className="mb-1">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getActionBadge(inspectingLog.action)}`}>
                    {inspectingLog.action}
                  </span>
                </div>
                <p className="text-xs text-slate-500 uppercase">{inspectingLog.module || "--"}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-[11px] font-bold tracking-wider text-slate-500 mb-1 flex items-center gap-1.5 uppercase">
                  <Globe className="w-3.5 h-3.5" /> Nơi & Đối tượng
                </p>
                <p className="text-xs font-mono font-semibold text-slate-800 truncate mb-1">
                  {inspectingLog.page || "--"}
                </p>
                <p className="text-xs text-slate-500">
                  {inspectingLog.resource_type || "--"} {inspectingLog.resource_id ? `#${inspectingLog.resource_id}` : ""}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Mô tả hành vi</h4>
              <p className="text-sm text-slate-800">{inspectingLog.description}</p>
            </div>

            {/* Visual Data Diff */}
            {inspectingLog.metadata?.changed_fields && inspectingLog.metadata.changed_fields.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-[11px] font-bold text-orange-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" /> Biến động dữ liệu
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="py-2 px-3 border-b border-slate-200 w-1/3">Trường</th>
                        <th className="py-2 px-3 border-b border-l border-slate-200 w-1/3">Cũ</th>
                        <th className="py-2 px-3 border-b border-l border-slate-200 w-1/3">Mới</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-mono">
                      {inspectingLog.metadata.changed_fields.map((field) => {
                        const oldVal = inspectingLog.metadata.old_values?.[field];
                        const newVal = inspectingLog.metadata.new_values?.[field];
                        return (
                          <tr key={field} className="bg-white">
                            <td className="py-2 px-3 bg-slate-50 text-slate-700">{field}</td>
                            <td className="py-2 px-3 border-l border-slate-100 text-rose-700 bg-rose-50/30">
                              {oldVal !== undefined && oldVal !== null ? (typeof oldVal === "object" ? JSON.stringify(oldVal) : String(oldVal)) : <span className="text-slate-500 italic">Trống</span>}
                            </td>
                            <td className="py-2 px-3 border-l border-slate-100 text-emerald-700 bg-emerald-50/30">
                              {newVal !== undefined && newVal !== null ? (typeof newVal === "object" ? JSON.stringify(newVal) : String(newVal)) : <span className="text-slate-500 italic">Trống</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Network Fingerprint */}
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Thông tin thiết bị</h4>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block mb-1 font-sans font-bold uppercase tracking-wider text-[10px]">IP Address</span>
                  {inspectingLog.ip_address || "127.0.0.1"}
                </div>
                <div>
                  <span className="text-slate-500 block mb-1 font-sans font-bold uppercase tracking-wider text-[10px]">User Agent</span>
                  <span className="line-clamp-2" title={inspectingLog.user_agent}>{inspectingLog.user_agent || "Không xác định"}</span>
                </div>
              </div>
            </div>

            {/* Raw JSON */}
            <div className="border-t border-slate-100 pt-4 relative group">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Raw Payload</h4>
                <button
                  onClick={() => handleCopyJson(inspectingLog.metadata)}
                  className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700"
                >
                  {copiedJson ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedJson ? "Đã sao chép" : "Copy"}
                </button>
              </div>
              <pre className="bg-slate-900 text-emerald-600 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-48 custom-scrollbar">
                {JSON.stringify(inspectingLog.metadata || {}, null, 2)}
              </pre>
            </div>
            
            <div className="flex justify-end pt-4 mt-2">
              <Button variant="outline" onClick={() => setInspectingLog(null)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
