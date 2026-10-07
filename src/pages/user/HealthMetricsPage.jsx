import React, { useState, useEffect } from "react";
import { UserHeader } from "../../components/layout/UserHeader";
import { Button } from "../../components/common/Button";
import { RecordMetricModal } from "../../components/forms/RecordMetricModal";
import { healthApi } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Plus, Edit2, Trash2, Activity, Scale, Heart, Droplets } from "lucide-react";
import { Modal } from "../../components/common/Modal";
import { motion } from "motion/react";

export const HealthMetricsPage = () => {
  const { success, error } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await healthApi.getAll("all");
      if (res.success && res.data) {
        // Sort newest first for table view
        const sorted = [...res.data].sort(
          (a, b) =>
            new Date(b.recorded_at).getTime() -
            new Date(a.recorded_at).getTime(),
        );
        setRecords(sorted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleEdit = (rec) => {
    setEditingRecord(rec);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      const res = await healthApi.delete(deletingId);
      if (res.success) {
        success("Đã xóa bản ghi sức khỏe thành công");
        setRecords((prev) => prev.filter((r) => r.id !== deletingId));
      } else {
        error(res.message || "Không thể xóa bản ghi");
      }
    } catch (err) {
      error(err.message || "Lỗi khi xóa bản ghi");
    } finally {
      setDeletingId(null);
    }
  };

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
        title="Sức khỏe"
        italicTitle="Chỉ số"
        subtitle="Quản lý và ghi nhận các chỉ số: Cân nặng, Huyết áp và Nhịp tim"
        onRecordClick={() => {
          setEditingRecord(null);
          setIsModalOpen(true);
        }}
        actionText="Thêm bản ghi mới"
      />

      {/* Summary Stat Bars */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-100">
              <Scale className="w-5 h-5" />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cân nặng mới nhất
            </p>
          </div>
          <div className="mt-auto flex items-baseline gap-1.5">
            <p className="text-4xl font-bold text-slate-900 tracking-tight">
              {records[0] ? `${records[0].weight}` : "--"}
            </p>
            <span className="text-sm text-slate-500 font-semibold">kg</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100/50">
              <Heart className="w-5 h-5" />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Huyết áp mới nhất
            </p>
          </div>
          <div className="mt-auto flex items-baseline gap-1.5">
            <p className="text-4xl font-bold text-slate-900 tracking-tight">
              {records[0]
                ? `${records[0].systolic}/${records[0].diastolic}`
                : "--/--"}
            </p>
            <span className="text-sm font-semibold text-slate-500">mmHg</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center shrink-0 border border-primary-100/50">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Nhịp tim mới nhất
            </p>
          </div>
          <div className="mt-auto flex items-baseline gap-1.5">
            <p className="text-4xl font-bold text-slate-900 tracking-tight">
              {records[0] ? `${records[0].heart_rate}` : "--"}
            </p>
            <span className="text-sm text-slate-500 font-semibold">bpm</span>
          </div>
        </div>
      </motion.div>

      {/* History Table Card */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 md:p-6 flex flex-col flex-1"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Lịch sử ghi nhận
            </h3>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Tổng cộng {records.length} bản ghi sức khỏe
            </p>
          </div>
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              setEditingRecord(null);
              setIsModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nhập số liệu mới
          </Button>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-100/60 border-dashed">
            <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4 border border-primary-100/50">
              <Activity className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">
              Chưa có chỉ số nào được ghi lại
            </h4>
            <p className="text-slate-500 max-w-sm mx-auto mb-6 font-medium">
              Hãy bắt đầu theo dõi sức khỏe bằng cách ghi nhận bản ghi đầu tiên.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setEditingRecord(null);
                setIsModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Ghi nhận ngay
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile Card List View (Visible on < md screens) */}
            <div className="md:hidden space-y-4">
              {records.map((rec) => (
                <div
                  key={rec.id}
                  className="p-5 rounded-xl border border-slate-200/60 bg-white flex flex-col gap-4 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="font-bold text-slate-900 text-sm">
                      {new Date(rec.recorded_at).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(rec)}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-transparent hover:border-primary-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(rec.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/60">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                        Cân nặng
                      </p>
                      <p className="text-base font-bold text-slate-900">
                        {rec.weight} <span className="text-[10px] text-slate-500 font-semibold">kg</span>
                      </p>
                    </div>
                    <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100/50">
                      <p className="text-[10px] uppercase font-bold text-rose-400 mb-1 tracking-wider">
                        Huyết áp
                      </p>
                      <p className="text-base font-bold text-rose-600">
                        {rec.systolic}<span className="text-rose-300 text-xs mx-0.5">/</span>{rec.diastolic}
                      </p>
                    </div>
                    <div className="bg-primary-50/50 p-3 rounded-xl border border-primary-100/50">
                      <p className="text-[10px] uppercase font-bold text-primary-400 mb-1 tracking-wider">
                        Nhịp tim
                      </p>
                      <p className="text-base font-bold text-primary-600">
                        {rec.heart_rate} <span className="text-[10px] text-primary-400/80 font-semibold">bpm</span>
                      </p>
                    </div>
                  </div>
                  
                  {rec.notes && (
                    <p className="text-[13px] text-slate-600 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 font-medium">
                      <span className="font-bold text-slate-800">Ghi chú:</span> {rec.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop and Tablet Table View (Visible on md+ screens) */}
            <div className="hidden md:block overflow-x-auto border-t border-slate-100 -mx-6 md:mx-0 custom-scrollbar mt-4 pt-2">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                    <th className="pb-4 px-4 w-40">Thời gian</th>
                    <th className="pb-4 px-4 w-28">Cân nặng</th>
                    <th className="pb-4 px-4 w-32">Huyết áp</th>
                    <th className="pb-4 px-4 w-28">Nhịp tim</th>
                    <th className="pb-4 px-4">Ghi chú</th>
                    <th className="pb-4 px-4 text-right w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 text-sm">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {new Date(rec.recorded_at).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 text-base">{rec.weight}</span>
                        <span className="text-slate-400 text-xs ml-1 font-semibold">kg</span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-rose-600 text-base">{rec.systolic}</span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="font-bold text-rose-500 text-base">{rec.diastolic}</span>
                        <span className="text-slate-400 text-xs ml-1 font-semibold">mmHg</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-primary-600 text-base">{rec.heart_rate}</span>
                        <span className="text-slate-400 text-xs ml-1 font-semibold">bpm</span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-medium max-w-[250px] truncate">
                        {rec.notes ? (
                          <span>{rec.notes}</span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">--</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleEdit(rec)}
                            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(rec.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>

      {/* Record Modal */}
      <RecordMetricModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
        }}
        onSuccess={fetchRecords}
        initialData={editingRecord}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Xác nhận xóa bản ghi"
      >
        <p className="text-sm text-slate-600 mb-6 font-medium">
          Bạn có chắc chắn muốn xóa bản ghi chỉ số sức khỏe này khỏi lịch sử theo dõi? Hành động này không thể hoàn tác.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeletingId(null)}>
            Hủy bỏ
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            Xác nhận xóa
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
};
