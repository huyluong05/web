import React, { useState, useEffect } from "react";
import { adminApi } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { ClinicalAnalyticsChart } from "../../components/charts/ClinicalAnalyticsChart";
import { CircadianBPRhythmChart } from "../../components/charts/CircadianBPRhythmChart";
import {
  Activity,
  Search,
  Filter,
  AlertTriangle,
  Heart,
  CheckCircle2,
  Trash2,
  Download,
  Stethoscope,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
export const AdminTelemetryPage = () => {
  const { success, error } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [showCharts, setShowCharts] = useState(true); // Modals state
const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    systolic: 120,
    diastolic: 80,
    heart_rate: 72,
    weight: 68,
    notes: "",
    doctor_reviewed: false,
    doctor_notes: "",
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const fetchTelemetry = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getTelemetryRecords({
        riskCategory: riskFilter,
        search,
      });
      if (res.success && res.data) {
        setRecords(res.data);
      }
    } catch (err) {
      console.error(err);
      error("Không thể tải danh sách chỉ số sinh tồn");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTelemetry();
  }, [riskFilter, search]);
  const handleOpenEdit = (rec) => {
    setEditingRecord(rec);
    setEditForm({
      systolic: rec.systolic,
      diastolic: rec.diastolic,
      heart_rate: rec.heart_rate,
      weight: rec.weight,
      notes: rec.notes || "",
      doctor_reviewed: Boolean(rec.doctor_reviewed),
      doctor_notes: rec.doctor_notes || "",
    });
  };
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    try {
      const res = await adminApi.updateTelemetryRecord(
        editingRecord.id,
        editForm,
      );
      if (res.success) {
        success("Đã lưu đánh giá lâm sàng và cập nhật chỉ số thành công!");
        setEditingRecord(null);
        fetchTelemetry();
      } else {
        error(res.message || "Lỗi cập nhật");
      }
    } catch (err) {
      error(err.message || "Lỗi lưu bản ghi");
    }
  };
  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await adminApi.deleteTelemetryRecord(deleteConfirmId);
      if (res.success) {
        success("Đã xóa bản ghi dữ liệu thành công.");
        setRecords((prev) => prev.filter((r) => r.id !== deleteConfirmId));
      } else {
        error(res.message || "Lỗi xóa bản ghi");
      }
    } catch (err) {
      error(err.message || "Lỗi xóa bản ghi");
    } finally {
      setDeleteConfirmId(null);
    }
  };
  const handleExportCSV = () => {
    if (records.length === 0) {
      error("Không có dữ liệu để xuất CSV.");
      return;
    }
    const headers = [
      "ID",
      "Benh_nhan",
      "Email",
      "Huyet_ap_tam_thu",
      "Huyet_ap_tam_truong",
      "Nhip_tim",
      "Can_nang",
      "Phan_loai_rui_ro",
      "Bac_si_danh_gia",
      "Ghi_chu_bac_si",
      "Thoi_gian",
    ];
    const rows = records.map((r) => [
      r.id,
      `"${r.user_name || ""}"`,
      `"${r.user_email || ""}"`,
      r.systolic,
      r.diastolic,
      r.heart_rate,
      r.weight,
      r.riskCategory,
      r.doctor_reviewed ? "Da_xem" : "Chua_xem",
      `"${(r.doctor_notes || "").replace(/"/g, '""')}"`,
      r.recorded_at,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `vitaltrack_telemetry_export_${Date.now()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("Đã xuất báo cáo dữ liệu sinh tồn CSV thành công!");
  }; // Stats calculation
const total = records.length;
  const crisisCount = records.filter((r) => r.riskCategory === "crisis").length;
  const stage2Count = records.filter((r) => r.riskCategory === "stage2").length;
  const arrhythmiaCount = records.filter(
    (r) =>
      r.riskCategory === "arrhythmia" ||
      r.heart_rate > 100 ||
      r.heart_rate < 55,
  ).length;
  const reviewedCount = records.filter((r) => r.doctor_reviewed).length;
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
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold uppercase tracking-wider mb-2">
            <Activity className="w-3.5 h-3.5" />
            <span>Giám Sát Sinh Tồn Bệnh Nhân Toàn Hệ Thống</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Telemetry & Chỉ Số Sức Khỏe
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi luồng đo huyết áp, nhịp tim, cân nặng thời gian thực từ tất cả người dùng
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<BarChart3 className="w-4 h-4 text-slate-600" />}
            rightIcon={
              showCharts ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )
            }
            onClick={() => setShowCharts((prev) => !prev)}
          >
            {showCharts ? "Thu Gọn Biểu Đồ" : "Hiển Thị Biểu Đồ Lâm Sàng"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4 text-emerald-600" />}
            onClick={handleExportCSV}
          >
            Xuất Báo Cáo CSV
          </Button>
        </div>
      </header>

      {/* Interactive Clinical Charts Section */}
      <AnimatePresence>
        {showCharts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 mb-6 overflow-hidden"
          >
            <ClinicalAnalyticsChart
              records={records}
              title="Biểu Đồ Xu Hướng Huyết Áp Sinh Tồn (Live Telemetry Trends)"
              subtitle="Phân tích thời gian thực dữ liệu đo lâm sàng từ thiết bị Bluetooth & hồ sơ bệnh nhân"
            />
            <CircadianBPRhythmChart records={records} />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Overview Stat Badges */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
      >
        <div className="bg-white p-4 rounded-md border border-slate-200">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Tổng số bản ghi
          </p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {total}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {reviewedCount} đã có Bác sĩ đánh giá
          </p>
        </div>
        <div className="bg-white p-4 rounded-md border border-rose-200">
          <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider">
            Cơn Tăng Huyết Áp (≥180)
          </p>
          <p className="text-2xl font-bold font-mono text-rose-700 mt-1">
            {crisisCount}
          </p>
          <p className="text-xs font-medium text-rose-600 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Cần cấp cứu ngay
          </p>
        </div>
        <div className="bg-white p-4 rounded-md border border-orange-200">
          <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">
            Tăng HA Độ 2 (≥140)
          </p>
          <p className="text-2xl font-bold font-mono text-orange-700 mt-1">
            {stage2Count}
          </p>
          <p className="text-xs font-medium text-orange-600 mt-1">
            Cần can thiệp thuốc
          </p>
        </div>
        <div className="bg-white p-4 rounded-md border border-sky-200">
          <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-wider">
            Rối loạn nhịp tim
          </p>
          <p className="text-2xl font-bold font-mono text-sky-700 mt-1">
            {arrhythmiaCount}
          </p>
          <p className="text-xs font-medium text-sky-600 mt-1 flex items-center gap-1">
            <Activity className="w-3 h-3" /> &gt;100 hoặc &lt;55 bpm
          </p>
        </div>
      </motion.div>

      {/* Filters & Search */}
      <motion.div
        variants={itemVariants}
        className="bg-white p-3 rounded-md border border-slate-200 mb-6 flex flex-col xl:flex-row items-center gap-4 justify-between"
      >
        <div className="w-full xl:w-96">
          <Input
            placeholder="Tìm theo tên bệnh nhân, email, ghi chú..."
            leftIcon={<Search className="w-4 h-4 text-slate-500" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto w-full xl:w-auto pb-1 xl:pb-0 hide-scrollbar">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-2">
            <Filter className="w-3.5 h-3.5" /> Lọc rủi ro:
          </span>
          {[
            { id: "all", label: "Tất cả" },
            { id: "crisis", label: "🚨 Khẩn cấp (≥180)" },
            { id: "stage2", label: "Tăng HA Độ 2" },
            { id: "stage1", label: "Tiền Tăng HA" },
            { id: "arrhythmia", label: "Rối loạn nhịp" },
            { id: "normal", label: "Bình thường" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRiskFilter(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-all border ${riskFilter === tab.id ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>
      {/* Telemetry Table */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-md border border-slate-200 flex-1 overflow-hidden"
      >
        {loading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-500 mb-3" />
            <span className="text-sm font-medium">
              Đang tải dữ liệu sinh tồn thời gian thực...
            </span>
          </div>
        ) : records.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <Activity className="w-10 h-10 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-600">
              Không tìm thấy bản ghi sinh tồn phù hợp.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Hãy thử thay đổi điều kiện lọc hoặc từ khóa tìm kiếm.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Bệnh nhân</th>
                  <th className="py-3 px-4">Huyết áp (mmHg)</th>
                  <th className="py-3 px-4">Nhịp tim (bpm)</th>
                  <th className="py-3 px-4">Cân nặng (kg)</th>
                  <th className="py-3 px-4">Đánh giá rủi ro</th>
                  <th className="py-3 px-4">Bác sĩ phản hồi</th>
                  <th className="py-3 px-4">Thời gian ghi</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                <AnimatePresence>
                  {records.map((rec) => {
                    const isCrisis = rec.riskCategory === "crisis";
                    const isStage2 = rec.riskCategory === "stage2";
                    const isArrhythmia = rec.heart_rate > 100 || rec.heart_rate < 55;
                    return (
                      <motion.tr
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        key={rec.id}
                        className={`hover:bg-slate-50 transition-colors group ${isCrisis ? "bg-rose-50/30 hover:bg-rose-50/60" : isStage2 ? "bg-orange-50/20 hover:bg-orange-50/40" : ""}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded flex items-center justify-center font-semibold text-xs shrink-0 border ${isCrisis ? "bg-rose-50 text-rose-700 border-rose-200" : isStage2 ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}
                            >
                              {rec.user_name
                                ? rec.user_name.charAt(0).toUpperCase()
                                : "U"}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">
                                {rec.user_name}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate max-w-[120px]">
                                {rec.user_email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-baseline gap-1">
                            <span
                              className={`text-base font-bold font-mono ${isCrisis ? "text-rose-600" : isStage2 ? "text-orange-600" : "text-slate-800"}`}
                            >
                              {rec.systolic}/{rec.diastolic}
                            </span>
                            <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest">
                              mmHg
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Heart
                              className={`w-3.5 h-3.5 ${isArrhythmia ? "text-rose-500 animate-pulse" : "text-slate-500"}`}
                            />
                            <span
                              className={`text-sm font-mono font-bold ${isArrhythmia ? "text-rose-600" : "text-slate-700"}`}
                            >
                              {rec.heart_rate}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-600 text-xs">
                          {rec.weight}{" "}
                          <span className="text-[9px] uppercase font-semibold tracking-wider text-slate-500">
                            kg
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isCrisis ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" />
                              Cơn Tăng HA Khẩn Cấp
                            </span>
                          ) : isStage2 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
                              Tăng HA Độ 2
                            </span>
                          ) : rec.riskCategory === "stage1" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                              Tiền Tăng HA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Bình Thường
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {rec.doctor_reviewed ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[10px] uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 w-fit">
                                <CheckCircle2 className="w-3 h-3" /> Đã kiểm duyệt
                              </span>
                              {rec.doctor_notes && (
                                <p
                                  className="text-[10px] text-slate-600 italic line-clamp-1 max-w-[150px]"
                                  title={rec.doctor_notes}
                                >
                                  "{rec.doctor_notes}"
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 text-[10px] uppercase tracking-wider font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              <Clock className="w-3 h-3" />
                              Chờ Bác sĩ xem
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                          {new Date(rec.recorded_at).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                          <br />
                          <span className="text-[10px] text-slate-500">
                            {new Date(rec.recorded_at).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenEdit(rec)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                              title="Đánh giá lâm sàng / Hiệu đính chỉ số"
                            >
                              <Stethoscope className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(rec.id)}
                              className="p-1.5 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                              title="Xóa bản ghi sai lệch"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
      {/* Doctor Clinical Review & Edit Modal */}
      <Modal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        title="Đánh giá Lâm sàng & Hiệu đính Bản ghi"
        subtitle={`Bệnh nhân: ${editingRecord?.user_name} (${editingRecord?.user_email})`}
        maxWidth="md"
      >
        {editingRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-md border border-slate-200">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Tâm thu
                </label>
                <input
                  type="number"
                  value={editForm.systolic}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      systolic: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded px-2 py-1.5 text-sm font-mono transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Tâm trương
                </label>
                <input
                  type="number"
                  value={editForm.diastolic}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      diastolic: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded px-2 py-1.5 text-sm font-mono transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Nhịp tim
                </label>
                <input
                  type="number"
                  value={editForm.heart_rate}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      heart_rate: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded px-2 py-1.5 text-sm font-mono transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Cân nặng
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.weight}
                  onChange={(e) =>
                    setEditForm({ ...editForm, weight: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded px-2 py-1.5 text-sm font-mono transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Ghi chú của Người dùng / Thiết bị
              </label>
              <textarea
                rows={2}
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md p-2.5 text-sm transition-all resize-none"
                placeholder="Ghi chú người dùng khi đo..."
              />
            </div>
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-slate-500" /> Nhận xét
                  & Khuyến nghị y tế
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1.5 rounded border border-slate-200 hover:border-slate-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={editForm.doctor_reviewed}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        doctor_reviewed: e.target.checked,
                      })
                    }
                    className="w-3.5 h-3.5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                    Đánh dấu đã duyệt
                  </span>
                </label>
              </div>
              <textarea
                rows={3}
                value={editForm.doctor_notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, doctor_notes: e.target.value })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md p-2.5 text-sm transition-all resize-none"
                placeholder="Nhập lời dặn chuyên môn, điều chỉnh liều thuốc..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setEditingRecord(null)}>
                Hủy Bỏ
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                Lưu Đánh Giá Y Khoa
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Xác nhận xóa bản ghi"
        maxWidth="sm"
      >
        <div className="space-y-5">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex gap-3">
            <Trash2 className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-900 leading-relaxed">
              Bạn có chắc chắn muốn xóa bản ghi chỉ số này? Hành động này sẽ loại bỏ dữ liệu khỏi báo cáo và biểu đồ theo dõi của người dùng.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
              Hủy bỏ
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Xóa Bản Ghi
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
