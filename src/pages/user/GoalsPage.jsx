import React, { useState, useEffect } from "react";
import { UserHeader } from "../../components/layout/UserHeader";
import { Button } from "../../components/common/Button";
import { GoalModal } from "../../components/forms/GoalModal";
import { Modal } from "../../components/common/Modal";
import { Input } from "../../components/common/Input";
import { goalsApi } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import {
  Target,
  Plus,
  CheckCircle2,
  Trash2,
  Edit3,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";

export const GoalsPage = () => {
  const { success, error } = useToast();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [progressModalGoal, setProgressModalGoal] = useState(null);
  const [newCurrentValue, setNewCurrentValue] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await goalsApi.getAll();
      if (res.success && res.data) {
        setGoals(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleOpenProgressUpdate = (goal) => {
    setProgressModalGoal(goal);
    setNewCurrentValue(String(goal.current_value));
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!progressModalGoal) return;
    try {
      const val = parseFloat(newCurrentValue);
      const res = await goalsApi.update(progressModalGoal.id, {
        current_value: val,
      });
      if (res.success && res.data) {
        success("Cập nhật tiến độ thành công!");
        setGoals((prev) =>
          prev.map((g) => (g.id === progressModalGoal.id ? res.data : g)),
        );
        setProgressModalGoal(null);
      } else {
        error(res.message || "Không thể cập nhật tiến độ");
      }
    } catch (err) {
      error(err.message || "Lỗi khi cập nhật tiến độ");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      const res = await goalsApi.delete(deletingId);
      if (res.success) {
        success("Đã xóa mục tiêu thành công.");
        setGoals((prev) => prev.filter((g) => g.id !== deletingId));
      } else {
        error(res.message || "Không thể xóa mục tiêu");
      }
    } catch (err) {
      error(err.message || "Lỗi khi xóa mục tiêu");
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
      className="flex flex-col flex-1 pb-8"
    >
      <UserHeader
        title="Sức khỏe"
        italicTitle="Mục tiêu"
        subtitle="Thiết lập mục tiêu và theo dõi phần trăm hoàn thành theo thời gian"
        onRecordClick={() => {
          setEditingGoal(null);
          setIsCreateModalOpen(true);
        }}
        actionText="Tạo mục tiêu mới"
      />

      {goals.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="bg-slate-50/50 rounded-2xl border border-slate-200/60 border-dashed p-12 text-center my-auto mx-4 sm:mx-0 flex flex-col items-center"
        >
          <div className="w-16 h-16 bg-primary-50 text-primary-600 border border-primary-100/50 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
            <Target className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
            Chưa có mục tiêu nào
          </h3>
          <p className="text-base text-slate-500 max-w-sm mx-auto mb-8 font-medium">
            Thiết lập mục tiêu cân nặng hoặc huyết áp để giữ vững động lực rèn luyện sức khỏe.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingGoal(null);
              setIsCreateModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Tạo mục tiêu
          </Button>
        </motion.div>
      ) : (
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {goals.map((goal) => {
            const isCompleted =
              goal.status === "completed" ||
              (goal.progress_percentage || 0) >= 100;
              
            return (
              <motion.div
                key={goal.id}
                variants={itemVariants}
                className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100/50 mb-2.5 inline-block">
                        {goal.metric_type === "weight"
                          ? "Cân nặng"
                          : goal.metric_type === "blood_pressure"
                            ? "Huyết áp"
                            : goal.metric_type === "heart_rate"
                              ? "Nhịp tim"
                              : "Vận động"}
                      </span>
                      <h4 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                        {goal.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenProgressUpdate(goal)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-transparent hover:border-primary-100"
                        title="Cập nhật tiến độ"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingGoal(goal);
                          setIsCreateModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                        title="Chỉnh sửa"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(goal.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                        title="Xóa mục tiêu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 3 Metric Points */}
                  <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50/80 rounded-xl mb-6 text-center border border-slate-100/60">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                        Khởi đầu
                      </p>
                      <p className="text-base font-bold text-slate-700 truncate">
                        {goal.start_value}{" "}
                        <span className="text-[10px] font-semibold text-slate-500">
                          {goal.unit}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                        Hiện tại
                      </p>
                      <p className="text-base font-bold text-primary-600 truncate">
                        {goal.current_value}{" "}
                        <span className="text-[10px] font-semibold text-primary-600">
                          {goal.unit}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                        Mục tiêu
                      </p>
                      <p className="text-base font-bold text-slate-900 truncate">
                        {goal.target_value}{" "}
                        <span className="text-[10px] font-semibold text-slate-500">
                          {goal.unit}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar & Percentage */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-400 uppercase tracking-wider">
                        Tiến độ đạt được
                      </span>
                      <span
                        className={`font-bold ${isCompleted ? "text-emerald-600" : "text-primary-600"}`}
                      >
                        {goal.progress_percentage || 0}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(100, goal.progress_percentage || 0)}%`,
                        }}
                        className={`h-full rounded-full transition-all duration-500 ease-out relative ${isCompleted ? "bg-emerald-500" : "bg-primary-600"}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-100/60 flex items-center justify-between gap-3">
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-2.5 py-1.5 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                      Hoàn thành
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                      Đang thực hiện
                    </span>
                  )}
                  <Button
                    variant="outline"
                    className="text-xs py-2 px-3.5"
                    onClick={() => handleOpenProgressUpdate(goal)}
                  >
                    Cập nhật tiến độ
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Goal Modal */}
      <GoalModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingGoal(null);
        }}
        onSuccess={fetchGoals}
        initialData={editingGoal}
      />

      {/* Quick Progress Update Modal */}
      <Modal
        isOpen={!!progressModalGoal}
        onClose={() => setProgressModalGoal(null)}
        title="Cập nhật tiến độ"
      >
        {progressModalGoal && (
          <form onSubmit={handleSaveProgress} className="space-y-5">
            <p className="text-sm text-slate-600 font-medium">
              Mục tiêu: <strong className="font-bold text-slate-900">{progressModalGoal.title}</strong>
            </p>
            <Input
              label={`Giá trị hiện tại (${progressModalGoal.unit})`}
              type="number"
              step="0.1"
              required
              value={newCurrentValue}
              onChange={(e) => setNewCurrentValue(e.target.value)}
              placeholder="Nhập giá trị mới nhất"
            />
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100/80">
              <Button
                variant="outline"
                type="button"
                onClick={() => setProgressModalGoal(null)}
              >
                Hủy
              </Button>
              <Button variant="primary" type="submit">
                Lưu tiến độ
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Xác nhận xóa"
      >
        <p className="text-sm text-slate-600 mb-6 font-medium">
          Bạn có chắc chắn muốn xóa mục tiêu này khỏi danh sách theo dõi? Hành động này không thể hoàn tác.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeletingId(null)}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            Xác nhận xóa
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
};
