import React, { useState, useEffect } from "react";
import { adminApi } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import {
  Cpu,
  Search,
  Plus,
  Battery,
  Wifi,
  Trash2,
  Clock,
  Radio,
  Smartphone,
  Watch,
  Activity,
  Zap,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
export const AdminDevicesPage = () => {
  const { success, error } = useToast();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); // Add Device Modal
const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    userId: 1,
    name: "Omron Complete HEM-7600T",
    type: "blood_pressure",
    model: "HEM-7600T Smart BLE",
    macAddress: "F0:B5:D1:44:88:AA",
    firmwareVersion: "v2.4.1",
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAllDevices();
      if (res.success && res.data) {
        setDevices(res.data);
      }
    } catch (err) {
      console.error(err);
      error("Không thể tải danh sách thiết bị y tế IoT");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchDevices();
  }, []);
  const handleAddDevice = async () => {
    try {
      const res = await adminApi.addDeviceForUser(newDevice);
      if (res.success) {
        success("Đã cấp phát và liên kết thiết bị IoT thành công!");
        setIsAddModalOpen(false);
        fetchDevices();
      } else {
        error(res.message || "Lỗi thêm thiết bị");
      }
    } catch (err) {
      error(err.message || "Lỗi thêm thiết bị");
    }
  };
  const handleDeleteDevice = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await adminApi.removeDevice(deleteConfirmId);
      if (res.success) {
        success("Đã gỡ bỏ thiết bị khỏi hệ thống.");
        setDevices((prev) => prev.filter((d) => d.id !== deleteConfirmId));
      } else {
        error(res.message || "Lỗi gỡ bỏ thiết bị");
      }
    } catch (err) {
      error(err.message || "Lỗi gỡ bỏ thiết bị");
    } finally {
      setDeleteConfirmId(null);
    }
  };
  const filteredDevices = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.model?.toLowerCase().includes(search.toLowerCase()) ||
      d.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      d.macAddress?.toLowerCase().includes(search.toLowerCase()),
  );
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col flex-1 pb-12"
    >
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold uppercase tracking-wider mb-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>Trung Tâm Thiết Bị & IoT Gateway</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Medical Devices & Sensors
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý máy đo huyết áp Bluetooth, đồng hồ thông minh, trạm cảm biến SpO2 toàn hệ thống
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Cấp Phát Thiết Bị Mới
        </Button>
      </header>

      {/* IoT Gateway API Info Banner */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900 text-white p-4 rounded-md mb-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Cổng Nạp Dữ Liệu Ingest API Tự Động
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Hệ thống hỗ trợ nạp dữ liệu trực tiếp từ Gateway / Thiết bị BLE qua endpoint:
            <code className="ml-2 px-1.5 py-0.5 bg-black/50 text-cyan-300 rounded font-mono text-[10px] border border-slate-700">
              POST /api/devices/ingest
            </code>
          </p>
        </div>
        <div className="text-[10px] text-slate-500 bg-black/40 px-3 py-2 rounded border border-slate-700/80 font-mono shrink-0 relative z-10">
          Header: Authorization: Bearer &lt;JWT_TOKEN&gt;
        </div>
      </motion.div>

      {/* Search & Stats */}
      <motion.div
        variants={itemVariants}
        className="bg-white p-3 rounded-md border border-slate-200 mb-6 flex flex-col md:flex-row items-center gap-4 justify-between"
      >
        <div className="w-full md:w-96">
          <Input
            placeholder="Tìm theo tên thiết bị, model, MAC, bệnh nhân..."
            leftIcon={<Search className="w-4 h-4 text-slate-500" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100 shrink-0">
          Tổng cộng: <span className="font-bold text-slate-900">{devices.length}</span> thiết bị đang kết nối
        </div>
      </motion.div>{" "}
      {/* Devices Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center bg-white rounded-md border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-500 mb-3" />
          <span className="text-sm font-medium">Đang tải danh sách thiết bị y tế...</span>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="bg-white rounded-md border border-slate-200 p-12 text-center py-20 flex flex-col items-center">
          <Cpu className="w-12 h-12 text-slate-400 mb-3" />
          <p className="text-sm font-medium text-slate-600">
            Không tìm thấy thiết bị IoT nào.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Nhấn "Cấp Phát Thiết Bị Mới" để liên kết máy đo với bệnh nhân.
          </p>
        </div>
      ) : (
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence>
            {filteredDevices.map((dev) => {
              const isBp = dev.type === "blood_pressure";
              const isScale = dev.type === "smart_scale";
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  key={dev.id}
                  className="bg-white rounded-md border border-slate-200 p-4 hover:border-slate-300 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div
                          className={`w-9 h-9 rounded flex items-center justify-center shrink-0 border ${isBp ? "bg-rose-50 text-rose-600 border-rose-200" : isScale ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}
                        >
                          {isBp ? (
                            <Activity className="w-4 h-4" />
                          ) : isScale ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Watch className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className="font-semibold text-slate-900 text-sm truncate pr-2"
                            title={dev.name}
                          >
                            {dev.name}
                          </h3>
                          <p
                            className="text-[10px] text-slate-500 font-mono truncate"
                            title={dev.model}
                          >
                            {dev.model || "Standard IoT Node"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase shrink-0 ${dev.status === "connected" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-500 border border-slate-200"}`}
                      >
                        <Radio
                          className={`w-2.5 h-2.5 ${dev.status === "connected" ? "animate-pulse text-emerald-500" : ""}`}
                        />
                        {dev.status === "connected" ? "Online" : "Offline"}
                      </span>
                    </div>
                    {/* Owner Patient */}
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200 mb-3 space-y-1 group-hover:bg-slate-100 transition-colors">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                        Chủ sở hữu / Bệnh nhân
                      </p>
                      <p
                        className="text-xs font-semibold text-slate-800 truncate"
                        title={dev.user_name || `User #${dev.user_id}`}
                      >
                        {dev.user_name || `User #${dev.user_id}`}
                      </p>
                      <p
                        className="text-[10px] text-slate-500 truncate"
                        title={dev.user_email}
                      >
                        {dev.user_email}
                      </p>
                    </div>
                    {/* Device Specs */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 mb-4">
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded">
                        <Battery
                          className={`w-3.5 h-3.5 shrink-0 ${dev.batteryLevel > 20 ? "text-emerald-500" : "text-rose-500 animate-pulse"}`}
                        />
                        <span className="truncate">
                          Pin: <strong className="text-slate-800 font-mono">{dev.batteryLevel}%</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded font-mono">
                        <Wifi className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate" title={dev.macAddress}>
                          {dev.macAddress || "F0:B5:D1:--"}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded">
                        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        Đ/bộ cuối:
                        <span className="font-mono font-medium text-slate-700 truncate ml-auto">
                          {new Date(dev.lastSyncTime).toLocaleDateString("vi-VN")} {new Date(dev.lastSyncTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[9px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      FW: {dev.firmwareVersion || "v1.0.0"}
                    </span>
                    <button
                      onClick={() => setDeleteConfirmId(dev.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Gỡ bỏ thiết bị"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}{" "}
      {/* Add Device Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Cấp Phát Thiết Bị Y Tế Mới"
        subtitle="Liên kết máy đo sinh tồn IoT hoặc Smartwatch cho người dùng"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              ID Người dùng / Bệnh nhân sở hữu
            </label>
            <input
              type="number"
              value={newDevice.userId}
              onChange={(e) =>
                setNewDevice({ ...newDevice, userId: Number(e.target.value) })
              }
              className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Tên thiết bị hiển thị
            </label>
            <input
              type="text"
              value={newDevice.name}
              onChange={(e) =>
                setNewDevice({ ...newDevice, name: e.target.value })
              }
              className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
              placeholder="VD: Máy đo huyết áp Omron Bắp tay"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Loại thiết bị
              </label>
              <select
                value={newDevice.type}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, type: e.target.value })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm cursor-pointer transition-all"
              >
                <option value="blood_pressure">Máy đo huyết áp</option>
                <option value="smart_scale">Cân điện tử sinh trắc</option>
                <option value="smartwatch">Đồng hồ thông minh</option>
                <option value="spo2_sensor">Cảm biến SpO2</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Model / Mã sản phẩm
              </label>
              <input
                type="text"
                value={newDevice.model}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, model: e.target.value })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Địa chỉ MAC Bluetooth
              </label>
              <input
                type="text"
                value={newDevice.macAddress}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, macAddress: e.target.value })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm font-mono transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Phiên bản Firmware
              </label>
              <input
                type="text"
                value={newDevice.firmwareVersion}
                onChange={(e) =>
                  setNewDevice({
                    ...newDevice,
                    firmwareVersion: e.target.value,
                  })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm font-mono transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Hủy Bỏ
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddDevice}>
              Lưu & Cấp Phát
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Xác nhận gỡ bỏ thiết bị IoT"
        maxWidth="sm"
      >
        <div className="space-y-5">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex gap-3">
            <Trash2 className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-900 leading-relaxed">
              Bạn có chắc chắn muốn ngắt kết nối thiết bị này khỏi hệ thống quản trị? Người dùng sẽ không thể tiếp tục nhận dữ liệu tự động từ thiết bị này.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
              Hủy bỏ
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteDevice}>
              Gỡ Bỏ Thiết Bị
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
