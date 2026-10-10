import { DataStatus } from '../../components/common/DataStatus';
import React, { useState, useEffect } from "react";
import { adminApi } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import {
  Search,
  Shield,
  Lock,
  Unlock,
  Plus,
  Eye,
  EyeOff,
  Edit,
  KeyRound,
  Trash2,
  FileText,
  Activity,
  Target,
  Bot,
  Cpu,
  Phone,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Download,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  Share2,
  Server,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
export const AdminUsersPage = () => {
  const [loadError, setLoadError] = useState('');

  const { success, error } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); // Dossier Modal
const [dossierUserId, setDossierUserId] = useState(null);
  const [dossierData, setDossierData] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [dossierError, setDossierError] = useState('');
  const [dossierTab, setDossierTab] = useState("profile"); // Create User Modal
const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(true);
  const [copiedField, setCopiedField] = useState(null); // Newly Created User Handover Credentials Modal
const [createdCredentials, setCreatedCredentials] = useState(null);
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$!';
    return Array.from(crypto.getRandomValues(new Uint8Array(18)), n => chars[n % chars.length]).join('');
  };
  const copyToClipboard = async (text, fieldKey) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      success("Đã sao chép vào bộ nhớ tạm!");
      setTimeout(() => setCopiedField(null), 3000);
    } catch (err) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopiedField(fieldKey);
        success("Đã sao chép vào bộ nhớ tạm!");
        setTimeout(() => setCopiedField(null), 3000);
      } catch (fallbackErr) {
        error("Không thể tự động sao chép. Vui lòng bôi đen và bấm Ctrl+C.");
      }
    }
  };
  const handleDownloadHandoverSlip = (creds) => {
    const loginUrl = window.location.origin + "/login";
    const content = `=====================================================
PHIẾU BÀN GIAO THÔNG TIN TÀI KHOẢN - VITALTRACK
=====================================================
Kính gửi người dùng: ${creds.full_name}
Hệ thống giám sát y tế & sức khỏe từ xa VitalTrack xin gửi
thông tin đăng nhập vào hệ thống: - Họ và tên: ${creds.full_name}
- Email đăng nhập: ${creds.email}
- Mật khẩu khởi tạo: ${creds.password}
- Vai trò: ${creds.role === "admin" ? "Quản trị viên / Bác sĩ" : "Bệnh nhân / Người dùng"}
- Số điện thoại: ${creds.phone_number || "Chưa cập nhật"}
- Thời gian tạo: ${creds.created_at || new Date().toLocaleString("vi-VN")}
- Cổng đăng nhập: ${loginUrl} LƯU Ý BẢO MẬT:
1. Vui lòng đăng nhập và chủ động đổi mật khẩu cá nhân ở lần đầu tiên.
2. Tuyệt đối không chia sẻ mật khẩu này cho người không có thẩm quyền.
=====================================================`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `VitalTrack_BanGiao_${creds.email.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    success("Đã tải phiếu bàn giao tài khoản (.txt) thành công!");
  };
  const getHandoverSummaryText = (creds) => {
    const loginUrl = window.location.origin + "/login";
    return `[VitalTrack] Thông tin tài khoản mới:\n- Họ tên: ${creds.full_name}\n- Email: ${creds.email}\n- Mật khẩu: ${creds.password}\n- Đăng nhập tại: ${loginUrl}`;
  };
  const getZaloSmsMessage = (creds) => {
    const loginUrl = window.location.origin + "/login";
    return `Xin chào ${creds.full_name}, tài khoản theo dõi sức khỏe VitalTrack của bạn đã sẵn sàng.\n⬢ Đăng nhập tại: ${loginUrl}\n⬢ Tên đăng nhập / Email: ${creds.email}\n⬢ Mật khẩu khởi tạo: ${creds.password}\n(Vui lòng đăng nhập và đổi mật khẩu để bảo mật thông tin y tế).`;
  };
  const [createForm, setCreateForm] = useState({
    full_name: "",
    email: "",
    password: generateRandomPassword(),
    role: "user",
    phone_number: "",
    gender: "other",
    date_of_birth: "",
    blood_type: "unknown",
    height_cm: null,
    base_weight_kg: null,
    activity_level: "moderate",
    chronic_conditions: [],
    allergies: [],
    current_medications: "",
    emergency_contact_name: "",
    emergency_contact_relationship: "",
    emergency_contact_phone: "",
  }); // Edit User Modal
const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({}); // Reset Password Modal
const [resetPassUser, setResetPassUser] = useState(null);
  const [tempPasswordGenerated, setTempPasswordGenerated] = useState(null); // Delete User Modal
const [deleteConfirmUser, setDeleteConfirmUser] = useState(null); // Lock/Unlock Modal
const [statusConfirmUser, setStatusConfirmUser] = useState(null);
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers(search);
      if (!res.success) { setLoadError(res.message); return; }
      setLoadError('');
      if (!Array.isArray(res.data)) { setLoadError('Invalid API response: expected an array.'); return; }
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
      error("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUsers();
  }, [search]);
  const handleOpenDossier = async (userId) => {
    setDossierData(null); setDossierError('');
    setDossierUserId(userId);
    setDossierTab("profile");
    try {
      setLoadingDossier(true);
      const res = await adminApi.getUserDossier(userId);
      if (res.success && res.data) {
        if (!res.data.user || !res.data.stats || !['health_records', 'aiHistory', 'goals', 'devices'].every(key => Array.isArray(res.data[key]))) { setDossierError('Dữ liệu hồ sơ từ máy chủ chưa đầy đủ. Vui lòng thử lại.'); return; }
        setDossierData(res.data);
      } else {
        setDossierError(res.message || 'Không thể tải hồ sơ bệnh nhân.');
        error(res.message || "Lỗi tải hồ sơ y bạ");
      }
    } catch (err) {
      setDossierError(err.message || 'Không thể tải hồ sơ bệnh nhân.');
      error(err.message || "Lỗi tải hồ sơ");
    } finally {
      setLoadingDossier(false);
    }
  };
  const handleCreateUser = async () => {
    if (!createForm.full_name || !createForm.email) {
      error("Họ tên và email là bắt buộc");
      return;
    }
    if (!createForm.password || createForm.password.trim().length === 0) {
      error("Vui lòng thiết lập mật khẩu khởi tạo cho tài khoản");
      return;
    }
    try {
      const res = await adminApi.createUser(createForm);
      if (res.success) {
        const finalPass = res.data?.initial_password || createForm.password;
        success(`Đã tạo tài khoản cho ${createForm.full_name} thành công!`);
        setIsCreateOpen(false);
        setCreatedCredentials({
          full_name: createForm.full_name,
          email: createForm.email,
          password: finalPass,
          role: createForm.role || "user",
          phone_number: createForm.phone_number || "",
          created_at: new Date().toLocaleString("vi-VN"),
        });
        setCreateForm({
          full_name: "",
          email: "",
          password: generateRandomPassword(),
          role: "user",
          phone_number: "",
          gender: "other",
          date_of_birth: "",
          blood_type: "unknown",
          height_cm: null,
          base_weight_kg: null,
          activity_level: "moderate",
          chronic_conditions: [],
          allergies: [],
          current_medications: "",
          emergency_contact_name: "",
          emergency_contact_relationship: "",
          emergency_contact_phone: "",
        });
        fetchUsers();
      } else {
        error(res.message || "Lỗi tạo tài khoản");
      }
    } catch (err) {
      error(err.message || "Lỗi tạo tài khoản");
    }
  };
  const handleOpenEdit = async (user) => {
    // The list intentionally contains summary fields only. Never initialize an
    // edit form from it: that would clear medical fields absent from the list.
    const response = await adminApi.getUserDossier(user.id);
    if (!response.success || !response.data?.user) { error(response.message || 'Không thể tải hồ sơ đầy đủ để chỉnh sửa.'); return; }
    user = response.data.user;
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      clinical_title:
        user.clinical_title ||
        (user.role === "admin" ? "super_admin" : "patient"),
      custom_permissions: user.custom_permissions || {
        canViewAllTelemetry: user.role === "admin",
        canEditClinicalNotes: user.role === "admin",
        canOverrideAiDiagnosis: user.role === "admin",
        canManageDevices: user.role === "admin",
        canResetPasswords: user.role === "admin",
        canExportEMR: true,
        canModifyThresholds: user.role === "admin",
        canManageUsers: user.role === "admin",
        canAuditSecurity: user.role === "admin",
      },
      vital_alert_thresholds: user.vital_alert_thresholds || {
        highSystolic: 140,
        highDiastolic: 90,
        lowSystolic: 90,
        lowDiastolic: 60,
        highHeartRate: 100,
        lowHeartRate: 50,
        targetWeight: user.target_weight_kg ?? null,
        sosAlertEnabled: true,
      },
      phone_number: user.phone_number || "",
      gender: user.gender || "other",
      date_of_birth: user.date_of_birth ? String(user.date_of_birth).slice(0, 10) : "",
      blood_type: user.blood_type || "unknown",
      height_cm: user.height_cm ?? null,
      base_weight_kg: user.base_weight_kg ?? null,
      target_weight_kg: user.target_weight_kg ?? null,
      activity_level: user.activity_level || "moderate",
      occupation: user.occupation || "",
      address: user.address || "",
      chronic_conditions: user.chronic_conditions || [],
      allergies: user.allergies || [],
      current_medications: user.current_medications || "",
      primary_doctor: user.primary_doctor || "",
      hospital_clinic: user.hospital_clinic || "",
      medical_notes: user.medical_notes || "",
      emergency_contact_name: user.emergency_contact_name || "",
      emergency_contact_relationship: user.emergency_contact_relationship || "",
      emergency_contact_phone: user.emergency_contact_phone || "",
    });
  };
  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      const res = await adminApi.updateUserProfile(editingUser.id, editForm);
      if (res.success) {
        success(`Đã cập nhật hồ sơ của ${editingUser.full_name} thành công!`);
        setEditingUser(null);
        fetchUsers();
        if (dossierUserId === editingUser.id) {
          handleOpenDossier(editingUser.id);
        }
      } else {
        error(res.message || "Lỗi cập nhật hồ sơ");
      }
    } catch (err) {
      error(err.message || "Lỗi cập nhật");
    }
  };
  const handleResetPassword = async () => {
    if (!resetPassUser) return;
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(18));
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
      const password = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
      const res = await adminApi.resetUserPassword(resetPassUser.id, password);
      if (res.success && res.data) {
        setTempPasswordGenerated(res.data.temporaryPassword || null);
        success("Đã cấp lại mật khẩu tạm thời thành công!");
      } else {
        error(res.message || "Không thể reset mật khẩu");
      }
    } catch (err) {
      error(err.message || "Lỗi reset mật khẩu");
    }
  };
  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    try {
      const res = await adminApi.deleteUser(deleteConfirmUser.id);
      if (res.success) {
        success(`Đã xóa hoàn toàn tài khoản ${deleteConfirmUser.full_name}`);
        setUsers((prev) => prev.filter((u) => u.id !== deleteConfirmUser.id));
      } else {
        error(res.message || "Lỗi xóa tài khoản");
      }
    } catch (err) {
      error(err.message || "Lỗi xóa tài khoản");
    } finally {
      setDeleteConfirmUser(null);
    }
  };
  const handleToggleStatus = async () => {
    if (!statusConfirmUser) return;
    try {
      const newStatus = !statusConfirmUser.is_active;
      const res = await adminApi.updateUserStatus(
        statusConfirmUser.id,
        newStatus,
      );
      if (res.success) {
        success(
          newStatus ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản thành công",
        );
        setUsers((prev) =>
          prev.map((u) =>
            u.id === statusConfirmUser.id ? { ...u, is_active: newStatus } : u,
          ),
        );
      } else {
        error(res.message || "Không thể thay đổi trạng thái");
      }
    } catch (err) {
      error(err.message || "Lỗi xử lý");
    } finally {
      setStatusConfirmUser(null);
    }
  };
  const handleToggleRole = async (user) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      const res = await adminApi.updateUserRole(user.id, newRole);
      if (res.success) {
        success(
          `Đã chuyển vai trò thành ${newRole === "admin" ? "Quản trị viên" : "Người dùng"}`,
        );
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)),
        );
      } else {
        error(res.message || "Không thể đổi quyền");
      }
    } catch (err) {
      error(err.message || "Lỗi đổi quyền");
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
  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex flex-col flex-1 pb-8">
      <DataStatus error={loadError} onRetry={fetchUsers} />
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý Người Dùng & Bệnh Nhân
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Tra cứu hồ sơ y khoa chuyên sâu, sinh trắc học, cấp lại mật khẩu và phân quyền
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />}
            onClick={fetchUsers}
            disabled={loading}
          >
            Làm mới
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            Thêm Bệnh Nhân
          </Button>
        </div>
      </header>

      {/* Search Bar */}
      <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-xs mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
          />
        </div>
      </motion.div>

      {/* Users Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-xs flex-1 flex flex-col overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
            Đang tải danh sách người dùng...
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center">
            <Shield className="w-8 h-8 text-slate-400 mb-2" />
            Không tìm thấy người dùng nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-64">Bệnh nhân / Người dùng</th>
                  <th className="py-3 px-4 w-48">Email & Liên hệ</th>
                  <th className="py-3 px-4 w-48">Vai trò</th>
                  <th className="py-3 px-4 w-32">Trạng thái</th>
                  <th className="py-3 px-4 w-32">Chỉ số sinh tồn</th>
                  <th className="py-3 px-4 w-48 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-none">
                <AnimatePresence>
                  {users.map((user) => (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={user.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm bg-slate-100 text-slate-700 shrink-0">
                            {user.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {user.full_name}
                            </p>
                            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                              ID: #{user.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900 truncate">{user.email}</p>
                        {user.phone_number && (
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone_number}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === "admin" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-700"}`}>
                            {user.role === "admin" ? <><Shield className="w-3 h-3" /> Admin</> : "Patient"}
                          </span>
                          {user.clinical_title && user.clinical_title !== "patient" && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                              {user.clinical_title === "cardiologist" ? "BS. Tim Mạch" : user.clinical_title === "doctor" ? "Bác Sĩ" : user.clinical_title === "nurse" ? "Điều Dưỡng" : user.clinical_title === "super_admin" ? "Super Admin" : user.clinical_title}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${user.is_active ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {user.is_active ? "Đang hoạt động" : "Đã khóa"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-500">
                        <strong className="text-slate-900 font-semibold">{user.records_count ?? 0}</strong> lượt đo
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenDossier(user.id)}
                            className="px-2 py-1.5 rounded-md hover:bg-blue-50 text-blue-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                            title="Xem Y bạ"
                          >
                            <Eye className="w-3.5 h-3.5" /> Y bạ
                          </button>
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Sửa thông tin"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setResetPassUser(user); setTempPasswordGenerated(null); }}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Cấp lại mật khẩu"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleRole(user)}
                            className="px-2 py-1.5 rounded-md hover:bg-slate-100 text-slate-600 text-[11px] font-semibold transition-colors"
                            title="Đổi quyền"
                          >
                            {user.role === "admin" ? "Hạ quyền" : "Nâng Admin"}
                          </button>
                          <button
                            onClick={() => setStatusConfirmUser(user)}
                            className={`p-1.5 rounded-md transition-colors ${user.is_active ? "text-slate-600 hover:text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                            title={user.is_active ? "Khóa tài khoản" : "Mở khóa"}
                          >
                            {user.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmUser(user)}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>{" "}
      {/* DEEP USER DOSSIER MODAL */}
      <Modal
        isOpen={!!dossierUserId}
        onClose={() => {
          setDossierUserId(null);
          setDossierData(null);
        }}
        title={`Hồ Sơ Y Bạ Bệnh Nhân: ${dossierData?.user?.full_name || "Đang tải..."}`}
        subtitle={dossierData ? `Email: ${dossierData.user.email} | ID: #${dossierData.user.id}` : undefined}
        maxWidth="lg"
      >
        {dossierError ? <DataStatus error={dossierError} onRetry={() => handleOpenDossier(dossierUserId)} /> : loadingDossier || !dossierData ? (
          <div className="py-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
            Đang tải hồ sơ y bạ...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Dossier Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto">
              {[
                { id: "profile", label: "Y bạ & Tiền sử", icon: FileText },
                { id: "telemetry", label: `Sinh tồn (${(dossierData.health_records ?? []).length})`, icon: Activity },
                { id: "ai", label: `AI Diagnoses (${dossierData.aiHistory.length})`, icon: Bot },
                { id: "goals", label: `Mục tiêu (${dossierData.goals.length})`, icon: Target },
                { id: "devices", label: `Thiết bị (${dossierData.devices.length})`, icon: Cpu },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDossierTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${dossierTab === tab.id ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB 1: Profile & Medical History */}
            {dossierTab === "profile" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Vitals Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">HA Trung bình</p>
                    <p className="text-lg font-bold text-slate-900 tracking-tight">
                      {dossierData.stats.avgSystolic ?? '--'}/{dossierData.stats.avgDiastolic ?? '--'} <span className="text-[10px] text-slate-500 font-medium">mmHg</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nhịp tim TB</p>
                    <p className="text-lg font-bold text-slate-900 tracking-tight">
                      {dossierData.stats.avgHeartRate ?? '--'} <span className="text-[10px] text-slate-500 font-medium">bpm</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Chỉ số BMI</p>
                    <p className="text-lg font-bold text-slate-900 tracking-tight">
                      {dossierData.stats.bmi || "--"} <span className="text-[10px] text-orange-600 font-semibold">{dossierData.stats.bmiCategory}</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cân nặng</p>
                    <p className="text-lg font-bold text-slate-900 tracking-tight">
                      {dossierData.stats.lastWeight ?? '--'} <span className="text-[10px] text-slate-500 font-medium">kg</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Demographics */}
                  <div className="space-y-2 text-xs">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-1 mb-2">
                      <Shield className="w-3.5 h-3.5 text-blue-500" /> Nhân khẩu học
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500 font-medium">Giới tính:</span>
                      <span className="col-span-2 font-medium text-slate-900">{dossierData.user.gender || "--"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500 font-medium">Ngày sinh:</span>
                      <span className="col-span-2 font-medium text-slate-900">{dossierData.user.date_of_birth || "--"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500 font-medium">Nhóm máu:</span>
                      <span className="col-span-2 font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded w-fit">{dossierData.user.blood_type || "--"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500 font-medium">Hình thể:</span>
                      <span className="col-span-2 font-medium text-slate-900">{dossierData.user.height_cm || "--"} cm / {dossierData.user.base_weight_kg || "--"} kg</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500 font-medium">Địa chỉ:</span>
                      <span className="col-span-2 font-medium text-slate-900">{dossierData.user.address || "--"}</span>
                    </div>
                  </div>

                  {/* Medical */}
                  <div className="space-y-3 text-xs">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-1 mb-2">
                      <Activity className="w-3.5 h-3.5 text-rose-500" /> Y khoa & Dị ứng
                    </h4>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Bệnh lý nền:</span>
                      <div className="flex flex-wrap gap-1">
                        {dossierData.user.chronic_conditions?.length ? (
                          dossierData.user.chronic_conditions.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded font-medium text-[10px]">{c}</span>
                          ))
                        ) : <span className="text-slate-500 italic">Không có</span>}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Dị ứng:</span>
                      <div className="flex flex-wrap gap-1">
                        {dossierData.user.allergies?.length ? (
                          dossierData.user.allergies.map((a, i) => (
                            <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-100 rounded font-medium text-[10px]">{a}</span>
                          ))
                        ) : <span className="text-slate-500 italic">Không có</span>}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Đang điều trị:</span>
                      <span className="font-medium text-slate-900">{dossierData.user.current_medications || "Không có"}</span>
                    </div>
                  </div>
                </div>

                {dossierData.user.emergency_contact_name && (
                  <div className="bg-orange-50/50 p-3 rounded-lg border border-orange-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                        <Phone className="w-3 h-3 text-orange-600" /> Liên hệ khẩn cấp
                      </p>
                      <p className="text-xs text-orange-900 font-medium">
                        {dossierData.user.emergency_contact_name} ({dossierData.user.emergency_contact_relationship || "Người thân"}) - SĐT: <strong className="font-mono">{dossierData.user.emergency_contact_phone}</strong>
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 2: Telemetry Records */}
            {dossierTab === "telemetry" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 max-h-[50vh] overflow-y-auto">
                {(dossierData.health_records ?? []).length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">Chưa có bản ghi sinh tồn.</div>
                ) : (
                  (dossierData.health_records ?? []).map((r) => (
                    <div key={r.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1 text-sm">
                          <span className="font-semibold font-mono text-slate-900">{r.systolic}/{r.diastolic} <span className="text-[10px] text-slate-500 font-sans">mmHg</span></span>
                          <span className="font-semibold font-mono text-rose-600">{r.heart_rate} <span className="text-[10px] text-rose-600 font-sans">bpm</span></span>
                          <span className="font-semibold font-mono text-slate-600">{r.weight} <span className="text-[10px] font-sans">kg</span></span>
                        </div>
                        {r.notes && <p className="text-[11px] text-slate-500 italic">"{r.notes}"</p>}
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {new Date(r.recorded_at).toLocaleDateString("vi-VN")} {new Date(r.recorded_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {r.doctor_reviewed ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Đã duyệt</span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Chờ duyệt</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* TAB 3: AI History */}
            {dossierTab === "ai" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 max-h-[50vh] overflow-y-auto">
                {dossierData.aiHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">Chưa có chẩn đoán AI.</div>
                ) : (
                  dossierData.aiHistory.map((ai) => (
                    <div key={ai.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                      <div className="flex justify-between items-start gap-3">
                        <span className="font-medium text-slate-800 text-xs leading-relaxed">{ai.summary}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${ai.riskLevel === "high" ? "bg-rose-100 text-rose-700" : "bg-orange-100 text-orange-700"}`}>
                          {ai.riskLevel}
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                        <Bot className="w-3 h-3" /> {ai.engine === 'reference-rules' ? 'Đối chiếu tham chiếu' : ai.engine === 'gemini-with-reference-rules' ? 'Giải thích Gemini + quy tắc' : 'Phân tích lịch sử — chưa rõ phương thức'} • {new Date(ai.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* TAB 4: Health Goals */}
            {dossierTab === "goals" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {dossierData.goals.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">Chưa thiết lập mục tiêu.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dossierData.goals.map((g) => (
                      <div key={g.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <p className="font-semibold text-slate-800 text-xs">{g.title}</p>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{g.progress_percentage || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(g.progress_percentage || 0, 100)}%` }}></div>
                        </div>
                        <p className="text-[10px] font-medium text-slate-500">
                          Mục tiêu: <strong className="text-slate-700">{g.target_value} {g.unit}</strong> (Hiện tại: {g.current_value})
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 5: Devices */}
            {dossierTab === "devices" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {dossierData.devices.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">Chưa ghép nối thiết bị IoT nào.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dossierData.devices.map((d) => (
                      <div key={d.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center shrink-0">
                          <Cpu className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="flex justify-between items-center mb-0.5">
                            <p className="font-semibold text-slate-800 truncate">{d.name}</p>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">{d.status}</span>
                          </div>
                          <p className="text-slate-500 truncate">{d.model}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setDossierUserId(null)}>Đóng Y bạ</Button>
            </div>
          </div>
        )}
      </Modal>{" "}
      {/* CREATE USER MODAL */}{" "}
      {/* CREATE USER MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Tạo Mới Tài Khoản"
        subtitle="Khởi tạo tài khoản, thiết lập mật khẩu và hồ sơ sức khỏe ban đầu"
        maxWidth="lg"
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Họ và tên bệnh nhân <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={createForm.full_name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, full_name: e.target.value })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
                placeholder="VD: Nguyễn Văn Bình"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Email Đăng nhập <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
                placeholder="binh.nguyen@example.com"
              />
            </div>
          </div>

          {/* SECURITY & INITIAL PASSWORD SECTION */}
          <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-0.5">
                  <KeyRound className="w-4 h-4 text-slate-600" /> Mật Khẩu Khởi Tạo <span className="text-rose-500">*</span>
                </p>
                <p className="text-xs text-slate-500">
                  Mật khẩu dùng để bàn giao cho người dùng
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCreateForm({
                    ...createForm,
                    password: generateRandomPassword(),
                  })
                }
                className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5 "
              >
                <RefreshCw className="w-3.5 h-3.5" /> Ngẫu nhiên
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Mật khẩu:
                </label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, password: e.target.value })
                    }
                    className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 pr-20 text-sm font-mono transition-all"
                    placeholder="Nhập mật khẩu"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                      title={showCreatePassword ? "Ẩn" : "Hiện"}
                    >
                      {showCreatePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createForm.password, "form-pass")}
                      className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                      title="Sao chép"
                    >
                      {copiedField === "form-pass" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Vai trò (Role):
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, role: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all cursor-pointer"
                >
                  <option value="user">Bệnh nhân / Người dùng</option>
                  <option value="admin">Quản trị viên / Bác sĩ</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Mẫu nhanh:</span>
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, password: "Vital@2026" })}
                  className="px-2 py-1 rounded border border-slate-200 hover:border-slate-300 bg-white text-slate-600 font-mono text-[10px] transition-colors"
                >
                  Vital@2026
                </button>
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, password: "KhoeManh#2026" })}
                  className="px-2 py-1 rounded border border-slate-200 hover:border-slate-300 bg-white text-slate-600 font-mono text-[10px] transition-colors"
                >
                  KhoeManh#2026
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Số điện thoại</label>
              <input
                type="text"
                value={createForm.phone_number}
                onChange={(e) =>
                  setCreateForm({ ...createForm, phone_number: e.target.value })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Giới tính</label>
              <select
                value={createForm.gender}
                onChange={(e) =>
                  setCreateForm({ ...createForm, gender: e.target.value })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all cursor-pointer"
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Ngày sinh</label>
              <input
                type="date"
                value={createForm.date_of_birth}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    date_of_birth: e.target.value,
                  })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Nhóm máu</label>
              <select
                value={createForm.blood_type}
                onChange={(e) =>
                  setCreateForm({ ...createForm, blood_type: e.target.value })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm font-medium transition-all cursor-pointer"
              >
                <option value="unknown">Chưa xác định</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Chiều cao (cm)</label>
              <input
                type="number"
                value={createForm.height_cm ?? ''}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    height_cm: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Cân nặng ban đầu (kg)</label>
              <input
                type="number"
                value={createForm.base_weight_kg ?? ''}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    base_weight_kg: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Thuốc đang điều trị</label>
            <input
              type="text"
              value={createForm.current_medications}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  current_medications: e.target.value,
                })
              }
              className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
              placeholder="VD: Losartan 50mg, Atorvastatin 10mg"
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
            <p className="text-xs font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Người liên hệ khẩn cấp (SOS)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Họ tên"
                value={createForm.emergency_contact_name}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    emergency_contact_name: e.target.value,
                  })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
              />
              <input
                type="text"
                placeholder="Quan hệ (Vợ/Con)"
                value={createForm.emergency_contact_relationship}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    emergency_contact_relationship: e.target.value,
                  })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
              />
              <input
                type="text"
                placeholder="Số điện thoại"
                value={createForm.emergency_contact_phone}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    emergency_contact_phone: e.target.value,
                  })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm font-mono transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateUser}>
              Tạo Tài Khoản
            </Button>
          </div>
        </div>
      </Modal>

      {/* HANDOVER CREDENTIALS MODAL */}
      <Modal
        isOpen={!!createdCredentials}
        onClose={() => setCreatedCredentials(null)}
        title="Khởi Tạo Thành Công"
        subtitle={`Phiếu bàn giao thông tin đăng nhập cho ${createdCredentials?.full_name}`}
        maxWidth="md"
      >
        {createdCredentials && (
          <div className="space-y-6">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-900 mb-0.5">
                  Tài khoản đã sẵn sàng
                </p>
                <p className="text-xs text-emerald-700">
                  Hãy sao chép thông tin bên dưới và gửi cho người dùng.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-5 rounded-md space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-400">
                    Thông tin đăng nhập
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${createdCredentials.role === "admin" ? "bg-amber-500/20 text-amber-300" : "bg-slate-700 text-slate-400"}`}>
                  {createdCredentials.role === "admin" ? "Admin" : "User"}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center bg-slate-800/50 p-2.5 rounded-md">
                  <span className="text-slate-500">Email:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-200 select-all">{createdCredentials.email}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdCredentials.email, "email")}
                      className="p-1 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-colors"
                      title="Sao chép"
                    >
                      {copiedField === "email" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-800/50 p-2.5 rounded-md">
                  <span className="text-slate-500">Mật khẩu:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-amber-600 select-all">{createdCredentials.password}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdCredentials.password, "password")}
                      className="p-1 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-colors"
                      title="Sao chép"
                    >
                      {copiedField === "password" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs px-1 pt-1 border-t border-slate-800">
                  <span className="text-slate-500">Đường dẫn:</span>
                  <span className="text-slate-500 font-mono">{window.location.origin}/login</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => copyToClipboard(getHandoverSummaryText(createdCredentials), "all")}
                className="p-2 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
              >
                {copiedField === "all" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                Chép tất cả
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(getZaloSmsMessage(createdCredentials), "msg")}
                className="p-2 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
              >
                {copiedField === "msg" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <MessageSquare className="w-3.5 h-3.5 text-slate-500" />}
                Mẫu Tin Nhắn
              </button>
              <button
                type="button"
                onClick={() => handleDownloadHandoverSlip(createdCredentials)}
                className="p-2 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Tải file .txt
              </button>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button variant="primary" size="sm" onClick={() => setCreatedCredentials(null)}>
                Đã Lưu Xong
              </Button>
            </div>
          </div>
        )}
      </Modal>{" "}
      {/* EDIT USER MODAL */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Chỉnh Sửa Hồ Sơ"
        subtitle={editingUser?.full_name}
        maxWidth="lg"
      >
        {editingUser && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={editForm.full_name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, full_name: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={editForm.phone_number || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone_number: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Chiều cao (cm)
                </label>
                <input
                  type="number"
                  value={editForm.height_cm ?? ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      height_cm: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Cân nặng ban đầu (kg)
                </label>
                <input
                  type="number"
                  value={editForm.base_weight_kg ?? ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      base_weight_kg: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Bác sĩ phụ trách
                </label>
                <input
                  type="text"
                  value={editForm.primary_doctor || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, primary_doctor: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
                  placeholder="BS. CKI Trần Văn A"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Cơ sở y tế
                </label>
                <input
                  type="text"
                  value={editForm.hospital_clinic || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      hospital_clinic: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
                  placeholder="Viện Tim Mạch Quốc Gia"
                />
              </div>
            </div>

            {/* Clinical Role & Title */}
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-0.5">
                    <Shield className="w-4 h-4 text-slate-600" /> Chức Danh & Phân Quyền
                  </p>
                  <p className="text-xs text-slate-500">
                    Quyền đang áp dụng trên máy chủ: Admin hoặc User. Chức danh và ma trận chi tiết chưa có cột lưu trong schema hiện tại.
                  </p>
                </div>
                <select aria-label="Vai trò tài khoản" value={editForm.role || 'user'} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="border border-slate-200 rounded-md px-3 py-2 text-sm">
                  <option value="user">User — Người dùng</option><option value="admin">Admin — Quản trị</option>
                </select>
                <select
                  disabled title="Chức danh chi tiết chưa được backend lưu hoặc thực thi"
                  value={editForm.clinical_title || "patient"}
                  onChange={(e) => {
                    const val = e.target.value;
                    const isAdm = val === "super_admin" || val === "cardiologist";
                    setEditForm({
                      ...editForm,
                      clinical_title: val,
                      role: isAdm ? "admin" : "user",
                      custom_permissions: {
                        canViewAllTelemetry: isAdm || val === "doctor" || val === "nurse",
                        canEditClinicalNotes: isAdm || val === "doctor" || val === "nurse",
                        canOverrideAiDiagnosis: isAdm || val === "doctor",
                        canManageDevices: isAdm || val === "nurse",
                        canResetPasswords: isAdm,
                        canExportEMR: true,
                        canModifyThresholds: isAdm || val === "doctor",
                        canManageUsers: isAdm,
                        canAuditSecurity: isAdm,
                      },
                    });
                  }}
                  className="bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all w-full sm:w-auto cursor-pointer"
                >
                  <option value="patient">Bệnh Nhân</option>
                  <option value="nurse">Điều Dưỡng Lâm Sàng</option>
                  <option value="doctor">Bác Sĩ Điều Trị</option>
                  <option value="cardiologist">Bác Sĩ Tim Mạch</option>
                  <option value="super_admin">Quản Trị Viên</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Ma trận tùy chỉnh chi tiết
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  {[
                    { key: "canViewAllTelemetry", label: "Xem luồng sinh tồn toàn hệ thống" },
                    { key: "canEditClinicalNotes", label: "Bác sĩ ghi nhận xét & duyệt chỉ số" },
                    { key: "canOverrideAiDiagnosis", label: "Thẩm định & duyệt chẩn đoán AI" },
                    { key: "canManageDevices", label: "Quản trị thiết bị IoT" },
                    { key: "canResetPasswords", label: "Cấp lại mật khẩu người dùng" },
                    { key: "canExportEMR", label: "Xuất hồ sơ bệnh án (EMR)" },
                    { key: "canModifyThresholds", label: "Tùy chỉnh ngưỡng cấp cứu" },
                    { key: "canManageUsers", label: "Quản lý tài khoản hệ thống" },
                    { key: "canAuditSecurity", label: "Xem nhật ký bảo mật" },
                  ].map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        disabled title="Máy chủ hiện phân quyền theo Admin/User"
                        checked={!!editForm.custom_permissions?.[perm.key]}
                        onChange={(e) => {
                          setEditForm({
                            ...editForm,
                            custom_permissions: {
                              ...editForm.custom_permissions,
                              [perm.key]: e.target.checked,
                            },
                          });
                        }}
                        className="rounded border-slate-300 text-slate-800 focus:ring-slate-800 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Vital Alert Thresholds */}
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-0.5">
                  <Activity className="w-4 h-4 text-slate-600" /> Cấu Hình Ngưỡng Cảnh Báo
                </p>
                <p className="text-xs text-slate-500">
                  Hệ thống sẽ kích hoạt SOS khi vượt ngưỡng
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Tâm Thu Cao
                  </label>
                  <input
                    type="number"
                    value={editForm.vital_alert_thresholds?.highSystolic ?? 140}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        vital_alert_thresholds: {
                          ...editForm.vital_alert_thresholds,
                          highSystolic: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-2.5 py-1.5 font-mono text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Tâm Trương Cao
                  </label>
                  <input
                    type="number"
                    value={editForm.vital_alert_thresholds?.highDiastolic ?? 90}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        vital_alert_thresholds: {
                          ...editForm.vital_alert_thresholds,
                          highDiastolic: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-2.5 py-1.5 font-mono text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Nhịp Tim Cao
                  </label>
                  <input
                    type="number"
                    value={editForm.vital_alert_thresholds?.highHeartRate ?? 100}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        vital_alert_thresholds: {
                          ...editForm.vital_alert_thresholds,
                          highHeartRate: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-2.5 py-1.5 font-mono text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Nhịp Tim Thấp
                  </label>
                  <input
                    type="number"
                    value={editForm.vital_alert_thresholds?.lowHeartRate ?? 50}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        vital_alert_thresholds: {
                          ...editForm.vital_alert_thresholds,
                          lowHeartRate: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-2.5 py-1.5 font-mono text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Thuốc & Liều dùng hiện tại
              </label>
              <input
                type="text"
                value={editForm.current_medications || ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    current_medications: e.target.value,
                  })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md px-3 py-2 text-sm transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Ghi chú lâm sàng của Quản trị viên
              </label>
              <textarea
                rows={3}
                value={editForm.medical_notes || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, medical_notes: e.target.value })
                }
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-md p-3 text-sm transition-all resize-none"
                placeholder="Ghi chú đặc biệt về bệnh nhân..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setEditingUser(null)}>
                Hủy
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                Lưu Thay Đổi
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={!!resetPassUser}
        onClose={() => setResetPassUser(null)}
        title="Cấp Lại Mật Khẩu Tạm Thời"
        subtitle={`Tài khoản: ${resetPassUser?.email}`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 leading-relaxed">
              Hệ thống sẽ tạo một mật khẩu ngẫu nhiên để bệnh nhân có thể đăng nhập lại, vô hiệu hóa mật khẩu cũ.
            </p>
          </div>

          {tempPasswordGenerated && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-center space-y-2"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Mật khẩu mới đã kích hoạt:
              </p>
              <p className="text-lg font-mono font-medium text-slate-900 select-all bg-white py-2 px-3 rounded inline-block border border-emerald-300">
                {tempPasswordGenerated}
              </p>
              <p className="text-xs text-emerald-700">
                Vui lòng sao chép và gửi cho người dùng.
              </p>
            </motion.div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setResetPassUser(null)}>
              Đóng
            </Button>
            {!tempPasswordGenerated && (
              <Button variant="primary" size="sm" onClick={handleResetPassword}>
                Tạo Mật Khẩu
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deleteConfirmUser}
        onClose={() => setDeleteConfirmUser(null)}
        title="Xác nhận xóa vĩnh viễn"
        subtitle={deleteConfirmUser?.full_name}
        maxWidth="sm"
      >
        <div className="space-y-5">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-3">
            <Trash2 className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-900 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản này? Mọi dữ liệu sinh tồn, mục tiêu và thiết bị liên kết sẽ bị xóa sạch hoàn toàn khỏi hệ thống và <strong className="font-semibold text-rose-700">KHÔNG THỂ KHÔI PHỤC</strong>.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmUser(null)}>
              Hủy bỏ
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteUser}>
              Xóa Vĩnh Viễn
            </Button>
          </div>
        </div>
      </Modal>

      {/* LOCK / UNLOCK CONFIRMATION MODAL */}
      <Modal
        isOpen={!!statusConfirmUser}
        onClose={() => setStatusConfirmUser(null)}
        title={statusConfirmUser?.is_active ? "Xác nhận khóa tài khoản" : "Xác nhận mở khóa"}
        subtitle={statusConfirmUser?.full_name}
        maxWidth="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-700 leading-relaxed p-3 bg-slate-50 border border-slate-200 rounded-md">
            {statusConfirmUser?.is_active
              ? `Tài khoản bị khóa sẽ không thể truy cập hệ thống và đồng bộ dữ liệu. Bạn có chắc chắn muốn khóa tài khoản của ${statusConfirmUser.full_name}?`
              : `Mở khóa sẽ cho phép ${statusConfirmUser?.full_name} đăng nhập và sử dụng hệ thống trở lại. Bạn có đồng ý?`}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setStatusConfirmUser(null)}>
              Hủy bỏ
            </Button>
            <Button
              variant={statusConfirmUser?.is_active ? "danger" : "primary"}
              size="sm"
              onClick={handleToggleStatus}
            >
              {statusConfirmUser?.is_active ? "Khóa tài khoản" : "Mở khóa"}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

