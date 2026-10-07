import React, { useState } from "react";
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
  const handleTypeChange = (newType) => {
    setType(newType);
    if (!initialData) {
      setTitle(newType === "water" ? "Uống 500ml nước" : "Tập thể dục 30 phút");
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
      subtitle="Thiết lập lịch nhắc nhở uống nước hoặc tập thể dục hàng ngày"
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
