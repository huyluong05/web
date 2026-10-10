import { DataStatus } from '../../components/common/DataStatus';
import React, { useState, useEffect } from "react";
import { deviceApi } from "../../api/client";
import {
  Watch,
  Activity,
  Heart,
  Scale,
  RefreshCw,
  Plus,
  Trash2,
  Wifi,
  Battery,
  Layers,
  Radio,
  X,
} from "lucide-react";
import { Button } from "../../components/common/Button";
import { motion, AnimatePresence } from "motion/react";

export const DevicesPage = () => {
  const [loadError, setLoadError] = useState('');

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [deviceToDisconnect, setDeviceToDisconnect] = useState(null);
  const [notification, setNotification] = useState(null);

  // New Device Form
const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceType, setNewDeviceType] = useState("blood_pressure_monitor");
  const [newDeviceModel, setNewDeviceModel] = useState("");
  const [newDeviceMac, setNewDeviceMac] = useState("");

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await deviceApi.getConnectedDevices();
      if (!res.success) { setLoadError(res.message); return; }
      setLoadError('');
      if (!Array.isArray(res.data)) { setLoadError('Invalid API response: expected an array.'); return; }
      if (res.success && res.data) {
        setDevices(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleSync = async (deviceId, name) => {
    try {
      setSyncingId(deviceId);
      const res = await deviceApi.syncDevice(deviceId);
      if (res.success) {
        setNotification({
          type: "success",
          text: `Đã đồng bộ dữ liệu sinh tồn từ "${name}" thành công!`,
        });
        fetchDevices();
      } else {
        setNotification({
          type: "error",
          text: res.message || "Lỗi khi đồng bộ thiết bị",
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        text: "Không thể kết nối với thiết bị",
      });
    } finally {
      setSyncingId(null);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleConfirmDisconnect = async () => {
    if (!deviceToDisconnect) return;
    const { id, name } = deviceToDisconnect;
    try {
      const res = await deviceApi.disconnectDevice(id);
      if (res.success) {
        setNotification({
          type: "success",
          text: `Đã gỡ thông tin thiết bị "${name}" khỏi tài khoản`,
        });
        fetchDevices();
      } else {
        setNotification({ type: 'error', text: res.message || 'Không thể gỡ thiết bị. Vui lòng thử lại.' });
      }
    } catch (err) {
      setNotification({ type: "error", text: "Lỗi khi ngắt kết nối thiết bị" });
    } finally {
      setDeviceToDisconnect(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handlePairSubmit = async (e) => {
    e.preventDefault();
    if (!newDeviceName.trim() || pairing) return;
    setPairing(true);
    try {
      const res = await deviceApi.pairDevice({
        name: newDeviceName.trim(),
        type: newDeviceType,
        model: newDeviceModel.trim() || undefined,
        macAddress: newDeviceMac.trim() || undefined,
      });
      if (res.success) {
        setNotification({
          type: "success",
          text: `Đã đăng ký thiết bị "${newDeviceName}". Chưa ghép nối Bluetooth.`,
        });
        setShowPairModal(false);
        setNewDeviceName("");
        setNewDeviceModel("");
        setNewDeviceMac("");
        fetchDevices();
      } else {
        setNotification({
          type: "error",
          text: res.message || "Đăng ký thông tin thiết bị thất bại",
        });
      }
    } catch (err) {
      setNotification({ type: "error", text: "Không thể lưu thông tin thiết bị" });
    } finally { setPairing(false); }
    setTimeout(() => setNotification(null), 4000);
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case "blood_pressure_monitor":
        return <Heart className="w-5 h-5 text-rose-500" />;
      case "smartwatch":
        return <Watch className="w-5 h-5 text-indigo-500" />;
      case "smart_scale":
        return <Scale className="w-5 h-5 text-blue-500" />;
      case "pulse_oximeter":
        return <Activity className="w-5 h-5 text-emerald-500" />;
      default:
        return <Radio className="w-5 h-5 text-slate-500" />;
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
      <DataStatus error={loadError} onRetry={fetchDevices} />
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-2 border border-blue-100">
            <Wifi className="w-3 h-3" />
            <span>Kết nối IoT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Thiết Bị Ngoại Vi
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5">
            Đăng ký thiết bị để quản lý. Ghép nối Bluetooth và đồng bộ số đo cần tích hợp riêng của nhà sản xuất.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowPairModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Đăng ký thiết bị
        </Button>
      </header>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-3 rounded-md border text-sm font-semibold flex items-center justify-between  ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            <span>{notification.text}</span>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-black/5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connected Devices Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8"
      >
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200 border-dashed flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-600" />
            <span className="font-semibold text-sm">Đang tải danh sách thiết bị...</span>
          </div>
        ) : devices.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200 border-dashed flex flex-col items-center justify-center">
            <Layers className="w-10 h-10 mx-auto mb-3 text-slate-500" />
            <span className="font-semibold text-sm">
              Chưa có thiết bị đăng ký. Nhấn <b className="text-slate-700">"Đăng ký thiết bị"</b> để thêm thông tin; bạn vẫn có thể ghi nhận số đo thủ công.
            </span>
          </div>
        ) : (
          devices.map((device) => {
            const isSyncing = syncingId === device.id;
            return (
              <motion.div
                variants={itemVariants}
                key={device.id}
                className="bg-white p-5 rounded-lg border border-slate-200  flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-10 h-10 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      {getDeviceIcon(device.type)}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {device.status === 'connected' ? 'Trạng thái đã lưu: kết nối' : device.status === 'disconnected' ? 'Đã ngắt' : 'Đã đăng ký — chờ dữ liệu'}
                      </span>
                      {device.batteryLevel != null && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          <Battery className="w-3 h-3 text-slate-500" />
                          {device.batteryLevel}%
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <h3
                    className="font-bold text-slate-900 text-base mb-1 truncate"
                    title={device.name}
                  >
                    {device.name}
                  </h3>
                  <p
                    className="text-xs text-slate-500 font-medium truncate mb-4"
                    title={device.model}
                  >
                    {device.model || "Unknown Model"}
                  </p>
                  
                  <div className="space-y-1.5 py-3 border-y border-slate-100 text-[11px] text-slate-500 font-medium">
                    <div className="flex justify-between items-center">
                      <span>Địa chỉ MAC:</span>
                      <span className="font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded">
                        {device.macAddress || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Đồng bộ cuối:</span>
                      <span className="text-slate-700">
                        {device.lastSyncTime
                          ? `${new Date(device.lastSyncTime).toLocaleTimeString("vi-VN")} - ${new Date(device.lastSyncTime).toLocaleDateString("vi-VN")}`
                          : "Chưa có"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 justify-center text-xs py-2"
                    onClick={() => handleSync(device.id, device.name)}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Đang lấy dữ liệu...</>
                    ) : (
                      <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Đồng bộ</>
                    )}
                  </Button>
                  <button
                    onClick={() =>
                      setDeviceToDisconnect({
                        id: device.id,
                        name: device.name,
                      })
                    }
                    className="p-2 rounded-md text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-colors"
                    title="Ngắt kết nối"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Disconnect Confirmation Modal */}
      <AnimatePresence>
        {deviceToDisconnect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg border border-slate-100"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Xác nhận ngắt kết nối
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                Bạn có chắc chắn muốn ngắt kết nối thiết bị{" "}
                <strong className="font-bold text-slate-900">
                  {deviceToDisconnect.name}
                </strong>
                ? Thao tác này gỡ thông tin đã lưu; kết nối phần cứng cần được quản lý trong ứng dụng của nhà sản xuất.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeviceToDisconnect(null)}>
                  Hủy
                </Button>
                <Button variant="danger" onClick={handleConfirmDisconnect}>
                  Ngắt kết nối
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pair Modal */}
      <AnimatePresence>
        {showPairModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <h3 className="text-lg font-bold text-slate-900">
                  Đăng ký thông tin thiết bị
                </h3>
                <button
                  onClick={() => setShowPairModal(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handlePairSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Tên thiết bị *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    placeholder="Ví dụ: Máy đo huyết áp Omron"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 text-sm font-semibold text-slate-800 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Loại thiết bị *
                  </label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 text-sm font-semibold text-slate-800 transition-colors cursor-pointer"
                  >
                    <option value="blood_pressure_monitor">Máy đo Huyết áp</option>
                    <option value="smartwatch">Đồng hồ Thông minh</option>
                    <option value="smart_scale">Cân điện tử</option>
                    <option value="pulse_oximeter">Máy đo SPO2</option>
                    <option value="glucose_meter">Máy đo đường huyết</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Dòng máy / Model (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={newDeviceModel}
                    onChange={(e) => setNewDeviceModel(e.target.value)}
                    placeholder="Ví dụ: HEM-7120"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 text-sm font-semibold text-slate-800 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Địa chỉ MAC (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={newDeviceMac}
                    pattern="([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}"
                    onChange={(e) => setNewDeviceMac(e.target.value)}
                    placeholder="Ví dụ: 00:1B:44:11:3A:B7"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 text-sm font-mono text-slate-800 transition-colors"
                  />
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <details className="text-xs text-slate-600"><summary className="cursor-pointer">Địa chỉ MAC là gì?</summary><p className="mt-2">MAC là mã nhận dạng mạng của thiết bị, gồm 6 cặp ký tự như AA:BB:CC:11:22:33. Tìm trên nhãn thiết bị, mục Thông tin/About trong ứng dụng nhà sản xuất hoặc sách hướng dẫn. Có thể bỏ trống; trình duyệt không luôn cung cấp MAC của Bluetooth.</p></details>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPairModal(false)}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" disabled={pairing}>
                    {pairing ? 'Đang lưu...' : 'Đăng ký thiết bị'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
