import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { AlternativeAuthModal } from "../../components/auth/AlternativeAuthModal";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Eye, EyeOff, AlertTriangle, Target, CheckCircle2, HeartPulse, Smartphone } from "lucide-react";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, socialLogin } = useAuth();
  const { success, error: toastError } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isAltAuthOpen, setIsAltAuthOpen] = useState(false);
  const [altAuthTab, setAltAuthTab] = useState("google");

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!fullName.trim()) errors.fullName = "Vui lòng nhập họ và tên";
    
    if (!email.trim()) errors.email = "Vui lòng nhập địa chỉ email";
    else if (!emailRegex.test(email.trim()))
      errors.email = "Địa chỉ email không đúng định dạng";
      
    if (!password) errors.password = "Vui lòng nhập mật khẩu";
    else if (password.length < 6)
      errors.password = "Mật khẩu phải có ít nhất 6 ký tự";
      
    if (!confirmPassword)
      errors.confirmPassword = "Vui lòng xác nhận lại mật khẩu";
    else if (password !== confirmPassword)
      errors.confirmPassword = "Mật khẩu xác nhận không khớp";
      
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!validateForm()) return;

    setLoading(true);
    const res = await register({
      full_name: fullName.trim(),
      email: email.trim(),
      password,
      confirm_password: confirmPassword,
    });
    setLoading(false);

    if (res.success) {
      success("Đăng ký tài khoản thành công! Chào mừng bạn đến với VitalTrack.");
      navigate("/dashboard", { replace: true });
    } else {
      setErrorMessage(res.message || "Đăng ký không thành công.");
      toastError(res.message || "Đăng ký thất bại");
    }
  };

  const handleAltAuthSuccess = () => navigate("/dashboard", { replace: true });

  return (
    <div className="min-h-screen flex bg-white font-sans overflow-hidden">
      {/* Left Form Area */}
      <div className="w-full xl:w-[45%] flex flex-col relative z-10 bg-white border-r border-slate-100/60 overflow-y-auto min-h-screen shadow-xl shadow-slate-200/20">
        <div className="pt-8 px-8 sm:pt-12 sm:px-12 shrink-0 flex xl:hidden">
          <Link to="/" className="flex items-center gap-2.5 group w-max">
            <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center shadow-sm shadow-primary-900/20 transition-transform group-hover:scale-105">
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-primary-600 transition-colors">
              VitalTrack
            </span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-20 py-10 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[380px] mx-auto"
          >
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2.5">
              Tạo tài khoản
            </h1>
            <p className="text-slate-500 text-sm mb-8 font-medium">
              Bắt đầu hành trình chăm sóc sức khỏe của bạn ngay hôm nay.
            </p>

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-3 rounded-lg bg-rose-50/80 border border-rose-200/60 text-rose-700 text-sm font-medium flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Họ và tên"
                placeholder="Nguyễn Văn A"
                value={fullName}
                error={fieldErrors.fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName)
                    setFieldErrors((prev) => ({
                      ...prev,
                      fullName: undefined,
                    }));
                }}
              />
              <Input
                label="Email"
                type="email"
                placeholder="nhap.email@example.com"
                value={email}
                error={fieldErrors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email)
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Mật khẩu"
                  type={showPassword ? "text" : "password"}
                  placeholder="Tối thiểu 6 ký tự"
                  value={password}
                  error={fieldErrors.password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password)
                      setFieldErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                  }}
                />
                <Input
                  label="Xác nhận mật khẩu"
                  type={showPassword ? "text" : "password"}
                  rightIcon={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                  placeholder="Nhập lại"
                  value={confirmPassword}
                  error={fieldErrors.confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword)
                      setFieldErrors((prev) => ({
                        ...prev,
                        confirmPassword: undefined,
                      }));
                  }}
                />
              </div>

              <div className="pt-3">
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  isLoading={loading}
                  className="w-full h-11"
                >
                  Đăng ký tài khoản
                </Button>
              </div>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <div className="h-px bg-slate-100 flex-1"></div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
                Hoặc tiếp tục với
              </span>
              <div className="h-px bg-slate-100 flex-1"></div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  const popup = window.open('https://accounts.google.com/o/oauth2/v2/auth?client_id=123456789-mockclient.apps.googleusercontent.com&redirect_uri=http://localhost:5173/callback&response_type=token&scope=email%20profile', 'GoogleLogin', 'width=500,height=600');
                  if (!popup) {
                    toastError("Vui lòng cho phép trình duyệt mở popup (Allow Popups) để tiếp tục!");
                    return;
                  }
                  const checkPopup = setInterval(async () => {
                    if (popup.closed) {
                      clearInterval(checkPopup);
                      setLoading(true);
                      try {
                        const res = await socialLogin({
                          provider: 'google',
                          email: 'huy393889@gmail.com',
                          full_name: 'Huy Nguyễn',
                          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                        });
                        if (res.success) {
                          success('Đăng ký/Đăng nhập Google thành công!');
                          navigate("/dashboard", { replace: true });
                        }
                      } finally {
                        setLoading(false);
                      }
                    }
                  }, 500);
                }}
                className="flex justify-center items-center gap-2 py-2.5 bg-white border border-slate-200/80 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-sm text-slate-700 shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  const popup = window.open('https://appleid.apple.com/auth/authorize?client_id=mock.apple.client&redirect_uri=http://localhost:5173/callback&response_type=code', 'AppleLogin', 'width=500,height=600');
                  if (!popup) {
                    toastError("Vui lòng cho phép trình duyệt mở popup (Allow Popups) để tiếp tục!");
                    return;
                  }
                  const checkPopup = setInterval(async () => {
                    if (popup.closed) {
                      clearInterval(checkPopup);
                      setLoading(true);
                      try {
                        const res = await socialLogin({
                          provider: 'apple',
                          email: 'privaterelay@appleid.com',
                          full_name: 'Người dùng Apple ID',
                        });
                        if (res.success) {
                          success('Đăng ký/Đăng nhập Apple thành công!');
                          navigate("/dashboard", { replace: true });
                        }
                      } finally {
                        setLoading(false);
                      }
                    }
                  }, 500);
                }}
                className="flex justify-center items-center gap-2 py-2.5 bg-white border border-slate-200/80 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-sm text-slate-700 shadow-xs"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.61 1.34-.56.64-1.04 1.71-.91 2.74 1 .08 2-.51 2.6-1.23z" />
                </svg>
                Apple
              </button>
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setAltAuthTab("otp");
                  setIsAltAuthOpen(true);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1.5 mx-auto"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Sử dụng Mã xác thực OTP (SMS)
              </button>
            </div>

            <p className="mt-8 text-center text-sm text-slate-500 font-medium">
              Đã có tài khoản?{" "}
              <Link
                to="/login"
                className="font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Visual Area */}
      <div className="hidden xl:flex xl:w-[55%] bg-slate-50/50 relative items-center justify-center p-12 overflow-hidden border-l border-slate-100">
        <div className="absolute top-10 left-10 z-20">
          <Link to="/" className="flex items-center gap-2.5 group w-max">
            <div className="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center shadow-sm shadow-primary-900/20 transition-transform group-hover:scale-105">
              <HeartPulse className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 group-hover:text-primary-600 transition-colors">
              VitalTrack
            </span>
          </Link>
        </div>

        {/* Abstract Background */}
        <div className="absolute inset-0 z-0 bg-slate-50/30">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-50/60 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-50/60 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        </div>

        <div className="relative z-10 w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-16 h-16 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-center mb-8">
              <Target className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-5 leading-[1.15]">
              Mục tiêu sức khỏe.
              <br />
              Chinh phục mỗi ngày.
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-10 font-medium">
              Gia nhập cộng đồng hơn 10.000+ người đang cải thiện chất lượng cuộc sống bằng cách ghi chép số liệu khoa học.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100/50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm font-bold text-slate-700">
                  Miễn phí 100% không quảng cáo
                </span>
              </div>
              <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100/50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm font-bold text-slate-700">
                  Bảo mật dữ liệu tuyệt đối
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <AlternativeAuthModal
        isOpen={isAltAuthOpen}
        onClose={() => setIsAltAuthOpen(false)}
        initialTab={altAuthTab}
        mode="register"
        onSuccess={handleAltAuthSuccess}
      />
    </div>
  );
};
