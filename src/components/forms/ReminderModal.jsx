import React, { useState, useEffect } from "react";
import { REMINDER_TYPES, jsonArray } from '../../utils/reminders';
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { remindersApi } from "../../api/client";
import { useToast } from "../../context/ToastContext";
export const ReminderModal = ({ isOpen, onClose, onSuccess, initialData }) => {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState(initialData?.type || "water");
  const [title, setTitle] = useState(
    initialData?.title ||
      (type === "water" ? "Uống 500ml nước" : "Đi bộ thư giãn 30 phút"),
  );
  const [timeOfDay, setTimeOfDay] = useState(
    initialData?.time_of_day || "08:00",
  );
  const [scheduling, setScheduling] = useState(false), [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone), [repeatDays, setRepeatDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  useEffect(() => {
    if (!isOpen) return;
    setType(initialData?.type ?? 'water'); setTitle(initialData?.title ?? 'Uống nước'); setTimeOfDay(String(initialData?.time_of_day ?? '08:00').slice(0, 5));
    setTimezone(initialData?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone); setRepeatDays(jsonArray(initialData?.repeat_days, [0, 1, 2, 3, 4, 5, 6]));
    let active = true;
    remindersApi.getAll().then(res => { if (active) setScheduling(!!res.capabilities?.scheduling); });
    return () => { active = false; };
  }, [isOpen, initialData]);
  const handleTypeChange = (newType) => {
    setType(newType);
    if (!initialData) {
      setTitle(REMINDER_TYPES[newType]);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData?.id) {
        const res = await remindersApi.update(initialData.id, {
          type,
          title,
          time_of_day: timeOfDay,
          ...(scheduling ? { timezone, repeat_days: repeatDays } : {}),
        });
        if (res.success && res.data) {
          success("Cập nhật nhắc nhở thành công!");
          onSuccess(res.data);
          onClose();
        } else {
          error(res.message || "Không thể cập nhật");
        }
      } else {
        const res = await remindersApi.create({
          type,
          title,
          time_of_day: timeOfDay,
          ...(scheduling ? { timezone, repeat_days: repeatDays } : {}),
        });
        if (res.success && res.data) {
          success("Tạo nhắc nhở thành công!");
          onSuccess(res.data);
          onClose();
        } else {
          error(res.message || "Không thể tạo");
        }
      }
    } catch (err) {
      error(err.message || "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Chỉnh sửa nhắc nhở" : "Tạo nhắc nhở mới"}
      subtitle="Thiết lập lịch uống nước, vận động, đo chỉ số hoặc dùng thuốc theo chỉ định"
    >
      {" "}
      <form onSubmit={handleSubmit} className="space-y-4">
        {" "}
        <div className="flex flex-col gap-1.5">
          {" "}
          <label className="block text-xs sm:text-sm font-semibold text-slate-700">
            {" "}
            Loại nhắc nhở{" "}
          </label>{" "}
          <div className="grid grid-cols-2 gap-3">
            {['measurement', 'medication'].map(kind => <button type="button" key={kind} className={`p-3 rounded-lg border text-sm ${type === kind ? 'bg-primary-50 border-primary-500' : 'border-slate-200'}`} onClick={() => handleTypeChange(kind)}>{REMINDER_TYPES[kind]}</button>)}
            {" "}
            <button
              type="button"
              onClick={() => handleTypeChange("water")}
              className={`p-3 min-h-[46px] rounded-lg flex items-center justify-center gap-2 border font-semibold text-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${type === "water" ? "bg-sky-50 text-sky-800 border-sky-400 shadow-xs" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            >
              {" "}
              <span>💧 Uống nước</span>{" "}
            </button>{" "}
            <button
              type="button"
              onClick={() => handleTypeChange("exercise")}
              className={`p-3 min-h-[46px] rounded-lg flex items-center justify-center gap-2 border font-semibold text-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${type === "exercise" ? "bg-indigo-50 text-indigo-800 border-indigo-400 shadow-xs" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            >
              {" "}
              <span>🏃 Tập thể dục</span>{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
        <Input
          label="Nội dung nhắc nhở"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            type === "water"
              ? "Ví dụ: Uống 500ml nước ấm..."
              : "Ví dụ: Đi bộ 30 phút..."
          }
        />{" "}
        <Input
          label="Thời gian nhắc (Giờ : Phút)"
          type="time"
          required
          value={timeOfDay}
          onChange={(e) => setTimeOfDay(e.target.value)}
        />{" "}
        {scheduling ? <>
          <Input label="Múi giờ (ví dụ Asia/Ho_Chi_Minh)" value={timezone} onChange={e => setTimezone(e.target.value)} required />
          <fieldset className="space-y-2"><legend className="text-sm font-semibold">Lặp vào các ngày</legend><div className="flex flex-wrap gap-2">{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((label, day) => <label key={day} className="text-sm p-2 border rounded"><input type="checkbox" checked={repeatDays.includes(day)} onChange={e => setRepeatDays(old => e.target.checked ? [...old, day] : old.filter(d => d !== day))} /> {label}</label>)}</div></fieldset>
        </> : <p className="text-xs text-slate-600">Lịch hàng ngày theo giờ trình duyệt ({timezone}). Tùy chọn múi giờ, ngày lặp và lưu hoàn thành sẽ bật sau khi quản trị viên áp dụng migration đã phê duyệt.</p>}
        <p className="text-xs text-slate-500">Lời nhắc chỉ hiển thị khi website đang mở. Nhắc thuốc dùng nội dung do bạn nhập theo chỉ định đã có.</p>
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
          {" "}
          <Button variant="ghost" size="md" type="button" onClick={onClose}>
            {" "}
            Hủy{" "}
          </Button>{" "}
          <Button variant="primary" size="md" type="submit" isLoading={loading}>
            {" "}
            {initialData ? "Lưu cập nhật" : "Tạo nhắc nhở"}{" "}
          </Button>{" "}
        </div>{" "}
      </form>{" "}
    </Modal>
  );
};
