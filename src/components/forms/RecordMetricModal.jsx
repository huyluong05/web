import React, { useState, useEffect } from "react";
import { localDateTime } from '../../utils/health';
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
    initialData?.weight != null ? String(initialData.weight) : "",
  );
  const [systolic, setSystolic] = useState(
    initialData?.systolic != null ? String(initialData.systolic) : "",
  );
  const [diastolic, setDiastolic] = useState(
    initialData?.diastolic != null ? String(initialData.diastolic) : "",
  );
  const [heartRate, setHeartRate] = useState(
    initialData?.heart_rate != null ? String(initialData.heart_rate) : "",
  );
  const [recordedAt, setRecordedAt] = useState(
    initialData?.recorded_at
      ? localDateTime(initialData.recorded_at)
      : localDateTime(),
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [partialRecords, setPartialRecords] = useState(false);
  const [capabilityError, setCapabilityError] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    setWeight(initialData?.weight != null ? String(initialData.weight) : '');
    setSystolic(initialData?.systolic != null ? String(initialData.systolic) : '');
    setDiastolic(initialData?.diastolic != null ? String(initialData.diastolic) : '');
    setHeartRate(initialData?.heart_rate != null ? String(initialData.heart_rate) : '');
    setRecordedAt(localDateTime(initialData?.recorded_at ?? new Date()));
    setNotes(initialData?.notes ?? '');
    let active = true;
    healthApi.getLatest().then(res => {
      if (!active) return;
      setPartialRecords(!!res.data?.capabilities?.partial_records);
      setCapabilityError(res.success ? '' : res.message);
    });
    return () => { active = false; };
  }, [isOpen, initialData]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        weight: weight === '' ? null : Number(weight),
        systolic: systolic === '' ? null : Number(systolic),
        diastolic: diastolic === '' ? null : Number(diastolic),
        heart_rate: heartRate === '' ? null : Number(heartRate),
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
        <p className="text-sm text-slate-600">Nhập số đo thực tế từ thiết bị. {partialRecords ? 'Có thể bỏ trống chỉ số chưa đo.' : 'Cấu hình dữ liệu hiện tại yêu cầu đủ cân nặng, huyết áp và nhịp tim.'}</p>
        {capabilityError && <p role="alert" className="text-sm text-rose-700">{capabilityError}</p>}
        {" "}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {" "}
          <Input
            label="Cân nặng (kg)"
            type="number"
            step="0.1"
            min="10"
            max="400"
            required={!partialRecords}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="ví dụ: 68.5"
            helperText="Đơn vị: kilogram"
          />{" "}
          <Input
            label="Nhịp tim (bpm)"
            type="number"
            min="30"
            max="240"
            required={!partialRecords}
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
            min="50"
            max="260"
            required={!partialRecords}
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
            placeholder="ví dụ: 118"
            helperText="Chỉ số trên (bình thường < 120)"
          />{" "}
          <Input
            label="Huyết áp tâm trương (Diastolic mmHg)"
            type="number"
            min="30"
            max="180"
            required={!partialRecords}
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
            maxLength={10000}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ví dụ: Đo sau khi tập thể dục buổi sáng..."
            className="w-full bg-white border border-slate-200 text-slate-800 placeholder:text-slate-500 text-sm rounded-lg py-2.5 px-3.5 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200"
          />{" "}
          <p className="text-xs text-slate-500">Ghi bối cảnh để so sánh các lần đo. Ghi chú không phải kết luận y khoa.</p>
          <div className="flex flex-wrap gap-2">
            {['Đo vào buổi sáng', 'Đo sau khi tập thể dục', 'Đo sau bữa ăn', 'Vừa sử dụng thuốc theo chỉ định', 'Cảm thấy mệt hoặc chóng mặt', 'Đo lại để kiểm tra'].map(text => <button key={text} type="button" className="px-2 py-1 rounded border border-slate-200 text-xs text-slate-700 hover:bg-slate-50" onClick={() => setNotes(old => old ? `${old}; ${text}` : text)}>{text}</button>)}
          </div>
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
