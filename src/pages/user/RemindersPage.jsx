import React, { useState, useEffect } from "react";
import { UserHeader } from "../../components/layout/UserHeader";
import { Button } from "../../components/common/Button";
import { ReminderModal } from "../../components/forms/ReminderModal";
import { Modal } from "../../components/common/Modal";
import { remindersApi } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Droplets, Activity, Edit2, Trash2, Check, Clock } from "lucide-react";
import { motion } from "motion/react";
import { useDataSync } from '../../hooks/useDataSync';
import { DataStatus } from '../../components/common/DataStatus';
import { ReminderOccurrence } from '../../components/common/ReminderOccurrence';
import { REMINDER_TYPES } from '../../utils/reminders';
import { useAuth } from '../../context/AuthContext';

export const RemindersPage = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const { success, error } = useToast();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [scheduling, setScheduling] = useState(false), [loadError, setLoadError] = useState(''), [tick, setTick] = useState(0);
  useEffect(() => { const timer = setInterval(() => setTick(t => t + 1), 30000); return () => clearInterval(timer); }, []);
  const complete = async (rem, completed) => { const res = await remindersApi.update(rem.id, { complete: completed, occurrence_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }); if (res.success) { setReminders(old => old.map(r => r.id === rem.id ? res.data : r)); success(completed ? 'Đã hoàn thành lịch hôm nay.' : 'Đã bỏ trạng thái hoàn thành.'); } else error(res.message); };

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await remindersApi.getAll();
      setLoadError(res.success ? '' : res.message);
      if (res.success) setScheduling(!!res.capabilities?.scheduling);
      if (res.success && res.data) {
        setReminders(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);
  useDataSync(fetchReminders, ['reminders'], true);

  const handleToggleActive = async (rem) => {
    const newStatus = !rem.is_active;
    try {
      const res = await remindersApi.update(rem.id, { is_active: newStatus });
      if (res.success && res.data) {
        setReminders((prev) =>
          prev.map((r) => (r.id === rem.id ? res.data : r)),
        );
        success(newStatus ? "Đã bật nhắc nhở" : "Đã tạm tắt nhắc nhở");
      } else {
        error(res.message || "Không thể cập nhật trạng thái");
      }
    } catch (err) {
      error(err.message || "Lỗi cập nhật trạng thái");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      const res = await remindersApi.delete(deletingId);
      if (res.success) {
        success("Đã xóa nhắc nhở thành công.");
        setReminders((prev) => prev.filter((r) => r.id !== deletingId));
      } else {
        error(res.message || "Không thể xóa");
      }
    } catch (err) {
      error(err.message || "Lỗi khi xóa nhắc nhở");
    } finally {
      setDeletingId(null);
    }
  };

  const waterReminders = reminders.filter((r) => r.type === "water");
  const exerciseReminders = reminders.filter((r) => r.type === "exercise");

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
        title="Lịch trình"
        italicTitle="Nhắc nhở"
        subtitle="Lịch uống nước, vận động, ghi nhận chỉ số và thuốc theo chỉ định"
        onRecordClick={() => {
          setEditingReminder(null);
          setIsModalOpen(true);
        }}
        actionText="Thêm nhắc nhở mới"
      />

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Section 1: Uống nước */}
        <motion.div
          variants={itemVariants}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-6 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 border border-sky-100/50 flex items-center justify-center shadow-sm">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-0.5">
                  Nhắc nhở Uống nước
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  Duy trì đủ 2 lít nước mỗi ngày
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100">
              {waterReminders.filter((r) => r.is_active).length}/{waterReminders.length} Đang bật
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {waterReminders.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center font-medium bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                Chưa có lịch nhắc uống nước nào.
              </p>
            ) : (
              waterReminders.map((rem) => (
                <div
                  key={rem.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${
                    rem.is_active 
                      ? "bg-white border-slate-200 shadow-sm hover:border-sky-200" 
                      : "bg-slate-50/50 border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(rem)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
                        rem.is_active 
                          ? "border-sky-500 bg-sky-500 text-white shadow-sm shadow-sky-500/20" 
                          : "border-slate-300 bg-white text-transparent"
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>
                    <div className="min-w-0">
                      <p
                        className={`text-base font-bold truncate transition-colors ${
                          rem.is_active ? "text-slate-900" : "text-slate-400 line-through decoration-slate-300"
                        }`}
                      >
                        {rem.title}
                      </p>
                      <p
                        className={`text-xs font-bold flex items-center gap-1.5 mt-1 transition-colors ${
                          rem.is_active ? "text-sky-600" : "text-slate-400"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" /> {rem.time_of_day}
                      </p>
                      <ReminderOccurrence reminder={rem} onComplete={complete} scheduling={scheduling} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 transition-opacity ml-2">
                    <button
                      onClick={() => {
                        setEditingReminder(rem);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors border border-transparent hover:border-sky-100"
                      title="Sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(rem.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Section 2: Tập thể dục */}
        <motion.div
          variants={itemVariants}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-6 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 border border-primary-100/50 flex items-center justify-center shadow-sm">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-0.5">
                  Nhắc nhở Tập thể dục
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  Duy trì thể lực và vận động
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100">
              {exerciseReminders.filter((r) => r.is_active).length}/{exerciseReminders.length} Đang bật
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {exerciseReminders.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center font-medium bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                Chưa có lịch nhắc tập thể dục nào.
              </p>
            ) : (
              exerciseReminders.map((rem) => (
                <div
                  key={rem.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${
                    rem.is_active 
                      ? "bg-white border-slate-200 shadow-sm hover:border-primary-200" 
                      : "bg-slate-50/50 border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(rem)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
                        rem.is_active 
                          ? "border-primary-600 bg-primary-600 text-white shadow-sm shadow-primary-600/20" 
                          : "border-slate-300 bg-white text-transparent"
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>
                    <div className="min-w-0">
                      <p
                        className={`text-base font-bold truncate transition-colors ${
                          rem.is_active ? "text-slate-900" : "text-slate-400 line-through decoration-slate-300"
                        }`}
                      >
                        {rem.title}
                      </p>
                      <p
                        className={`text-xs font-bold flex items-center gap-1.5 mt-1 transition-colors ${
                          rem.is_active ? "text-primary-600" : "text-slate-400"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" /> {rem.time_of_day}
                      </p>
                      <ReminderOccurrence reminder={rem} onComplete={complete} scheduling={scheduling} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 transition-opacity ml-2">
                    <button
                      onClick={() => {
                        setEditingReminder(rem);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-transparent hover:border-primary-100"
                      title="Sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(rem.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>

      <DataStatus loading={loading} error={loadError} onRetry={fetchReminders} />
      {['measurement', 'medication'].map(type => <section key={type} className="bg-white border border-slate-200 rounded-2xl p-5 mt-4"><h2 className="font-bold mb-3">{REMINDER_TYPES[type]}</h2>{reminders.filter(r => r.type === type).length === 0 ? <p className="text-sm text-slate-500">Chưa có lịch. Chọn Thêm nhắc nhở mới để thiết lập.</p> : reminders.filter(r => r.type === type).map(rem => <div key={rem.id} className="py-3 border-t border-slate-100"><p className="font-semibold break-words">{rem.title} · {String(rem.time_of_day).slice(0, 5)}</p><ReminderOccurrence reminder={rem} onComplete={complete} scheduling={scheduling} /><div className="flex flex-wrap gap-4 text-sm mt-2"><button onClick={() => handleToggleActive(rem)}>{rem.is_active ? 'Tắt lịch' : 'Bật lịch'}</button><button onClick={() => { setEditingReminder(rem); setIsModalOpen(true); }}>Chỉnh sửa</button><button className="text-rose-700" onClick={() => setDeletingId(rem.id)}>Xóa</button></div></div>)}</section>)}
      <details className="mt-4 p-3 border rounded-xl text-sm"><summary className="cursor-pointer">Tùy chọn lời nhắc sau đăng nhập</summary><p className="mt-2">Lựa chọn được lưu riêng cho tài khoản trên trình duyệt này.</p><button className="mt-2 text-primary-700 underline" onClick={() => { try { localStorage.removeItem(`vitaltrack_measure_prompt_${userId}`); sessionStorage.removeItem(`vitaltrack_measure_prompt_${userId}_seen`); success('Đã bật lại lời nhắc; áp dụng khi bạn mở lại trang.'); } catch { error('Trình duyệt không cho lưu tùy chọn.'); } }}>Bật lại lời nhắc ghi nhận chỉ số</button></details>
      {/* Reminder Modal */}
      <ReminderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingReminder(null);
        }}
        onSuccess={fetchReminders}
        initialData={editingReminder}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Xác nhận xóa"
      >
        <p className="text-sm text-slate-600 mb-6 font-medium">
          Bạn có chắc chắn muốn xóa lời nhắc nhở này? Hành động này không thể hoàn tác.
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
