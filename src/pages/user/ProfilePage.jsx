import React, { useState, useEffect, useMemo } from "react";
import { UserHeader } from "../../components/layout/UserHeader";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { authApi } from "../../api/client";
import {
  User, Lock, LogOut, ShieldCheck, Mail, Calendar, Phone, MapPin,
  Briefcase, Activity, Heart, AlertTriangle, CheckCircle2, Save,
  Plus, Flame, Stethoscope, Building, PhoneCall, Sliders, Sparkles, Scale,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const COMMON_CONDITIONS = [
  "Tăng huyết áp", "Tiền tăng huyết áp", "Đái tháo đường Tuýp 2",
  "Rối loạn mỡ máu (Lipid)", "Bệnh mạch vành", "Hen suyễn (Hen phế quản)",
  "Đau dạ dày / Trào ngược", "Thoái hóa cột sống", "Bệnh Gút (Gout)",
  "Gan nhiễm mỡ",
];
const COMMON_ALLERGIES = [
  "Kháng sinh Penicillin", "Aspirin / NSAIDs", "Hải sản có vỏ (Tôm, Cua)",
  "Đậu phộng / Lạc", "Trứng gà", "Sữa bò (Lactose)",
  "Phấn hoa mùa hoa", "Lông chó mèo", "Thời tiết / Bụi mịn",
];

export const ProfilePage = () => {
  const { user, logout, updateProfile } = useAuth();
  const { success, error } = useToast();
  
  const [activeTab, setActiveTab] = useState("personal");
  
  // Tab 1
const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("male");
  const [address, setAddress] = useState("");
  const [occupation, setOccupation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // Tab 2
const [heightCm, setHeightCm] = useState("170");
  const [baseWeightKg, setBaseWeightKg] = useState("68");
  const [targetWeightKg, setTargetWeightKg] = useState("65");
  const [bloodType, setBloodType] = useState("unknown");
  const [activityLevel, setActivityLevel] = useState("moderate");
  
  // Tab 3
const [chronicConditions, setChronicConditions] = useState([]);
  const [customCondition, setCustomCondition] = useState("");
  const [allergies, setAllergies] = useState([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [primaryDoctor, setPrimaryDoctor] = useState("");
  const [hospitalClinic, setHospitalClinic] = useState("");
  
  // Tab 4
const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [heightUnit, setHeightUnit] = useState("cm");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [highSystolicAlert, setHighSystolicAlert] = useState("140");
  const [highDiastolicAlert, setHighDiastolicAlert] = useState("90");
  const [highHeartRateAlert, setHighHeartRateAlert] = useState("100");
  const [lowHeartRateAlert, setLowHeartRateAlert] = useState("55");
  
  // Tab 5
const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setPhoneNumber(user.phone_number || "");
      setDateOfBirth(user.date_of_birth || "");
      setGender(user.gender || "male");
      setAddress(user.address || "");
      setOccupation(user.occupation || "");
      setAvatarUrl(user.avatar_url || "");
      
      setHeightCm(user.height_cm ? String(user.height_cm) : "170");
      setBaseWeightKg(user.base_weight_kg ? String(user.base_weight_kg) : "68");
      setTargetWeightKg(user.target_weight_kg ? String(user.target_weight_kg) : "65");
      setBloodType(user.blood_type || "unknown");
      setActivityLevel(user.activity_level || "moderate");
      
      setChronicConditions(user.chronic_conditions || []);
      setAllergies(user.allergies || []);
      setCurrentMedications(user.current_medications || "");
      setMedicalNotes(user.medical_notes || "");
      setPrimaryDoctor(user.primary_doctor || "");
      setHospitalClinic(user.hospital_clinic || "");
      
      setEmergencyContactName(user.emergency_contact_name || "");
      setEmergencyContactRelationship(user.emergency_contact_relationship || "");
      setEmergencyContactPhone(user.emergency_contact_phone || "");
      
      setWeightUnit(user.weight_unit || "kg");
      setHeightUnit(user.height_unit || "cm");
      setEmailNotifications(user.email_notifications !== false);
      
      if (user.vital_alert_thresholds) {
        setHighSystolicAlert(String(user.vital_alert_thresholds.highSystolic || 140));
        setHighDiastolicAlert(String(user.vital_alert_thresholds.highDiastolic || 90));
        setHighHeartRateAlert(String(user.vital_alert_thresholds.highHeartRate || 100));
        setLowHeartRateAlert(String(user.vital_alert_thresholds.lowHeartRate || 55));
      }
    }
  }, [user]);

  const calculatedBiometrics = useMemo(() => {
    const height = parseFloat(heightCm) || 0;
    const weight = parseFloat(baseWeightKg) || 0;
    
    let age = 0;
    if (dateOfBirth) {
      const birth = new Date(dateOfBirth);
      const diff = Date.now() - birth.getTime();
      age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    }
    
    let bmi = 0;
    let bmiCategory = "Chưa xác định";
    let bmiColor = "text-slate-600 bg-slate-100 border-slate-200";
    
    if (height > 0 && weight > 0) {
      const heightInMeters = height / 100;
      bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
      
      if (bmi < 18.5) {
        bmiCategory = "Thiếu cân / Thể trạng gầy";
        bmiColor = "text-sky-700 bg-sky-50 border-sky-200";
      } else if (bmi <= 22.9) {
        bmiCategory = "Thể trạng chuẩn (Lý tưởng)";
        bmiColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
      } else if (bmi <= 24.9) {
        bmiCategory = "Tiền béo phì (Thừa cân)";
        bmiColor = "text-orange-700 bg-orange-50 border-orange-200";
      } else if (bmi <= 29.9) {
        bmiCategory = "Béo phì độ 1";
        bmiColor = "text-orange-700 bg-orange-50 border-orange-200";
      } else {
        bmiCategory = "Béo phì độ 2 (Nguy cơ cao)";
        bmiColor = "text-rose-700 bg-rose-50 border-rose-200";
      }
    }
    
    let minIdealWeight = 0;
    let maxIdealWeight = 0;
    if (height > 0) {
      const hm = height / 100;
      minIdealWeight = Math.round(18.5 * hm * hm * 10) / 10;
      maxIdealWeight = Math.round(22.9 * hm * hm * 10) / 10;
    }
    
    let bmr = 0;
    if (height > 0 && weight > 0) {
      const ageVal = age > 0 ? age : 30;
      if (gender === "female") {
        bmr = Math.round(10 * weight + 6.25 * height - 5 * ageVal - 161);
      } else {
        bmr = Math.round(10 * weight + 6.25 * height - 5 * ageVal + 5);
      }
    }
    
    return { age, bmi, bmiCategory, bmiColor, minIdealWeight, maxIdealWeight, bmr };
  }, [heightCm, baseWeightKg, dateOfBirth, gender]);

  const completenessPercentage = useMemo(() => {
    let score = 20;
    if (fullName) score += 10;
    if (phoneNumber) score += 10;
    if (dateOfBirth) score += 10;
    if (address) score += 5;
    if (heightCm && baseWeightKg) score += 15;
    if (bloodType && bloodType !== "unknown") score += 10;
    if (emergencyContactName && emergencyContactPhone) score += 10;
    if (chronicConditions.length > 0 || allergies.length > 0 || currentMedications) score += 10;
    return Math.min(100, score);
  }, [
    fullName, phoneNumber, dateOfBirth, address, heightCm, baseWeightKg,
    bloodType, emergencyContactName, emergencyContactPhone, chronicConditions,
    allergies, currentMedications,
  ]);

  const handleToggleCondition = (cond) => {
    if (chronicConditions.includes(cond)) {
      setChronicConditions(chronicConditions.filter((c) => c !== cond));
    } else {
      setChronicConditions([...chronicConditions, cond]);
    }
  };

  const handleAddCustomCondition = () => {
    const trimmed = customCondition.trim();
    if (trimmed && !chronicConditions.includes(trimmed)) {
      setChronicConditions([...chronicConditions, trimmed]);
      setCustomCondition("");
    }
  };

  const handleToggleAllergy = (allergy) => {
    if (allergies.includes(allergy)) {
      setAllergies(allergies.filter((a) => a !== allergy));
    } else {
      setAllergies([...allergies, allergy]);
    }
  };

  const handleAddCustomAllergy = () => {
    const trimmed = customAllergy.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed]);
      setCustomAllergy("");
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!fullName.trim()) {
      error("Họ và tên không được để trống.");
      return;
    }
    setSavingProfile(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        date_of_birth: dateOfBirth,
        gender,
        address: address.trim(),
        occupation: occupation.trim(),
        avatar_url: avatarUrl.trim(),
        height_cm: parseFloat(heightCm) || undefined,
        base_weight_kg: parseFloat(baseWeightKg) || undefined,
        target_weight_kg: parseFloat(targetWeightKg) || undefined,
        blood_type: bloodType,
        activity_level: activityLevel,
        chronic_conditions: chronicConditions,
        allergies,
        current_medications: currentMedications.trim(),
        medical_notes: medicalNotes.trim(),
        primary_doctor: primaryDoctor.trim(),
        hospital_clinic: hospitalClinic.trim(),
        emergency_contact_name: emergencyContactName.trim(),
        emergency_contact_relationship: emergencyContactRelationship.trim(),
        emergency_contact_phone: emergencyContactPhone.trim(),
        weight_unit: weightUnit,
        height_unit: heightUnit,
        email_notifications: emailNotifications,
        vital_alert_thresholds: {
          highSystolic: parseInt(highSystolicAlert, 10) || 140,
          highDiastolic: parseInt(highDiastolicAlert, 10) || 90,
          highHeartRate: parseInt(highHeartRateAlert, 10) || 100,
          lowHeartRate: parseInt(lowHeartRateAlert, 10) || 55,
        },
      };
      
      const res = await updateProfile(payload);
      if (res.success) {
        success("Cập nhật hồ sơ thành công!");
      } else {
        error(res.message || "Không thể lưu hồ sơ.");
      }
    } catch (err) {
      error(err.message || "Lỗi khi cập nhật hồ sơ");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      error("Mật khẩu mới xác nhận không khớp.");
      return;
    }
    if (newPassword.length < 6) {
      error("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await authApi.updatePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      if (res.success) {
        success("Đổi mật khẩu thành công!");
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        error(res.message || "Không thể đổi mật khẩu");
      }
    } catch (err) {
      error(err.message || "Lỗi khi đổi mật khẩu");
    } finally {
      setSavingPassword(false);
    }
  };

  const tabVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.1 } },
  };

  return (
    <div className="flex flex-col flex-1 pb-8">
      <UserHeader
        title="Hồ sơ"
        italicTitle="Sức khỏe & Cá nhân"
        subtitle="Quản lý dữ liệu sinh trắc, bệnh án, liên hệ khẩn cấp và bảo mật"
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
        {/* Left Column: Profile Summary */}
        <div className="xl:col-span-4 space-y-6">
          {/* Main User Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50/50 rounded-bl-full -z-0" />
            <div className="flex items-center gap-5 mb-6 relative z-10">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md bg-gradient-to-br from-primary-50 to-primary-100 text-primary-700 flex items-center justify-center font-bold text-3xl">
                  {user?.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
                {user?.blood_type && user.blood_type !== "unknown" && (
                  <span className="absolute -bottom-2 -right-2 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border-2 border-white shadow-sm">
                    {user.blood_type}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight truncate">
                  {user?.full_name || "Người dùng"}
                </h3>
                <p className="text-sm text-slate-500 font-medium truncate mb-2">
                  {user?.email}
                </p>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100/50">
                  {user?.role === "admin" ? (
                    <><ShieldCheck className="w-3.5 h-3.5 text-orange-500" /> Quản trị viên</>
                  ) : "Thành viên"}
                </span>
              </div>
            </div>

            {/* Profile Completeness */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100/80 mb-6">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <Sparkles className="w-3.5 h-3.5 text-primary-500" /> Độ hoàn thiện hồ sơ
                </span>
                <span className="font-bold text-slate-900">
                  {completenessPercentage}%
                </span>
              </div>
              <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary-600 h-full rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${completenessPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" />
                </div>
              </div>
            </div>

            {/* Biometric Snapshot */}
            <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Cân nặng/Cao
                </span>
                <span className="text-base font-bold text-slate-800">
                  {baseWeightKg || "--"}kg / {heightCm || "--"}cm
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Chỉ số BMI
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold text-slate-800">
                    {calculatedBiometrics.bmi > 0 ? calculatedBiometrics.bmi : "--"}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Quick Details */}
            <div className="space-y-4 text-sm text-slate-600 font-medium border-t border-slate-100/80 pt-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Phone className="w-4 h-4 text-slate-400" />
                </div>
                <span className="truncate">{phoneNumber || "Chưa cập nhật"}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
                <span>
                  {dateOfBirth ? `${new Date(dateOfBirth).toLocaleDateString("vi-VN")} (${calculatedBiometrics.age} tuổi)` : "Chưa cập nhật"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <MapPin className="w-4 h-4 text-slate-400" />
                </div>
                <span className="truncate">{address || "Chưa có địa chỉ"}</span>
              </div>
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="md"
              className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200"
              onClick={logout}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Đăng xuất khỏi hệ thống
            </Button>
          </div>

          {/* Emergency SOS Quick Contact Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/50 rounded-bl-full -z-0" />
            <div className="flex items-center gap-4 mb-5 relative z-10">
              <div className="w-12 h-12 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 tracking-tight mb-0.5">Liên hệ SOS</h4>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Người nhận cảnh báo khẩn</p>
              </div>
            </div>
            
            <div className="relative z-10">
              {emergencyContactName && emergencyContactPhone ? (
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{emergencyContactName}</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md uppercase tracking-wider border border-slate-200/60 shadow-sm">
                      {emergencyContactRelationship || "Người thân"}
                    </span>
                  </div>
                  <p className="text-[15px] text-slate-700 font-mono font-bold">{emergencyContactPhone}</p>
                </div>
              ) : (
                <div className="bg-slate-50/80 p-5 rounded-xl border border-dashed border-slate-200 text-center">
                  <p className="text-[13px] text-rose-600 font-bold mb-2">Chưa thiết lập liên hệ</p>
                  <button
                    onClick={() => setActiveTab("emergency")}
                    className="text-xs text-primary-600 font-bold underline hover:text-primary-700 transition-colors"
                  >
                    Cài đặt ngay
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Multi-tab Detailed Profile Editor */}
        <div className="xl:col-span-8">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-slate-50/50 overflow-x-auto custom-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab("personal")}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-sm ${
                  activeTab === "personal" 
                    ? "bg-white text-primary-700 border border-slate-200/60" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/60 border border-transparent shadow-none"
                }`}
              >
                <User className="w-4 h-4" /> Cá nhân
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("biometrics")}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-sm ${
                  activeTab === "biometrics" 
                    ? "bg-white text-primary-700 border border-slate-200/60" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/60 border border-transparent shadow-none"
                }`}
              >
                <Scale className="w-4 h-4" /> Sinh trắc
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("medical")}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-sm ${
                  activeTab === "medical" 
                    ? "bg-white text-primary-700 border border-slate-200/60" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/60 border border-transparent shadow-none"
                }`}
              >
                <Stethoscope className="w-4 h-4" /> Y khoa
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("emergency")}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-sm ${
                  activeTab === "emergency" 
                    ? "bg-white text-primary-700 border border-slate-200/60" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/60 border border-transparent shadow-none"
                }`}
              >
                <PhoneCall className={`w-4 h-4 ${activeTab === "emergency" ? "text-rose-500" : ""}`} /> Cảnh báo & SOS
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-sm ${
                  activeTab === "security" 
                    ? "bg-white text-primary-700 border border-slate-200/60" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/60 border border-transparent shadow-none"
                }`}
              >
                <Lock className="w-4 h-4" /> Bảo mật
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 sm:p-8 flex-1">
              <AnimatePresence mode="wait">
                {/* TAB 1: PERSONAL & CONTACT */}
                {activeTab === "personal" && (
                  <motion.form
                    key="personal"
                    variants={tabVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onSubmit={handleSaveProfile}
                    className="space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Thông tin cá nhân</h3>
                        <p className="text-sm text-slate-500 font-medium">Quản lý định danh cá nhân và liên hệ</p>
                      </div>
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={savingProfile}
                        leftIcon={<Save className="w-4 h-4" />}
                      >
                        Lưu thông tin
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input
                        label="Họ và tên *"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        leftIcon={<User className="w-4 h-4 text-slate-400" />}
                      />
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Email (Đăng nhập)
                        </label>
                        <div className="relative flex items-center">
                          <div className="absolute left-3.5 text-slate-400 flex items-center">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            disabled
                            value={user?.email || ""}
                            className="w-full bg-slate-50 border border-slate-200/80 text-slate-500 font-medium text-sm rounded-lg py-3 pl-10 pr-4 cursor-not-allowed outline-none"
                          />
                        </div>
                      </div>
                      <Input
                        label="Số điện thoại"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="0912 345 678"
                        leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
                      />
                      <Input
                        label="Ngày sinh"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
                      />
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Giới tính</label>
                        <div className="grid grid-cols-3 gap-2">
                          {["male", "female", "other"].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setGender(g)}
                              className={`py-2.5 px-2 rounded-lg text-[13px] font-bold border transition-all ${
                                gender === g 
                                  ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                                  : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                              }`}
                            >
                              {g === "male" ? "♂ Nam" : g === "female" ? "♀ Nữ" : "Khác"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Input
                        label="Nghề nghiệp"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        placeholder="Kỹ sư, Giáo viên..."
                        leftIcon={<Briefcase className="w-4 h-4 text-slate-400" />}
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Địa chỉ</label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 text-slate-400 flex items-center">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
                          className="w-full bg-white border border-slate-200/80 text-slate-900 font-medium text-sm rounded-lg py-3 pl-10 pr-4 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
                        />
                      </div>
                    </div>
                  </motion.form>
                )}

                {/* TAB 2: BIOMETRICS & TARGET METRICS */}
                {activeTab === "biometrics" && (
                  <motion.form
                    key="biometrics"
                    variants={tabVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onSubmit={handleSaveProfile}
                    className="space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Sinh trắc & Thể trạng</h3>
                        <p className="text-sm text-slate-500 font-medium">Các chỉ số hình thể cơ bản</p>
                      </div>
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={savingProfile}
                        leftIcon={<Save className="w-4 h-4" />}
                      >
                        Lưu sinh trắc
                      </Button>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-950 text-white border border-slate-800 shadow-xl overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[40px] pointer-events-none" />
                      <div className="flex flex-col sm:flex-row justify-between gap-6 relative z-10">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4" /> Phân tích BMI
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold tracking-tight text-white">
                              {calculatedBiometrics.bmi > 0 ? calculatedBiometrics.bmi : "--"}
                            </span>
                            <span className="text-sm text-slate-400 font-medium">kg/m²</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ml-3 ${
                              calculatedBiometrics.bmi <= 22.9 && calculatedBiometrics.bmi >= 18.5 
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                                : "bg-slate-800 text-slate-300 border border-slate-700"
                            }`}>
                              {calculatedBiometrics.bmiCategory}
                            </span>
                          </div>
                        </div>
                        <div className="text-left sm:text-right sm:border-l sm:border-slate-800 sm:pl-8">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                            Cân nặng lý tưởng
                          </span>
                          <span className="text-2xl font-bold text-white tracking-tight">
                            {calculatedBiometrics.minIdealWeight} - {calculatedBiometrics.maxIdealWeight} kg
                          </span>
                          <span className="text-sm font-medium text-slate-400 block mt-2">
                            BMR: {calculatedBiometrics.bmr} kcal/ngày
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <Input
                        label="Chiều cao (cm) *"
                        type="number"
                        step="0.5"
                        required
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        placeholder="170"
                        leftIcon={<Scale className="w-4 h-4 text-slate-400" />}
                      />
                      <Input
                        label="Cân nặng (kg) *"
                        type="number"
                        step="0.1"
                        required
                        value={baseWeightKg}
                        onChange={(e) => setBaseWeightKg(e.target.value)}
                        placeholder="65"
                        leftIcon={<Activity className="w-4 h-4 text-slate-400" />}
                      />
                      <Input
                        label="Cân nặng mục tiêu (kg)"
                        type="number"
                        step="0.1"
                        value={targetWeightKg}
                        onChange={(e) => setTargetWeightKg(e.target.value)}
                        placeholder="60"
                        leftIcon={<Flame className="w-4 h-4 text-orange-500" />}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Nhóm máu
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {["A+", "B+", "O+", "AB+", "unknown"].map((bt) => (
                            <button
                              key={bt}
                              type="button"
                              onClick={() => setBloodType(bt)}
                              className={`py-2.5 rounded-lg text-[13px] font-bold border transition-all ${
                                bloodType === bt 
                                  ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                                  : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                              }`}
                            >
                              {bt === "unknown" ? "Chưa rõ" : bt}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Mức độ vận động
                        </label>
                        <select
                          value={activityLevel}
                          onChange={(e) => setActivityLevel(e.target.value)}
                          className="w-full bg-white border border-slate-200/80 text-slate-900 font-medium text-sm rounded-lg py-3 px-4 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all cursor-pointer"
                        >
                          <option value="sedentary">Ít vận động (Ngồi nhiều)</option>
                          <option value="light">Vận động nhẹ (1-3 ngày/tuần)</option>
                          <option value="moderate">Vừa phải (3-5 ngày/tuần)</option>
                          <option value="very_active">Năng động (6-7 ngày/tuần)</option>
                          <option value="athlete">Vận động viên</option>
                        </select>
                      </div>
                    </div>
                  </motion.form>
                )}

                {/* TAB 3: MEDICAL HISTORY */}
                {activeTab === "medical" && (
                  <motion.form
                    key="medical"
                    variants={tabVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onSubmit={handleSaveProfile}
                    className="space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Hồ sơ Y khoa</h3>
                        <p className="text-sm text-slate-500 font-medium">Tiền sử bệnh lý và y bạ</p>
                      </div>
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={savingProfile}
                        leftIcon={<Save className="w-4 h-4" />}
                      >
                        Lưu y khoa
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Bệnh nền / Mãn tính
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {COMMON_CONDITIONS.map((cond) => {
                          const isSelected = chronicConditions.includes(cond);
                          return (
                            <button
                              key={cond}
                              type="button"
                              onClick={() => handleToggleCondition(cond)}
                              className={`px-4 py-2 rounded-lg text-[13px] font-bold border transition-all flex items-center gap-2 ${
                                isSelected 
                                  ? "bg-primary-50 text-primary-700 border-primary-500/50 shadow-sm" 
                                  : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                              }`}
                            >
                              {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4 text-slate-400" />}
                              {cond}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-3 max-w-md mt-2">
                        <input
                          type="text"
                          value={customCondition}
                          onChange={(e) => setCustomCondition(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomCondition())}
                          placeholder="Nhập tên bệnh khác..."
                          className="flex-1 bg-white border border-slate-200/80 text-slate-900 font-medium text-sm rounded-lg py-2.5 px-4 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleAddCustomCondition}
                          disabled={!customCondition.trim()}
                        >
                          Thêm
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Tiền sử Dị ứng
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {COMMON_ALLERGIES.map((allergy) => {
                          const isSelected = allergies.includes(allergy);
                          return (
                            <button
                              key={allergy}
                              type="button"
                              onClick={() => handleToggleAllergy(allergy)}
                              className={`px-4 py-2 rounded-lg text-[13px] font-bold border transition-all flex items-center gap-2 ${
                                isSelected 
                                  ? "bg-rose-50 text-rose-700 border-rose-500/50 shadow-sm" 
                                  : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                              }`}
                            >
                              {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4 text-slate-400" />}
                              {allergy}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-3 max-w-md mt-2">
                        <input
                          type="text"
                          value={customAllergy}
                          onChange={(e) => setCustomAllergy(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomAllergy())}
                          placeholder="Nhập dị ứng khác..."
                          className="flex-1 bg-white border border-slate-200/80 text-slate-900 font-medium text-sm rounded-lg py-2.5 px-4 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleAddCustomAllergy}
                          disabled={!customAllergy.trim()}
                        >
                          Thêm
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Thuốc điều trị hiện tại
                        </label>
                        <textarea
                          rows={3}
                          value={currentMedications}
                          onChange={(e) => setCurrentMedications(e.target.value)}
                          placeholder="Các loại thuốc đang dùng..."
                          className="w-full bg-white border border-slate-200/80 text-slate-900 font-medium text-sm rounded-lg p-4 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all resize-none"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Ghi chú y khoa / Lời dặn
                        </label>
                        <textarea
                          rows={3}
                          value={medicalNotes}
                          onChange={(e) => setMedicalNotes(e.target.value)}
                          placeholder="Ghi chú thêm..."
                          className="w-full bg-white border border-slate-200/80 text-slate-900 font-medium text-sm rounded-lg p-4 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all resize-none"
                        />
                      </div>
                      <Input
                        label="Bác sĩ phụ trách"
                        value={primaryDoctor}
                        onChange={(e) => setPrimaryDoctor(e.target.value)}
                        placeholder="Tên bác sĩ"
                        leftIcon={<Stethoscope className="w-4 h-4 text-slate-400" />}
                      />
                      <Input
                        label="Cơ sở y tế theo dõi"
                        value={hospitalClinic}
                        onChange={(e) => setHospitalClinic(e.target.value)}
                        placeholder="Tên bệnh viện/phòng khám"
                        leftIcon={<Building className="w-4 h-4 text-slate-400" />}
                      />
                    </div>
                  </motion.form>
                )}

                {/* TAB 4: EMERGENCY & ALERTS */}
                {activeTab === "emergency" && (
                  <motion.form
                    key="emergency"
                    variants={tabVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onSubmit={handleSaveProfile}
                    className="space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Cảnh báo & Liên hệ SOS</h3>
                        <p className="text-sm text-slate-500 font-medium">Ngưỡng báo động và thông tin khẩn cấp</p>
                      </div>
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={savingProfile}
                        leftIcon={<Save className="w-4 h-4" />}
                      >
                        Lưu thiết lập
                      </Button>
                    </div>

                    <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100/80 space-y-5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
                        <PhoneCall className="w-4 h-4" /> Liên hệ khẩn cấp (SOS)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <Input
                          label="Họ tên"
                          value={emergencyContactName}
                          onChange={(e) => setEmergencyContactName(e.target.value)}
                          placeholder="Người cần báo tin"
                        />
                        <Input
                          label="Quan hệ"
                          value={emergencyContactRelationship}
                          onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                          placeholder="Ví dụ: Vợ, Chồng..."
                        />
                        <Input
                          label="Số điện thoại"
                          value={emergencyContactPhone}
                          onChange={(e) => setEmergencyContactPhone(e.target.value)}
                          placeholder="09..."
                        />
                      </div>
                    </div>

                    <div className="space-y-5 pt-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-primary-500" /> Ngưỡng cảnh báo đỏ (Vitals)
                      </span>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                        <Input
                          label="Tâm thu cao (≥)"
                          type="number"
                          value={highSystolicAlert}
                          onChange={(e) => setHighSystolicAlert(e.target.value)}
                          placeholder="140"
                        />
                        <Input
                          label="Tâm trương cao (≥)"
                          type="number"
                          value={highDiastolicAlert}
                          onChange={(e) => setHighDiastolicAlert(e.target.value)}
                          placeholder="90"
                        />
                        <Input
                          label="Nhịp tim cao (≥)"
                          type="number"
                          value={highHeartRateAlert}
                          onChange={(e) => setHighHeartRateAlert(e.target.value)}
                          placeholder="100"
                        />
                        <Input
                          label="Nhịp tim thấp (≤)"
                          type="number"
                          value={lowHeartRateAlert}
                          onChange={(e) => setLowHeartRateAlert(e.target.value)}
                          placeholder="55"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Đơn vị hiển thị
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setWeightUnit("kg")}
                            className={`py-3 rounded-lg text-sm font-bold border transition-all ${
                              weightUnit === "kg" 
                                ? "bg-primary-50 border-primary-500/50 text-primary-700 shadow-sm" 
                                : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            kg / cm
                          </button>
                          <button
                            type="button"
                            onClick={() => setWeightUnit("lbs")}
                            className={`py-3 rounded-lg text-sm font-bold border transition-all ${
                              weightUnit === "lbs" 
                                ? "bg-primary-50 border-primary-500/50 text-primary-700 shadow-sm" 
                                : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            lbs / inch
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={emailNotifications}
                            onChange={(e) => setEmailNotifications(e.target.checked)}
                            className="w-5 h-5 text-primary-600 rounded-md border-slate-300 focus:ring-primary-500"
                          />
                          <div>
                            <span className="text-[15px] font-bold text-slate-900 block">Nhận thông báo qua Email</span>
                            <span className="text-xs text-slate-500 font-medium">Cảnh báo sức khỏe định kỳ</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </motion.form>
                )}

                {/* TAB 5: SECURITY */}
                {activeTab === "security" && (
                  <motion.div
                    key="security"
                    variants={tabVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-6"
                  >
                    <div className="pb-5 border-b border-slate-100">
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">Bảo mật tài khoản</h3>
                      <p className="text-sm text-slate-500 font-medium">Cập nhật mật khẩu bảo vệ dữ liệu y tế</p>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
                      <Input
                        label="Mật khẩu hiện tại"
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Nhập mật khẩu cũ"
                        leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                      />
                      <Input
                        label="Mật khẩu mới"
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Ít nhất 6 ký tự"
                        leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                      />
                      <Input
                        label="Xác nhận mật khẩu mới"
                        type="password"
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                      />
                      <div className="pt-2">
                        <Button
                          variant="primary"
                          type="submit"
                          size="md"
                          isLoading={savingPassword}
                          leftIcon={<ShieldCheck className="w-4 h-4" />}
                        >
                          Cập nhật mật khẩu
                        </Button>
                      </div>
                    </form>

                    <div className="p-5 rounded-xl bg-slate-50/80 border border-slate-100 text-sm text-slate-600 font-medium space-y-2 mt-8 max-w-md">
                      <div className="flex items-center gap-2 font-bold text-slate-900 mb-3 text-[15px]">
                        <ShieldCheck className="w-5 h-5 text-primary-600" /> Hệ thống bảo mật
                      </div>
                      <p>• Mã hóa mật khẩu chuẩn công nghiệp Bcrypt.</p>
                      <p>• Chống tấn công brute-force tự động khóa sau 5 lần thử sai.</p>
                      <p>• Tự động đăng xuất sau thời gian dài không hoạt động.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
