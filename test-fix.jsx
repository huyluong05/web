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
  Code2,
  Layers,
  Radio,
  X,
} from "lucide-react";
import { Button } from "../../components/common/Button";
import { motion, AnimatePresence } from "motion/react";
export const DevicesPage = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [showPairModal, setShowPairModal] = useState(false);
  const [deviceToDisconnect, setDeviceToDisconnect] = useState(null);
  const [notification, setNotification] = useState(null); // New Device Form
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceType, setNewDeviceType] = useState("blood_pressure_monitor");
  const [newDeviceModel, setNewDeviceModel] = useState("");
  const [newDeviceMac, setNewDeviceMac] = useState("");
  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await deviceApi.getConnectedDevices();
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
          text: `Đã đồng bộ dữ liệu sinh tồn từ"${name}" vào cơ sở dữ liệu thật thành công!`,
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
          text: `Đã ngắt kết nối thiết bị"${name}"`,
        });
        fetchDevices();
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
    if (!newDeviceName.trim()) return;
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
          text: `Đã ghép nối thiết bị"${newDeviceName}" thành công!`,
        });
        setShowPairModal(false);
        setNewDeviceName("");
        setNewDeviceModel("");
        setNewDeviceMac("");
        fetchDevices();
      } else {
        setNotification({
          type: "error",
          text: res.message || "Ghép nối thất bại",
        });
      }
    } catch (err) {
      setNotification({ type: "error", text: "Không thể ghép nối thiết bị" });
    }
    setTimeout(() => setNotification(null), 4000);
  };
  const getDeviceIcon = (type) => {
    switch (type) {
      case "blood_pressure_monitor":
        return <Heart className="w-6 h-6 text-rose-500" />;
      case "smartwatch":
        return <Watch className="w-6 h-6 text-primary-600" />;
      case "smart_scale":
        return <Scale className="w-6 h-6 text-primary-600" />;
      case "pulse_oximeter":
        return <Activity className="w-6 h-6 text-sky-500" />;
      default:
        return <Radio className="w-6 h-6 text-orange-500" />;
    }
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col flex-1 pb-12"
    >
      {" "}
      {/* Header */}{" "}
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {" "}
        <div>
          {" "}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-950 text-primary-400 text-xs font-bold uppercase tracking-widest mb-3 shadow-sm border border-primary-800/50">
            {" "}
            <Wifi className="w-3.5 h-3.5" />{" "}
            <span>Thiết bị Ngoại vi & Dữ liệu Thực (Hardware IoT)</span>{" "}
          </div>{" "}
          <h1 className="text-3xl sm:text-4xl font-light text-slate-900 tracking-tight">
            {" "}
            Kết Nối{" "}
            <span className="font-bold tracking-tighter text-primary-700">
              Thiết Bị Ngoại Vi
            </span>{" "}
          </h1>{" "}
          <p className="text-sm text-slate-500 font-medium mt-2">
            {" "}
            Đồng bộ dữ liệu sinh trắc học thời gian thực từ đồng hồ thông minh,
            máy đo huyết áp và cảm biến y tế{" "}
          </p>{" "}
        </div>{" "}
        <Button
          variant="primary"
          size="lg"
          onClick={() => setShowPairModal(true)}
          icon={Plus}
          className="w-full sm:w-auto justify-center shadow-md shadow-primary-700/20"
        >
          {" "}
          Ghép nối thiết bị mới{" "}
        </Button>{" "}
      </header>{" "}
      {/* Notification Toast */}{" "}
      <AnimatePresence>
        {" "}
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-2xl border text-sm font-bold flex items-center justify-between shadow-sm ${notification.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}
          >
            {" "}
            <span>{notification.text}</span>{" "}
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              {" "}
              <X className="w-4 h-4" />{" "}
            </button>{" "}
          </motion.div>
        )}{" "}
      </AnimatePresence>{" "}
      {/* Connected Devices Grid */}{" "}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10"
      >
        {" "}
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            {" "}
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-primary-600" />{" "}
            <span className="font-bold">
              Đang quét danh sách thiết bị kết nối...
            </span>{" "}
          </div>
        ) : devices.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            {" "}
            <Layers className="w-10 h-10 mx-auto mb-3 text-slate-300" />{" "}
            <span className="font-medium">
              Chưa có thiết bị ngoại vi nào được ghép nối. Nhấn{" "}
              <b className="text-slate-600">"Ghép nối thiết bị mới"</b> để bắt
              đầu.
            </span>{" "}
          </div>
        ) : (
          devices.map((device) => {
            const isSyncing = syncingId === device.id;
            return (
              <motion.div
                variants={itemVariants}
                key={device.id}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-sm hover:border-slate-300/80 transition-all relative overflow-hidden group"
              >
                {" "}
                {/* Top header */}{" "}
                <div>
                  {" "}
                  <div className="flex items-start justify-between gap-4 mb-5">
                    {" "}
                    <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 border border-primary-100 flex items-center justify-center font-bold shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                      {" "}
                      {getDeviceIcon(device.type)}{" "}
                    </div>{" "}
                    <div className="flex flex-col items-end gap-1.5">
                      {" "}
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary-800 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200/60 shadow-sm">
                        {" "}
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />{" "}
                        Đã kết nối{" "}
                      </span>{" "}
                      {device.batteryLevel !== undefined && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                          {" "}
                          <Battery className="w-3.5 h-3.5 text-primary-600" />{" "}
                          {device.batteryLevel}%{" "}
                        </span>
                      )}{" "}
                    </div>{" "}
                  </div>{" "}
                  <h3
                    className="font-bold text-slate-900 text-lg mb-1 tracking-tight truncate"
                    title={device.name}
                  >
                    {device.name}
                  </h3>{" "}
                  <p
                    className="text-xs text-slate-500 font-medium font-mono mb-5 truncate"
                    title={device.model}
                  >
                    {device.model}
                  </p>{" "}
                  <div className="space-y-2 py-4 border-y border-slate-100 text-xs text-slate-500 font-medium">
                    {" "}
                    <div className="flex justify-between items-center">
                      {" "}
                      <span>Địa chỉ MAC:</span>{" "}
                      <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {device.macAddress || "N/A"}
                      </span>{" "}
                    </div>{" "}
                    <div className="flex justify-between items-center">
                      {" "}
                      <span>Đồng bộ lần cuối:</span>{" "}
                      <span className="text-slate-700">
                        {" "}
                        {device.lastSyncTime
                          ? `${new Date(device.lastSyncTime).toLocaleTimeString("vi-VN")} - ${new Date(device.lastSyncTime).toLocaleDateString("vi-VN")}`
                          : "Chưa có"}{" "}
                      </span>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
                {/* Bottom Actions */}{" "}
                <div className="pt-5 flex items-center gap-3">
                  {" "}
                  <Button
                    variant="secondary"
                    size="md"
                    className="flex-1 justify-center shadow-sm"
                    onClick={() => handleSync(device.id, device.name)}
                    disabled={isSyncing}
                    isLoading={isSyncing}
                    icon={RefreshCw}
                  >
                    {" "}
                    {isSyncing
                      ? "Đang nhận dữ liệu..."
                      : "Đồng bộ dữ liệu"}{" "}
                  </Button>{" "}
                  <button
                    onClick={() =>
                      setDeviceToDisconnect({
                        id: device.id,
                        name: device.name,
                      })
                    }
                    className="p-3 rounded-xl text-rose-500 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 border border-rose-100 transition-colors active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
                    title="Ngắt kết nối"
                    aria-label="Ngắt kết nối thiết bị"
                  >
                    {" "}
                    <Trash2 className="w-5 h-5" />{" "}
                  </button>{" "}
                </div>{" "}
              </motion.div>
            );
          })
        )}{" "}
      </motion.div>{" "}
      {/* IoT / External Developer Hardware Ingestion Guide */}{" "}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900 text-slate-100 p-6 sm:p-8 rounded-xl border border-slate-800 shadow-md overflow-hidden relative"
      >
        {" "}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>{" "}
        <div className="flex items-center gap-4 mb-5 relative z-10">
          {" "}
          <div className="w-12 h-12 rounded-2xl bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold shrink-0 border border-primary-500/30">
            {" "}
            <Code2 className="w-6 h-6" />{" "}
          </div>{" "}
          <div>
            {" "}
            <h3 className="font-bold text-lg text-white">
              Cổng nạp dữ liệu trực tiếp từ Phần cứng IoT (Hardware Ingest API)
            </h3>{" "}
            <p className="text-xs font-medium text-slate-400 mt-1">
              {" "}
              Dành cho lập trình viên khi lập trình vi điều khiển ESP32,
              Arduino, Raspberry Pi hoặc ứng dụng BLE ngoại vi{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <p className="text-sm font-medium text-slate-300 leading-relaxed mb-4 relative z-10">
          {" "}
          Bạn có thể lập trình thiết bị phần cứng của mình gửi HTTP POST Request
          thẳng vào hệ thống VitalTrack để ghi nhận dữ liệu thực vào cơ sở dữ
          liệu:{" "}
        </p>{" "}
        <div className="p-5 rounded-2xl bg-black/40 border border-white/10 font-mono text-sm text-primary-400 overflow-x-auto relative z-10 shadow-inner">
          {" "}
          <p className="text-slate-500 font-bold mb-1">
            # HTTP Request gửi từ thiết bị ngoại vi:
          </p>{" "}
          <p className="text-white font-bold mb-3">
            <span className="text-emerald-400">POST</span> /api/devices/ingest
          </p>{" "}
          <p className="text-slate-500 font-bold mb-1">
            # Request Body (JSON):
          </p>{" "}
          <pre className="text-orange-300">
            {`{"userId": 1,"deviceId":"ESP32_PULSE_SENSOR_01","systolic": 120,"diastolic": 80,"heart_rate": 75,"weight": 68.5,"notes":"Dữ liệu đo tự động từ cảm biến y tế IoT"
}`}{" "}
          </pre>{" "}
        </div>{" "}
      </motion.div>{" "}
      {/* Disconnect Confirmation Modal */}{" "}
      <AnimatePresence>
        {" "}
        {deviceToDisconnect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            {" "}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-8 max-w-sm w-full shadow-lg border border-slate-100 space-y-5"
            >
              {" "}
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Xác nhận ngắt kết nối
              </h3>{" "}
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                {" "}
                Bạn có chắc chắn muốn ngắt kết nối thiết bị{" "}
                <strong className="text-slate-900 font-bold">
                  "{deviceToDisconnect.name}"
                </strong>{" "}
                không? Thiết bị này sẽ ngừng đồng bộ dữ liệu vào hệ thống.{" "}
              </p>{" "}
              <div className="flex items-center justify-end gap-3 pt-4">
                {" "}
                <Button
                  variant="ghost"
                  size="md"
                  type="button"
                  onClick={() => setDeviceToDisconnect(null)}
                >
                  {" "}
                  Hủy bỏ{" "}
                </Button>{" "}
                <Button
                  variant="danger"
                  size="md"
                  type="button"
                  onClick={handleConfirmDisconnect}
                >
                  {" "}
                  Ngắt kết nối{" "}
                </Button>{" "}
              </div>{" "}
            </motion.div>{" "}
          </motion.div>
        )}{" "}
      </AnimatePresence>{" "}
      {/* Pair Modal */}{" "}
      <AnimatePresence>
        {" "}
        {showPairModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            {" "}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-xl p-6 sm:p-8 max-w-md w-full shadow-lg border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {" "}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                {" "}
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Ghép nối Thiết bị Ngoại vi
                </h3>{" "}
                <button
                  onClick={() => setShowPairModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {" "}
                  <X className="w-5 h-5" />{" "}
                </button>{" "}
              </div>{" "}
              <form onSubmit={handlePairSubmit} className="space-y-5">
                {" "}
                <div>
                  {" "}
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                    Tên thiết bị *
                  </label>{" "}
                  <input
                    type="text"
                    required
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    placeholder="Ví dụ: Máy đo huyết áp Omron cá nhân"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-bold text-slate-800 transition-all"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                    Loại thiết bị *
                  </label>{" "}
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-bold text-slate-800 transition-all cursor-pointer"
                  >
                    {" "}
                    <option value="blood_pressure_monitor">
                      Máy đo huyết áp (Blood Pressure Cuff)
                    </option>{" "}
                    <option value="smartwatch">
                      Đồng hồ thông minh / Vòng tay sinh trắc (Smartwatch)
                    </option>{" "}
                    <option value="smart_scale">
                      Cân điện tử thông minh (Smart Body Scale)
                    </option>{" "}
                    <option value="pulse_oximeter">
                      Cảm biến nồng độ oxy SpO2 (Pulse Oximeter)
                    </option>{" "}
                    <option value="glucose_meter">
                      Máy đo đường huyết (Glucose Meter)
                    </option>{" "}
                  </select>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                    Model / Nhà sản xuất
                  </label>{" "}
                  <input
                    type="text"
                    value={newDeviceModel}
                    onChange={(e) => setNewDeviceModel(e.target.value)}
                    placeholder="Ví dụ: Omron HEM-7142 Bluetooth"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-medium text-slate-800 transition-all"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                    Địa chỉ Bluetooth MAC (Tùy chọn)
                  </label>{" "}
                  <input
                    type="text"
                    value={newDeviceMac}
                    onChange={(e) => setNewDeviceMac(e.target.value)}
                    placeholder="Ví dụ: AA:BB:CC:11:22:33"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-mono font-medium text-slate-800 transition-all"
                  />{" "}
                </div>{" "}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  {" "}
                  <Button
                    variant="ghost"
                    size="lg"
                    type="button"
                    onClick={() => setShowPairModal(false)}
                  >
                    {" "}
                    Hủy bỏ{" "}
                  </Button>{" "}
                  <Button variant="primary" size="lg" type="submit">
                    {" "}
                    Xác nhận Ghép nối{" "}
                  </Button>{" "}
                </div>{" "}
              </form>{" "}
            </motion.div>{" "}
          </motion.div>
        )}{" "}
      </AnimatePresence>{" "}
    </motion.div>
  );
};
