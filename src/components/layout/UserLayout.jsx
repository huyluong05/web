import React, { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import { UserSidebar } from "./UserSidebar";
import { MobileNav } from "./MobileNav";
import { useAuditPageTracker } from "../../hooks/useAuditPageTracker";
import { useAuth } from "../../context/AuthContext";
import { remindersApi } from "../../api/client";
import {
  LayoutDashboard,
  Activity,
  Brain,
  Wifi,
  LineChart,
  Target,
  BellRing,
  User as UserIcon,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Droplets,
  HeartPulse,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const UserLayout = ({ children }) => {
  useAuditPageTracker();
  const { user, logout, isAdmin } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [reminders, setReminders] = useState([]);
  const notificationRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const fetchReminders = async () => {
      const res = await remindersApi.getAll();
      if (res.success && res.data) {
        setReminders(res.data.filter((r) => r.is_active));
      }
    };
    fetchReminders();
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fullNavItems = [
    { label: "Tổng quan", path: "/dashboard", icon: LayoutDashboard },
    { label: "Chỉ số sinh tồn", path: "/health", icon: Activity },
    {
      label: "AI Chẩn đoán",
      path: "/ai-diagnostics",
      icon: Brain,
      badge: "AI",
    },
    { label: "Thiết bị kết nối", path: "/devices", icon: Wifi },
    { label: "Báo cáo & Phân tích", path: "/analytics", icon: LineChart },
    { label: "Mục tiêu sức khỏe", path: "/goals", icon: Target },
    { label: "Nhắc nhở y tế", path: "/reminders", icon: BellRing },
    { label: "Hồ sơ cá nhân", path: "/profile", icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans overflow-hidden">
      <div className="hidden md:block">
        <UserSidebar />
      </div>

      <header className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 py-3 flex items-center justify-between shadow-xs">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm shadow-primary-900/20">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            VitalTrack
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="relative ml-auto w-[85%] max-w-sm bg-white h-full shadow-2xl flex flex-col p-5 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm shadow-primary-900/20">
                    <HeartPulse className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold tracking-tight text-slate-900">
                    VitalTrack
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors bg-slate-50 border border-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 flex-1">
                {fullNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary-50 text-primary-700 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`
                    }
                  >
                    <item.icon
                      className={`w-4 h-4 shrink-0 ${
                        item.path === location.pathname ? "text-primary-600" : "text-slate-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100">
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center justify-center gap-2 px-3 py-3 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Đăng xuất
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full relative h-screen overflow-y-auto custom-scrollbar">
        {/* Top Header on Desktop */}
        <div className="hidden md:flex h-16 items-center justify-end px-6 bg-white sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-lg transition-all duration-200 ${
                  showNotifications
                    ? "bg-slate-100 text-slate-900 shadow-[inset_0_0_0_1px_rgba(203,213,225,1)]"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <BellRing className="w-4 h-4" />
                {reminders.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary-600 rounded-full ring-2 ring-white"></span>
                )}
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-full right-0 mt-3 w-80 bg-white rounded-xl shadow-lg border border-slate-200/80 overflow-hidden z-50 origin-top-right"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                      <h3 className="font-semibold text-slate-900 text-sm">
                        Thông báo
                      </h3>
                      <span className="text-[10px] font-semibold text-primary-700 bg-primary-50 border border-primary-200/60 px-2 py-0.5 rounded-md">
                        {reminders.length} mới
                      </span>
                    </div>
                    
                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar p-1.5">
                      {reminders.length === 0 ? (
                        <div className="p-6 text-center flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                             <BellRing className="w-4 h-4" />
                          </div>
                          <p className="text-slate-500 text-xs font-medium">
                            Không có thông báo mới.
                          </p>
                        </div>
                      ) : (
                        reminders.map((rem, idx) => (
                          <Link
                            key={idx}
                            to="/reminders"
                            onClick={() => setShowNotifications(false)}
                            className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 border border-primary-100">
                              {rem.type === "water" ? (
                                <Droplets className="w-4 h-4" />
                              ) : (
                                <Activity className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-900 group-hover:text-primary-600 transition-colors">
                                {rem.title}
                              </p>
                              <p className="text-[10px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-primary-400"></span>
                                Lúc: {rem.time_of_day}
                              </p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                    
                    <div className="p-2 border-t border-slate-100 bg-slate-50/80 text-center">
                      <Link
                        to="/reminders"
                        onClick={() => setShowNotifications(false)}
                        className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 block p-1.5 rounded-md hover:bg-primary-50 transition-colors"
                      >
                        Xem tất cả nhắc nhở
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <Link
              to="/profile"
              className="flex items-center gap-2 p-1.5 pr-4 hover:bg-slate-50 rounded-lg transition-all duration-200 border border-transparent hover:border-slate-200 hover:shadow-xs group"
            >
              <div className="w-7 h-7 rounded-md bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs border border-primary-200/50 shadow-xs group-hover:shadow-sm">
                {user?.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                {user?.full_name}
              </span>
            </Link>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 w-full pb-24 md:pb-12">
          {children || (
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
      <MobileNav onOpenMenu={() => setMobileDrawerOpen(true)} />
    </div>
  );
};
