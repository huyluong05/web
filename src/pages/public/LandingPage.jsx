import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { PublicNavbar } from "../../components/layout/PublicNavbar";
import { PublicFooter } from "../../components/layout/PublicFooter";
import { Button } from "../../components/common/Button";
import {
  Activity,
  Target,
  ArrowRight,
  TrendingUp,
  HeartPulse,
  ShieldCheck,
  Zap,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export const LandingPage = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.substring(1);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [location]);

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans overflow-hidden">
      <PublicNavbar />
      {/* HERO SECTION - Premium Split Layout with Mesh Gradient */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Abstract Mesh Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary-400/15 blur-[100px] mix-blend-multiply" />
          <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-400/15 blur-[120px] mix-blend-multiply" />
          <div className="absolute bottom-[-20%] right-[20%] w-[800px] h-[800px] rounded-full bg-indigo-400/10 blur-[150px] mix-blend-multiply" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-12">
            {/* Left Text */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="w-full lg:w-[55%] text-center lg:text-left"
            >
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-100 text-[11px] font-bold uppercase tracking-wider mb-8 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                <span>Nền tảng Quản lý sức khỏe AI 2.0</span>
              </motion.div>
              <motion.h1
                variants={fadeUp}
                className="text-5xl sm:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.15] mb-6 text-slate-900"
              >
                Làm chủ <br className="hidden sm:inline" />
                <span className="text-gradient">sức khỏe của bạn</span>
                <br /> mỗi ngày.
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="text-lg sm:text-xl text-slate-500 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium"
              >
                VitalTrack cung cấp cái nhìn toàn cảnh về cơ thể bạn thông qua
                dữ liệu thông minh, cảnh báo sớm và phân tích cá nhân hóa.
              </motion.p>
              <motion.div
                variants={fadeUp}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6"
              >
                <Link to="/register" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto px-8 h-12 text-base rounded-lg"
                  >
                    Bắt đầu miễn phí
                  </Button>
                </Link>
                <Link
                  to="/guide"
                  className="w-full sm:w-auto text-slate-600 hover:text-primary-600 font-semibold px-4 py-2 transition-colors flex items-center justify-center gap-2 group"
                >
                  Khám phá tính năng
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
              <motion.div
                variants={fadeUp}
                className="mt-12 pt-8 border-t border-slate-200/60 flex flex-wrap justify-center lg:justify-start gap-6 sm:gap-10 text-sm text-slate-500 font-semibold"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" /> Bảo mật
                  chuẩn Y tế
                </span>
                <span className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" /> Dữ liệu Real-time
                </span>
              </motion.div>
            </motion.div>

            {/* Right Visual - Premium Glass Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="w-full lg:w-[45%] relative"
            >
              <div className="relative glass-dark rounded-2xl p-2 shadow-2xl shadow-slate-900/10 transform md:rotate-2 hover:rotate-0 transition-transform duration-500 border border-slate-200/50 bg-white/40">
                <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-white">
                  {/* Mockup Header */}
                  <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-lg">V</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                          Vital Dashboard
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Cập nhật lúc 08:30 sáng
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-rose-400" />
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    </div>
                  </div>

                  {/* Mockup Content */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <motion.div
                        whileHover={{ y: -4 }}
                        className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm"
                      >
                        <HeartPulse className="w-6 h-6 text-rose-500 mb-4" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Huyết áp
                        </p>
                        <p className="text-3xl font-bold text-slate-900 tracking-tight">
                          118
                          <span className="text-sm font-semibold text-slate-400 ml-0.5">
                            /76
                          </span>
                        </p>
                        <div className="mt-3 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md inline-block tracking-wide">
                          BÌNH THƯỜNG
                        </div>
                      </motion.div>
                      <motion.div
                        whileHover={{ y: -4 }}
                        className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm"
                      >
                        <Activity className="w-6 h-6 text-primary-500 mb-4" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Nhịp tim
                        </p>
                        <p className="text-3xl font-bold text-slate-900 tracking-tight">
                          72
                          <span className="text-sm font-semibold text-slate-400 ml-1">
                            bpm
                          </span>
                        </p>
                        <div className="mt-3 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md inline-block tracking-wide">
                          TUYỆT VỜI
                        </div>
                      </motion.div>
                    </div>

                    {/* Fake Chart */}
                    <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-200/60">
                      <div className="flex justify-between items-center mb-6">
                        <p className="text-sm font-bold text-slate-700">
                          Xu hướng tuần
                        </p>
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="h-28 flex items-end gap-2 sm:gap-3">
                        {[40, 50, 45, 60, 55, 75, 65, 80, 90, 85].map(
                          (h, i) => (
                            <motion.div
                              key={i}
                              initial={{ height: 0 }}
                              animate={{ height: `${h}%` }}
                              transition={{
                                delay: 0.8 + i * 0.05,
                                duration: 0.5,
                                ease: "easeOut",
                              }}
                              className={`flex-1 rounded-sm relative group transition-colors duration-300 ${i === 9 ? "bg-primary-500" : "bg-primary-100"}`}
                            >
                              {i === 9 && (
                                <div className="absolute -top-3 inset-x-0 flex justify-center">
                                  <div className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-ping" />
                                </div>
                              )}
                            </motion.div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating element */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -bottom-6 -left-10 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200/60 flex items-center gap-4 z-20"
              >
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Mục tiêu đạt được!
                  </p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Chuỗi 7 ngày liên tiếp
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURES - Premium Grid */}
      <section
        className="py-24 bg-white relative z-10 border-t border-slate-100"
        id="features"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-[11px] font-bold tracking-widest text-primary-600 uppercase mb-3">
              Tính năng Cốt lõi
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-6">
              Thiết kế cho sức khỏe của bạn.
            </h3>
            <p className="text-lg text-slate-500 font-medium">
              Công cụ mạnh mẽ nhưng dễ sử dụng, giúp bạn dễ dàng theo dõi và cải
              thiện các chỉ số sức khỏe quan trọng nhất.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <TrendingUp className="w-7 h-7 text-primary-600" />,
                title: "Phân tích & Biểu đồ",
                desc: "Hệ thống tự động vẽ biểu đồ và tìm ra xu hướng từ dữ liệu sức khỏe của bạn, giúp bạn hiểu rõ cơ thể mình hơn.",
                color: "bg-primary-50 border-primary-100",
              },
              {
                icon: <Target className="w-7 h-7 text-emerald-600" />,
                title: "Theo dõi Mục tiêu",
                desc: "Đặt mục tiêu cho cân nặng hoặc vận động. Chúng tôi sẽ nhắc nhở và đánh giá tiến độ của bạn mỗi ngày.",
                color: "bg-emerald-50 border-emerald-100",
              },
              {
                icon: <Sparkles className="w-7 h-7 text-indigo-600" />,
                title: "Chẩn đoán AI (Sắp ra mắt)",
                desc: "Tích hợp mô hình AI thông minh giúp đưa ra lời khuyên cá nhân hóa dựa trên lịch sử sức khỏe của riêng bạn.",
                color: "bg-indigo-50 border-indigo-100",
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
                className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-lg transition-shadow group"
              >
                <div
                  className={`w-14 h-14 ${feature.color} border rounded-xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300`}
                >
                  {feature.icon}
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-4">
                  {feature.title}
                </h4>
                <p className="text-slate-500 leading-relaxed font-medium text-sm">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="py-24 bg-slate-50/50 relative z-10 border-t border-slate-100/60" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-[11px] font-bold tracking-widest text-primary-600 uppercase mb-3">
              Cách hoạt động
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-6">
              Bắt đầu dễ dàng trong 3 bước.
            </h3>
            <p className="text-lg text-slate-500 font-medium">
              Trải nghiệm liền mạch từ lúc đăng ký đến khi nhận được những cảnh
              báo sức khỏe đầu tiên của bạn.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Line for desktop */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-slate-200/50 via-primary-300 to-slate-200/50 z-0"></div>

            {[
              {
                step: "01",
                title: "Tạo tài khoản",
                desc: "Đăng ký nhanh chóng và điền các thông tin sức khỏe cơ bản của bạn.",
              },
              {
                step: "02",
                title: "Kết nối thiết bị & Nhập liệu",
                desc: "Đồng bộ dữ liệu từ thiết bị y tế hoặc nhập thủ công chỉ số hàng ngày.",
              },
              {
                step: "03",
                title: "Nhận cảnh báo & Lời khuyên",
                desc: "Hệ thống tự động phân tích và đưa ra cảnh báo sớm nếu có bất thường.",
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -8 }}
                className="relative z-10 bg-white p-8 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center group"
              >
                <div className="w-16 h-16 bg-white text-primary-600 rounded-2xl flex items-center justify-center font-bold text-xl mb-6 border border-slate-200 shadow-sm group-hover:scale-110 transition-transform">
                  {item.step}
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-3">
                  {item.title}
                </h4>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Gradient Banner */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative z-10 border-t border-slate-100/60">
        <div className="max-w-5xl mx-auto bg-slate-950 rounded-[2.5rem] p-12 sm:p-16 lg:p-20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/20 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-[80px]" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6 leading-tight">
              Sẵn sàng làm chủ sức khỏe?
            </h2>
            <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto font-medium">
              Tham gia cùng hàng ngàn người dùng khác đang cải thiện chất lượng
              cuộc sống mỗi ngày với VitalTrack.
            </p>
            <Link to="/register">
              <Button
                variant="primary"
                size="lg"
                className="px-10 h-12 text-base rounded-lg text-white border-0 bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-600/30"
              >
                Tạo tài khoản miễn phí
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};
