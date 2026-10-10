import { DataStatus } from '../../components/common/DataStatus';
import React, { useState, useEffect } from "react";
import { adminApi, databaseApi } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/common/Button";
import {
  Settings,
  Activity,
  Bot,
  Database,
  Save,
  Download,
  AlertTriangle,
  Heart,
  Lock,
  Server,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  Shield,
  Globe,
  FileCode2,
  Code2,
} from "lucide-react";
import { motion } from "motion/react";
export const AdminSettingsPage = () => {
  const [loadError, setLoadError] = useState('');

  const { success, error } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false); // Database Connection State
const [dbStatus, setDbStatus] = useState(null);
  const [checkingDb, setCheckingDb] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const checkDbStatus = async () => {
    try {
      setCheckingDb(true);
      const res = await databaseApi.getStatus();
      if (res.success && res.data) {
        setDbStatus(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingDb(false);
    }
  };
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSystemSettings();
      if (!res.success) { setLoadError(res.message); return; }
      setLoadError('');
      if (res.success && res.data) {
        setSettings(res.data);
      }
      await checkDbStatus();
    } catch (err) {
      console.error(err);
      error("Không thể tải cấu hình hệ thống");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchSettings();
  }, []);
  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const res = await adminApi.updateSystemSettings(settings);
      if (res.success && res.data) {
        setSettings(res.data);
        success("Đã lưu cấu hình và ngưỡng y tế hệ thống thành công!");
      } else {
        error(res.message || "Lỗi lưu cấu hình");
      }
    } catch (err) {
      error(err.message || "Lỗi lưu cấu hình");
    } finally {
      setSaving(false);
    }
  };
  const handleExportFullBackup = async () => {
    try {
      setExporting(true);
      const res = await adminApi.exportDatabaseSnapshot();
      if (res.success && res.data) {
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `vitaltrack_application_export_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        success("Đã xuất dữ liệu ứng dụng JSON. Bản này không thay thế backup MySQL có thể phục hồi đầy đủ.");
      } else {
        error(res.message || "Lỗi sao lưu");
      }
    } catch (err) {
      error(err.message || "Lỗi tải bản sao lưu");
    } finally {
      setExporting(false);
    }
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };
  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center py-20 bg-slate-50 rounded-md">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-500 mb-4" />
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Đang tải cấu hình hệ thống...
        </p>
      </div>
    );
  }
  if (!settings) return <DataStatus error={loadError || 'Chưa thể tải cấu hình hệ thống.'} onRetry={fetchSettings} />;
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col flex-1 pb-12"
    >
      <DataStatus error={loadError} onRetry={fetchSettings} />
      <p className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-900">Lưu cấu hình chưa tự kích hoạt email, chế độ bảo trì hay thay đổi mô hình AI. Các tích hợp này cần được xác nhận riêng trước khi sử dụng. Cảnh báo tham chiếu hiện dùng các ngưỡng AHA đã dẫn nguồn.</p>
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold uppercase tracking-wider mb-2">
            <Settings className="w-3.5 h-3.5" />
            <span>Cấu Hình Tham Số & Tiêu Chuẩn Y Tế Hệ Thống</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            System Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Điều chỉnh ngưỡng huyết áp, tiêu chuẩn cấp cứu, chính sách bảo mật và mô hình AI
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            isLoading={exporting}
            onClick={handleExportFullBackup}
          >
            Xuất dữ liệu ứng dụng
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Save className="w-4 h-4" />}
            isLoading={saving}
            onClick={handleSaveSettings}
          >
            Lưu Cấu Hình
          </Button>
        </div>
      </header>
      <div className="space-y-6">
        {/* Section 1: Clinical Thresholds */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-md border border-slate-200 p-5 sm:p-6"
        >
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-slate-100">
            <div className="w-10 h-10 rounded bg-slate-50 text-slate-700 flex items-center justify-center font-bold shrink-0 border border-slate-200">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                1. Ngưỡng Tiêu Chuẩn Y Tế & Cảnh Báo Lâm Sàng
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Áp dụng phân loại tự động và kích hoạt SOS cấp cứu cho mọi người dùng
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Huyết áp Tâm thu Cấp cứu
              </label>
              <input
                type="number"
                value={settings.emergency_systolic_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    emergency_systolic_threshold: Number(e.target.value),
                  })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 rounded px-3 py-2 text-sm font-semibold font-mono text-slate-900 focus:outline-none transition-colors"
              />
              <p className="text-[9px] font-semibold text-slate-500 mt-1.5">
                Mặc định: ≥ 180 mmHg
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Huyết áp Tâm trương Cấp cứu
              </label>
              <input
                type="number"
                value={settings.emergency_diastolic_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    emergency_diastolic_threshold: Number(e.target.value),
                  })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 rounded px-3 py-2 text-sm font-semibold font-mono text-slate-900 focus:outline-none transition-colors"
              />
              <p className="text-[9px] font-semibold text-slate-500 mt-1.5">
                Mặc định: ≥ 120 mmHg
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                Ngưỡng Tăng Huyết Áp Tâm thu
              </label>
              <input
                type="number"
                value={settings.warning_systolic_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    warning_systolic_threshold: Number(e.target.value),
                  })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 rounded px-3 py-2 text-sm font-semibold font-mono text-slate-900 focus:outline-none transition-colors"
              />
              <p className="text-[9px] font-semibold text-slate-500 mt-1.5">
                Mặc định: ≥ 130 mmHg
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                Ngưỡng Tăng Huyết Áp Tâm trương
              </label>
              <input
                type="number"
                value={settings.warning_diastolic_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    warning_diastolic_threshold: Number(e.target.value),
                  })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 rounded px-3 py-2 text-sm font-semibold font-mono text-slate-900 focus:outline-none transition-colors"
              />
              <p className="text-[9px] font-semibold text-slate-500 mt-1.5">
                Mặc định: ≥ 85 mmHg
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                <Heart className="w-3.5 h-3.5" /> Nhịp tim Nhanh (bpm)
              </label>
              <input
                type="number"
                value={settings.max_heart_rate_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_heart_rate_threshold: Number(e.target.value),
                  })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 rounded px-3 py-2 text-sm font-semibold font-mono text-slate-900 focus:outline-none transition-colors"
              />
              <p className="text-[9px] font-semibold text-slate-500 mt-1.5">
                Mặc định: &gt; 100 nhịp/phút
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                <Heart className="w-3.5 h-3.5" /> Nhịp tim Chậm (bpm)
              </label>
              <input
                type="number"
                value={settings.min_heart_rate_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    min_heart_rate_threshold: Number(e.target.value),
                  })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 rounded px-3 py-2 text-sm font-semibold font-mono text-slate-900 focus:outline-none transition-colors"
              />
              <p className="text-[9px] font-semibold text-slate-500 mt-1.5">
                Mặc định: &lt; 55 nhịp/phút
              </p>
            </div>
          </div>
        </motion.div>
        {/* Section 2: AI Model Diagnostics Settings */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-md border border-slate-200 p-5 sm:p-6"
        >
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-slate-100">
            <div className="w-10 h-10 rounded bg-slate-50 text-slate-700 flex items-center justify-center font-bold shrink-0 border border-slate-200">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                2. Cấu Hình Mô Hình Trí Tuệ Nhân Tạo (AI Diagnostic)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập thuật toán phân tích và mức độ nhạy y tế
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                  Mô hình AI chẩn đoán
                </label>
                <select
                  value={settings.ai_model_name}
                  onChange={(e) =>
                    setSettings({ ...settings, ai_model_name: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 rounded px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="gemini-2.5-flash">
                    Google Gemini 2.5 Flash
                  </option>
                  <option value="gemini-2.5-pro">
                    Google Gemini 2.5 Pro
                  </option>
                  <option value="vitaltrack-medical-custom-v1">
                    VitalTrack Medical Core v1
                  </option>
                </select>
              </div>
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                  Mức độ nhạy cảnh báo AI
                </label>
                <select
                  value={settings.ai_sensitivity_level}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ai_sensitivity_level: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 rounded px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="high">
                    Cao (Cảnh báo sớm mọi dao động)
                  </option>
                  <option value="balanced">
                    Cân bằng (Tiêu chuẩn AHA / ESC)
                  </option>
                  <option value="conservative">
                    Thận trọng (Chỉ cảnh báo rõ ràng)
                  </option>
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-md bg-slate-50 border border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Bắt buộc Bác sĩ kiểm duyệt ca Rủi ro Cao
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-1">
                  Tăng cường an toàn, tránh AI gửi kết quả sai lệch
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.require_physician_approval_for_high_risk}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      require_physician_approval_for_high_risk:
                        e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>
          </div>
        </motion.div>
        {/* Section 3: System Security & Access Controls */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-md border border-slate-200 p-5 sm:p-6"
        >
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-slate-100">
            <div className="w-10 h-10 rounded bg-slate-50 text-slate-700 flex items-center justify-center font-bold shrink-0 border border-slate-200">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                3. Chính Sách Bảo Mật & Quản Trị Hệ Thống
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quy định thời gian phiên, đăng ký mới và chế độ bảo trì
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                  Thời gian hết hạn phiên làm việc (Giờ)
                </label>
                <input
                  type="number"
                  value={settings.session_timeout_hours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      session_timeout_hours: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 rounded px-3 py-2 text-sm font-semibold font-mono text-slate-900 focus:outline-none transition-colors"
                />
              </div>
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                  Email Quản trị viên
                </label>
                <input
                  type="email"
                  value={settings.system_admin_email}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      system_admin_email: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 rounded px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-4 rounded-md bg-white border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Cho phép công khai Đăng ký Tài khoản Bệnh nhân mới
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-1">
                    Nếu tắt, chỉ Admin mới có thể tạo tài khoản
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.allow_patient_registration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        allow_patient_registration: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 rounded-md bg-white border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Gửi Cảnh báo Email tự động khi có SOS
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-1">
                    Thông báo cho người giám hộ trong Y bạ
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.enable_email_alerts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        enable_email_alerts: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 rounded-md bg-rose-50 border border-rose-200">
                <div>
                  <p className="text-sm font-semibold text-rose-900 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Chế độ Bảo trì Hệ thống
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 mt-1">
                    Tạm dừng truy cập người dùng thường để nâng cấp
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maintenance_mode: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>
            </div>
          </div>
        </motion.div>
        {/* Section 4: MySQL Database Status & Integration Management */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-md border border-slate-200 p-5 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-slate-50 text-slate-700 flex items-center justify-center font-bold shrink-0 border border-slate-200">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-slate-900">
                    4. Quản Trị Cơ Sở Dữ Liệu MySQL
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                    MySQL 8.0+
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trạng thái kết nối, cấu hình bảng dữ liệu y tế và script khởi tạo
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={
                <RefreshCw
                  className={`w-4 h-4 ${checkingDb ? "animate-spin" : ""}`}
                />
              }
              onClick={checkDbStatus}
              disabled={checkingDb}
            >
              Kiểm tra
            </Button>
          </div>
          <div className="space-y-5">
            {/* Status Card */}
            <div
              className={`p-4 rounded-md border flex flex-col md:flex-row md:items-center justify-between gap-4 ${dbStatus?.connected ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200"}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded flex items-center justify-center font-bold shrink-0 border ${dbStatus?.connected ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}
                >
                  {dbStatus?.connected ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Server className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-slate-900">
                      {dbStatus?.connected
                        ? "Đã kết nối thành công tới MySQL"
                        : "Chưa xác nhận kết nối MySQL"}
                    </h3>
                    <span
                      className={`w-2 h-2 rounded-full ${dbStatus?.connected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    {dbStatus?.connected
                      ? `Máy chủ MySQL đang hoạt động tại ${dbStatus.host}:${dbStatus.port} (Database: ${dbStatus.database}).`
                      : "Chưa thể truy vấn MySQL. Kiểm tra kết nối và schema; hệ thống không dùng dữ liệu mẫu thay cho dữ liệu thật."}
                  </p>
                </div>
              </div>
              {/* Badges */}
              <div className="flex flex-wrap gap-2 text-[10px] font-mono font-semibold shrink-0">
                <div className="px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-slate-500" />
                  Host: {dbStatus?.host || "localhost"}
                </div>
                <div className="px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-700 flex items-center gap-1.5">
                  Port: {dbStatus?.port || 3306}
                </div>
                <div className="px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-700 flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-slate-500" />
                  DB: {dbStatus?.database || "vitaltrack_db"}
                </div>
              </div>
            </div>
            {/* MySQL Tables Schema Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  name: "users",
                  desc: "Người dùng, Bác sĩ & Y bạ hồ sơ",
                  cols: "22 cột",
                },
                {
                  name: "health_records",
                  desc: "Chỉ số Huyết áp, Nhịp tim & Cân nặng",
                  cols: "11 cột",
                },
                {
                  name: "goals",
                  desc: "Mục tiêu sức khỏe & Tiến độ",
                  cols: "10 cột",
                },
                {
                  name: "reminders",
                  desc: "Lịch nhắc uống thuốc & Vận động",
                  cols: "7 cột",
                },
                {
                  name: "connected_devices",
                  desc: "Thiết bị ngoại vi Bluetooth",
                  cols: "10 cột",
                },
                {
                  name: "ai_diagnoses",
                  desc: "Báo cáo & Lịch sử chuẩn đoán AI",
                  cols: "11 cột",
                },
              ].map((tbl, i) => (
                <div
                  key={i}
                  className="p-3 rounded-md bg-slate-50 border border-slate-200 hover:bg-white transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-semibold text-xs text-slate-800 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                      {tbl.name}
                    </span>
                    <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider border border-slate-300">
                      {tbl.cols}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 pl-4">
                    {tbl.desc}
                  </p>
                </div>
              ))}
            </div>
            {/* SQL Script Guide */}
            <div className="p-4 rounded-md bg-slate-900 text-slate-200 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-slate-400 font-semibold text-xs flex items-center gap-1.5 mb-1">
                  <FileCode2 className="w-3.5 h-3.5 text-slate-500" /> File khởi tạo: /schema.sql
                </span>
                <p className="text-slate-500 text-[10px] font-sans">
                  Import cấu trúc bảng và dữ liệu mẫu vào MySQL
                </p>
              </div>
              <div className="flex items-center gap-3 bg-slate-950 p-2 rounded border border-slate-800">
                <pre className="text-[10px] text-slate-400 font-mono font-semibold px-2">
                  <span className="text-slate-600 select-none">$</span> mysql -u root -p vitaltrack_db &lt; schema.sql
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      "mysql -u root -p vitaltrack_db < schema.sql",
                    );
                    setCopiedSql(true);
                    success("Đã sao chép lệnh import SQL");
                    setTimeout(() => setCopiedSql(false), 2000);
                  }}
                  className="flex items-center justify-center w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                  title="Sao chép lệnh"
                >
                  {copiedSql ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        {/* Section 5: IoT / External Developer Hardware Ingestion Guide */}
        <motion.div
          variants={itemVariants}
          className="bg-slate-900 text-slate-100 p-5 sm:p-6 rounded-md border border-slate-800 "
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-bold shrink-0">
                <Code2 className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-white">
                    5. Cổng Nạp Dữ Liệu IoT (Hardware Ingest API)
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    Developer API
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dành cho vi điều khiển ESP32, Arduino hoặc Raspberry Pi
                </p>
              </div>
            </div>
          </div>
          <p className="text-sm font-medium text-slate-400 leading-relaxed mb-4">
            Gửi HTTP POST Request trực tiếp từ phần cứng để ghi nhận dữ liệu thực vào cơ sở dữ liệu VitalTrack:
          </p>
          <div className="p-4 rounded-md bg-black/40 border border-slate-800 font-mono text-[13px] text-slate-400 overflow-x-auto">
            <p className="text-slate-500 mb-1"># Gửi Request tới:</p>
            <p className="text-white font-bold mb-3">
              <span className="text-blue-500">POST</span> /api/devices/ingest
            </p>
            <p className="text-slate-500 mb-1"># Payload (JSON):</p>
            <pre className="text-emerald-500/90">
              {`{
  "userId": 1,
  "deviceId": "ESP32_PULSE_SENSOR_01",
  "systolic": 120,
  "diastolic": 80,
  "heart_rate": 75,
  "weight": 68.5,
  "notes": "Dữ liệu đo tự động từ cảm biến y tế IoT"
}`}{" "}
            </pre>
          </div>
        </motion.div>
      </div>{" "}
    </motion.div>
  );
};
