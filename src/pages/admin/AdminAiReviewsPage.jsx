import React, { useState, useEffect } from "react";
import { adminApi } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import {
  Bot,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Stethoscope,
  RefreshCw,
  FileText,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
export const AdminAiReviewsPage = () => {
  const { success, error } = useToast();
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all"); // Review Modal
const [selectedRecord, setSelectedRecord] = useState(null);
  const [physicianNotes, setPhysicianNotes] = useState("");
  const [physicianReviewed, setPhysicianReviewed] = useState(false);
  const [saving, setSaving] = useState(false);
  const fetchDiagnoses = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAiDiagnosisReviews({
        riskLevel: riskFilter,
        search,
      });
      if (res.success && res.data) {
        setDiagnoses(res.data);
      }
    } catch (err) {
      console.error(err);
      error("Không thể tải dữ liệu chẩn đoán AI");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchDiagnoses();
  }, [riskFilter, search]);
  const handleOpenReview = (rec) => {
    setSelectedRecord(rec);
    setPhysicianNotes(rec.physician_notes || "");
    setPhysicianReviewed(Boolean(rec.physician_reviewed));
  };
  const handleSaveReview = async () => {
    if (!selectedRecord) return;
    try {
      setSaving(true);
      const res = await adminApi.reviewAiDiagnosis(selectedRecord.id, {
        physician_reviewed: physicianReviewed,
        physician_notes: physicianNotes,
      });
      if (res.success) {
        success(
          "Đã lưu ý kiến Bác sĩ và thẩm định ca chẩn đoán AI thành công!",
        );
        setSelectedRecord(null);
        fetchDiagnoses();
      } else {
        error(res.message || "Lỗi lưu kết quả thẩm định");
      }
    } catch (err) {
      error(err.message || "Lỗi thẩm định");
    } finally {
      setSaving(false);
    }
  };
  const total = diagnoses.length;
  const highRiskCount = diagnoses.filter((d) => d.riskLevel === "high").length;
  const mediumRiskCount = diagnoses.filter(
    (d) => d.riskLevel === "medium",
  ).length;
  const reviewedCount = diagnoses.filter((d) => d.physician_reviewed).length;
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-semibold uppercase tracking-wider mb-2">
            <Bot className="w-3.5 h-3.5" />
            <span>Thẩm Định & Kiểm Duyệt AI Y Khoa</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            AI Diagnosis Audit & Review
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Bác sĩ chuyên khoa giám sát và phê duyệt các chuẩn đoán tự động từ mô hình AI
          </p>
        </div>
      </header>

      {/* Summary Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
      >
        <div className="bg-white p-4 rounded-md border border-slate-200">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Tổng số ca phân tích AI
          </p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {total}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {reviewedCount} ca đã thẩm định
          </p>
        </div>
        <div className="bg-white p-4 rounded-md border border-rose-200">
          <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider">
            Ca rủi ro Cao (High)
          </p>
          <p className="text-2xl font-bold font-mono text-rose-700 mt-1">
            {highRiskCount}
          </p>
          <p className="text-xs font-medium text-rose-600 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Ưu tiên Bác sĩ duyệt
          </p>
        </div>
        <div className="bg-white p-4 rounded-md border border-orange-200">
          <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">
            Ca rủi ro Vừa (Medium)
          </p>
          <p className="text-2xl font-bold font-mono text-orange-700 mt-1">
            {mediumRiskCount}
          </p>
          <p className="text-xs font-medium text-orange-600 mt-1">
            Cần chú ý lối sống
          </p>
        </div>
        <div className="bg-white p-4 rounded-md border border-indigo-200">
          <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
            Tỷ lệ đã kiểm duyệt
          </p>
          <p className="text-2xl font-bold font-mono text-indigo-700 mt-1">
            {total > 0 ? Math.round((reviewedCount / total) * 100) : 100}%
          </p>
          <p className="text-xs font-medium text-indigo-600 mt-1">
            Đảm bảo an toàn y khoa
          </p>
        </div>
      </motion.div>
      {/* Filter Bar */}
      <motion.div
        variants={itemVariants}
        className="bg-white p-3 rounded-md border border-slate-200 mb-6 flex flex-col xl:flex-row items-center gap-4 justify-between"
      >
        <div className="w-full xl:w-96">
          <Input
            placeholder="Tìm theo bệnh nhân, bệnh lý, triệu chứng..."
            leftIcon={<Search className="w-4 h-4 text-slate-500" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto w-full xl:w-auto pb-1 xl:pb-0 hide-scrollbar">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-2">
            <Filter className="w-3.5 h-3.5" /> Mức độ rủi ro:
          </span>
          {[
            { id: "all", label: "Tất cả" },
            { id: "high", label: "🚨 Rủi ro cao" },
            { id: "medium", label: "⚠️ Rủi ro vừa" },
            { id: "low", label: "✅ Rủi ro thấp" },
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
      {/* Diagnoses List */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-50 rounded-md border border-slate-200 p-4 sm:p-6 flex-1"
      >
        {loading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mb-3" />
            <span className="text-sm font-medium">
              Đang tải danh sách hồ sơ chẩn đoán AI...
            </span>
          </div>
        ) : diagnoses.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <Bot className="w-10 h-10 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-600">
              Chưa có bản ghi chẩn đoán AI nào phù hợp.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Khi người dùng thực hiện chẩn đoán qua AI, dữ liệu sẽ tự động xuất hiện ở đây.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {diagnoses.map((diag) => {
                const isHigh = diag.riskLevel === "high";
                const isMed = diag.riskLevel === "medium";
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    key={diag.id}
                    className={`p-4 rounded-md border transition-all ${isHigh ? "border-rose-200 bg-white hover:border-rose-300" : isMed ? "border-orange-200 bg-white hover:border-orange-300" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center font-semibold text-xs border border-slate-200">
                              {diag.user_name
                                ? diag.user_name.charAt(0).toUpperCase()
                                : "U"}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 text-sm block">
                                {diag.user_name || `User #${diag.user_id}`}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {diag.user_email}
                              </span>
                            </div>
                          </div>
                          <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>
                          {isHigh ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" /> Rủi ro Cao
                            </span>
                          ) : isMed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
                              Rủi ro Vừa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Rủi ro Thấp
                            </span>
                          )}
                          {diag.physician_reviewed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Stethoscope className="w-3 h-3" /> Đã duyệt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                              <Clock className="w-3 h-3" /> Chưa duyệt
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 sm:ml-auto font-mono bg-slate-50 px-1.5 py-0.5 rounded">
                            {new Date(diag.createdAt).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                          <p className="text-sm text-slate-800">
                            {diag.summary}
                          </p>
                        </div>
                        {/* Triệu chứng & Bệnh lý nghi ngờ */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                            Bệnh cảnh AI (Top):
                          </span>
                          {diag.possibleConditions
                            .slice(0, 3)
                            .map((cond, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold flex items-center gap-1"
                              >
                                {cond.name}
                                <span className="text-slate-500 font-mono">
                                  {Math.round(cond.probability * 100)}%
                                </span>
                              </span>
                            ))}
                          {diag.possibleConditions.length > 3 && (
                            <span className="text-[9px] font-semibold text-slate-500">
                              +{diag.possibleConditions.length - 3} nữa
                            </span>
                          )}
                        </div>
                        {/* Bác sĩ phản hồi nếu có */}
                        {diag.physician_notes && (
                          <div className="mt-2 p-3 rounded bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900">
                            <p className="font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1 text-indigo-700 mb-1">
                              <Stethoscope className="w-3 h-3" /> Ghi chú chuyên môn:
                            </p>
                            <p className="italic">
                              {diag.physician_notes}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center lg:flex-col justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 mt-2 lg:mt-0 lg:pl-4 lg:border-l">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={
                            <Stethoscope className="w-4 h-4 text-indigo-600" />
                          }
                          onClick={() => handleOpenReview(diag)}
                          className="w-full lg:w-auto"
                        >
                          Thẩm Định Ca
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
      {/* Review Modal */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Thẩm Định & Phê Duyệt Chẩn Đoán AI"
        subtitle={`Bệnh nhân: ${selectedRecord?.user_name} (${selectedRecord?.user_email})`}
        maxWidth="lg"
      >
        {selectedRecord && (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-indigo-600" /> Tóm tắt suy luận của AI
                </span>
                <span
                  className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${selectedRecord.riskLevel === "high" ? "bg-rose-50 text-rose-700 border-rose-200" : selectedRecord.riskLevel === "medium" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
                >
                  Mức độ: {selectedRecord.riskLevel}
                </span>
              </div>
              <p className="text-sm text-slate-800">
                {selectedRecord.summary}
              </p>
            </div>
            
            {/* Possible Conditions & Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-md border border-slate-200">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-rose-500" /> Bệnh lý dự báo & Xác suất
                </p>
                <div className="space-y-3">
                  {selectedRecord.possibleConditions.map((c, i) => (
                    <div
                      key={i}
                      className="text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex justify-between font-semibold text-slate-800 mb-0.5">
                        <span>{c.name}</span>
                        <span className="text-slate-500 font-mono">
                          {Math.round(c.probability * 100)}%
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {c.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-4 rounded-md border border-slate-200">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-500" /> Hành động AI khuyến nghị
                </p>
                <ul className="space-y-2">
                  {selectedRecord.recommendations.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-slate-700"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Physician Decision Section */}
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-slate-500" /> Kết luận chuyên môn
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1.5 rounded border border-slate-200 hover:border-slate-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={physicianReviewed}
                    onChange={(e) => setPhysicianReviewed(e.target.checked)}
                    className="w-3.5 h-3.5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                    Xác nhận đã thẩm định
                  </span>
                </label>
              </div>
              <textarea
                rows={4}
                value={physicianNotes}
                onChange={(e) => setPhysicianNotes(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md p-2.5 text-sm transition-all resize-none"
                placeholder="Nhập đánh giá lâm sàng, xác nhận hoặc đính chính kết quả của AI, chỉ định xét nghiệm thêm (ECG, Holter, Siêu âm tim) nếu cần..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)}>
                Hủy Bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={saving}
                onClick={handleSaveReview}
              >
                Lưu Thẩm Định Y Khoa
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
