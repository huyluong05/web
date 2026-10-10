import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { goalsApi, healthApi } from "../../api/client";
import { DataStatus } from '../common/DataStatus';
import { Link } from 'react-router-dom';
import { displayTime, isStale } from '../../utils/health';
import { useToast } from "../../context/ToastContext";
export const GoalModal = ({ isOpen, onClose, onSuccess, initialData }) => {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(initialData?.title || "");
  const [metricType, setMetricType] = useState(
    initialData?.metric_type || "weight",
  );
  const [startValue, setStartValue] = useState(
    initialData?.start_value != null ? String(initialData.start_value) : "",
  );
  const [targetValue, setTargetValue] = useState(
    initialData?.target_value != null ? String(initialData.target_value) : "",
  );
  const [currentValue, setCurrentValue] = useState(
    initialData?.current_value != null ? String(initialData.current_value) : "",
  );
  const [unit, setUnit] = useState(initialData?.unit || "kg");
  const [snapshot, setSnapshot] = useState(null), [fetching, setFetching] = useState(false), [loadError, setLoadError] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialData?.title ?? ''); setMetricType(initialData?.metric_type ?? 'weight');
    setStartValue(initialData?.start_value != null ? String(initialData.start_value) : '');
    setTargetValue(initialData?.target_value != null ? String(initialData.target_value) : '');
    setCurrentValue(initialData?.current_value != null ? String(initialData.current_value) : '');
    setUnit(initialData?.unit ?? 'kg');
    let active = true;
    setFetching(true); setLoadError('');
    healthApi.getLatest().then(res => { if (!active) return; if (res.success) setSnapshot(res.data); else setLoadError(res.message); setFetching(false); });
    return () => { active = false; };
  }, [isOpen, initialData]);
  useEffect(() => {
    if (initialData) return;
    const value = snapshot?.current?.[metricType === 'blood_pressure' ? 'systolic' : metricType]?.value ?? snapshot?.current?.[metricType]?.value;
    setStartValue(value != null ? String(value) : ''); setCurrentValue(value != null ? String(value) : '');
  }, [snapshot, metricType, initialData]);
  const handleMetricTypeChange = (type) => {
    setMetricType(type);
    if (type === "weight") setUnit("kg");
    else if (type === "blood_pressure") setUnit("mmHg");
    else if (type === "heart_rate") setUnit("bpm");
    else if (type === "exercise") setUnit("phút");
  };
  const referenceMetric = snapshot?.current?.[metricType === 'blood_pressure' ? 'systolic' : metricType] ?? snapshot?.current?.[metricType];
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData?.id) {
        const res = await goalsApi.update(initialData.id, {
          title,
          ...(metricType === 'exercise' ? { current_value: Number(currentValue) } : {}),
          target_value: parseFloat(targetValue),
        });
        if (res.success && res.data) {
          success("Cập nhật mục tiêu thành công!");
          onSuccess(res.data);
          onClose();
        } else {
          error(res.message || "Không thể cập nhật mục tiêu");
        }
      } else {
        const res = await goalsApi.create({
          title,
          metric_type: metricType,
          start_value: parseFloat(startValue),
          target_value: parseFloat(targetValue),
          ...(metricType === 'exercise' ? { current_value: Number(currentValue) } : {}),
          unit,
        });
        if (res.success && res.data) {
          success("Tạo mục tiêu sức khỏe thành công!");
          onSuccess(res.data);
          onClose();
        } else {
          error(res.message || "Không thể tạo mục tiêu");
        }
      }
    } catch (err) {
      error(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        initialData ? "Cập nhật mục tiêu sức khỏe" : "Tạo mục tiêu sức khỏe mới"
      }
      subtitle="Thiết lập chỉ số mục tiêu để theo dõi tiến độ hoàn thành"
    >
      {" "}
      <form onSubmit={handleSubmit} className="space-y-4">
        <DataStatus loading={fetching} error={loadError} />
        {!initialData && metricType !== 'exercise' && !fetching && !referenceMetric && <p className="text-sm text-amber-800">Chưa có số đo cho chỉ số này. <Link className="underline" to="/health?record=1">Ghi nhận trước khi tạo mục tiêu</Link>.</p>}
        {referenceMetric && <p className="text-xs text-slate-600">Số đo tham chiếu: {displayTime(referenceMetric.recorded_at)}. {isStale(referenceMetric.recorded_at) && 'Số đo đã cũ; nên đo lại trước khi đặt mục tiêu.'} Mốc bắt đầu có thể kiểm tra và điều chỉnh trước khi lưu. Huyết áp sử dụng tâm thu.</p>}
        {" "}
        <Input
          label="Tên mục tiêu"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Giảm cân đón hè, Duy trì huyết áp chuẩn..."
        />{" "}
        {!initialData && (
          <div className="flex flex-col gap-1.5">
            {" "}
            <label className="block text-xs sm:text-sm font-semibold text-slate-700">
              {" "}
              Loại chỉ số mục tiêu{" "}
            </label>{" "}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {" "}
              {[
                { label: "Cân nặng", value: "weight" },
                { label: "Huyết áp", value: "blood_pressure" },
                { label: "Nhịp tim", value: "heart_rate" },
                { label: "Vận động", value: "exercise" },
              ].map((item) => (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => handleMetricTypeChange(item.value)}
                  className={`py-2 px-3 min-h-[38px] rounded-lg text-xs font-semibold border transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${metricType === item.value ? "bg-blue-50 text-blue-800 border-blue-500 shadow-xs" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                >
                  {" "}
                  {item.label}{" "}
                </button>
              ))}{" "}
            </div>{" "}
          </div>
        )}{" "}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {" "}
          <Input
            label={`Bắt đầu (${unit})`}
            type="number"
            step="0.1"
            required
            disabled={!!initialData}
            value={startValue}
            onChange={(e) => setStartValue(e.target.value)}
          />{" "}
          <Input
            label={`Hiện tại (${unit})`}
            type="number"
            step="0.1"
            required
            value={currentValue}
            readOnly={metricType !== 'exercise'}
            helperText={metricType !== 'exercise' ? 'Tự đồng bộ từ số đo mới nhất; cập nhật tại Chỉ số sinh tồn.' : 'Nhập thời lượng vận động thực tế.'}
            onChange={(e) => setCurrentValue(e.target.value)}
          />{" "}
          <Input
            label={`Mục tiêu (${unit})`}
            type="number"
            step="0.1"
            required
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          />{" "}
        </div>{" "}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
          {" "}
          <Button variant="ghost" size="md" type="button" onClick={onClose}>
            {" "}
            Hủy{" "}
          </Button>{" "}
          <Button variant="primary" size="md" type="submit" isLoading={loading} disabled={fetching || !!loadError || (!initialData && metricType !== 'exercise' && !referenceMetric)}>
            {" "}
            {initialData ? "Lưu cập nhật" : "Tạo mục tiêu"}{" "}
          </Button>{" "}
        </div>{" "}
      </form>{" "}
    </Modal>
  );
};
