import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { healthApi } from "../../api/client";
import { useToast } from "../../context/ToastContext";
export const RecordMetricModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [weight, setWeight] = useState(
    initialData?.weight ? String(initialData.weight) : "68.5",
  );
  const [systolic, setSystolic] = useState(
    initialData?.systolic ? String(initialData.systolic) : "118",
  );
  const [diastolic, setDiastolic] = useState(
    initialData?.diastolic ? String(initialData.diastolic) : "76",
  );
  const [heartRate, setHeartRate] = useState(
    initialData?.heart_rate ? String(initialData.heart_rate) : "74",
  );
  const [recordedAt, setRecordedAt] = useState(
    initialData?.recorded_at
      ? new Date(initialData.recorded_at).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        weight: parseFloat(weight),
        systolic: parseInt(systolic, 10),
        diastolic: parseInt(diastolic, 10),
        heart_rate: parseInt(heartRate, 10),
        recorded_at: new Date(recordedAt).toISOString(),
        notes,
      };
      if (initialData?.id) {
        const res = await healthApi.update(initialData.id, payload);
        if (res.success && res.data) {
          success("Cập nhật chỉ số sức khỏe thành công!");
          onSuccess(res.data);
          onClose();
        } else {
          error(res.message || "Không thể cập nhật chỉ số");
        }
      } else {
        const res = await healthApi.create(payload);
        if (res.success && res.data) {
          success("Ghi nhận chỉ số sức khỏe thành công!");
          onSuccess(res.data);
          onClose();
        } else {
          error(res.message || "Không thể lưu chỉ số");
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
      title={
        initialData ? "Chỉnh sửa chỉ số sức khỏe" : "Ghi nhận chỉ số sức khỏe"
      }
      subtitle="Nhập 3 chỉ số theo dõi: Cân nặng, Huyết áp và Nhịp tim"
    >
      {" "}
      <form onSubmit={handleSubmit} className="space-y-4">
        {" "}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {" "}
          <Input
            label="Cân nặng (kg)"
            type="number"
            step="0.1"
            min="20"
            max="300"
            required
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="ví dụ: 68.5"
            helperText="Đơn vị: kilogram"
          />{" "}
          <Input
            label="Nhịp tim (bpm)"
            type="number"
            min="40"
            max="220"
            required
            value={heartRate}
            onChange={(e) => setHeartRate(e.target.value)}
            placeholder="ví dụ: 74"
            helperText="Nhịp tim khi nghỉ ngơi"
          />{" "}
        </div>{" "}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {" "}
          <Input
            label="Huyết áp tâm thu (Systolic mmHg)"
            type="number"
            min="60"
            max="250"
            required
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
            placeholder="ví dụ: 118"
            helperText="Chỉ số trên (bình thường < 120)"
          />{" "}
          <Input
            label="Huyết áp tâm trương (Diastolic mmHg)"
            type="number"
            min="40"
            max="150"
            required
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
            placeholder="ví dụ: 76"
            helperText="Chỉ số dưới (bình thường < 80)"
          />{" "}
        </div>{" "}
        <Input
          label="Thời gian ghi nhận"
          type="datetime-local"
          required
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
        />{" "}
        <div className="flex flex-col gap-1.5">
          {" "}
          <label className="block text-xs sm:text-sm font-semibold text-slate-700">
            {" "}
            Ghi chú thêm (Tùy chọn){" "}
          </label>{" "}
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ví dụ: Đo sau khi tập thể dục buổi sáng..."
            className="w-full bg-white border border-slate-200 text-slate-800 placeholder:text-slate-500 text-sm rounded-lg py-2.5 px-3.5 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200"
          />{" "}
        </div>{" "}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
          {" "}
          <Button variant="ghost" size="md" type="button" onClick={onClose}>
            {" "}
            Hủy bỏ{" "}
          </Button>{" "}
          <Button variant="primary" size="md" type="submit" isLoading={loading}>
            {" "}
            {initialData ? "Lưu thay đổi" : "Lưu chỉ số"}{" "}
          </Button>{" "}
        </div>{" "}
      </form>{" "}
    </Modal>
  );
};
