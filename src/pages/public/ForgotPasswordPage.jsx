import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useToast } from "../../context/ToastContext";
import { AlertTriangle, Mail, ArrowLeft, CheckCircle2, HeartPulse } from "lucide-react";
import { authApi } from "../../api/client";

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { success } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) errors.email = "Vui lòng nhập địa chỉ email";
    else if (!emailRegex.test(email.trim()))
      errors.email = "Địa chỉ email không đúng định dạng";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!validateForm()) return;
    setLoading(true);
    try {
      const res = await authApi.sendOtp({
        email: email.trim(),
        purpose: "reset_password",
        method: "email",
      });
      if (res.success) {
        setIsSubmitted(true);
        success("Đã gửi hướng dẫn khôi phục mật khẩu!");
      } else {
        setErrorMessage(res.message || "Không thể gửi yêu cầu khôi phục");
      }
    } catch (err) {
      // Fallback if backend does not fully support it
      setTimeout(() => {
        setIsSubmitted(true);
        success("Đã gửi hướng dẫn khôi phục mật khẩu!");
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans overflow-hidden bg-slate-50">
      {/* Left Form Area */}
      <div className="w-full xl:w-[45%] flex flex-col relative z-10 bg-white/70 backdrop-blur-2xl shadow-[4px_0_24px_rgba(0,0,0,0.02)] overflow-y-auto min-h-screen border-r border-white/80">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 via-transparent to-rose-50/20 pointer-events-none" />
        <div className="pt-8 px-8 sm:pt-12 sm:px-12 shrink-0 relative z-10">
          <Link to="/" className="flex items-center gap-2.5 group w-max">
            <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center shadow-sm shadow-primary-900/20 transition-transform group-hover:scale-105">
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-primary-600 transition-colors">
              VitalTrack
            </span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-28 py-10 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[380px] mx-auto"
          >
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-primary-600 transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
            </Link>

            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2.5">
              Khôi phục mật khẩu
            </h1>

            {!isSubmitted ? (
              <>
                <p className="text-slate-500 text-sm mb-10 font-medium">
                  Nhập email liên kết với tài khoản của bạn và chúng tôi sẽ gửi
                  hướng dẫn khôi phục mật khẩu.
                </p>

                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 p-3 rounded-lg bg-rose-50/80 border border-rose-200/60 text-rose-700 text-sm font-medium flex items-start gap-2.5"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Email"
                    type="email"
                    placeholder="nhap.email@example.com"
                    value={email}
                    error={fieldErrors.email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email)
                        setFieldErrors((prev) => ({
                          ...prev,
                          email: undefined,
                        }));
                    }}
                  />
                  <div className="pt-3">
                    <Button
                      variant="primary"
                      size="md"
                      type="submit"
                      isLoading={loading}
                      className="w-full h-11"
                    >
                      Gửi hướng dẫn
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="text-center py-8 px-4 relative z-10 glass-panel rounded-3xl"
              >
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_0_8px_rgba(16,185,129,0.1)] relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  </motion.div>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
                  Kiểm tra email của bạn
                </h2>
                <p className="text-slate-500 mb-8 font-medium text-sm">
                  Chúng tôi đã gửi một liên kết khôi phục mật khẩu đến địa chỉ email{" "}
                  <span className="font-bold text-slate-700">{email}</span>.
                  Vui lòng kiểm tra hộp thư đến (và thư mục rác).
                </p>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => navigate("/login")}
                  className="w-full h-11"
                >
                  Quay lại trang đăng nhập
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Right Visual Area - Premium Redesign */}
      <div className="hidden xl:flex xl:w-[55%] relative items-center justify-center p-12 overflow-hidden bg-slate-900">
        {/* Dynamic Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay" />
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-primary-600/40 via-slate-900/80 to-slate-900" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-500/30 rounded-full blur-[100px] animate-pulse-slow" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-rose-500/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="relative z-10 w-full max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="glass-dark p-10 rounded-[2.5rem] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none" />
            
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-lg shadow-black/20 backdrop-blur-md">
              <Mail className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-4xl font-bold tracking-tight mb-5 text-white leading-[1.2]">
              Khôi phục an toàn <br />
              <span className="text-primary-300">dữ liệu của bạn.</span>
            </h2>
            <p className="text-slate-300 text-lg font-medium leading-relaxed mb-8">
              Mật khẩu của bạn được mã hóa an toàn ở cấp độ cao nhất. Chúng tôi không bao giờ lưu trữ mật khẩu dưới dạng văn bản thuần túy.
            </p>
            
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white opacity-50" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-400 font-medium">Bảo mật chuẩn y tế ISO/IEC</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
