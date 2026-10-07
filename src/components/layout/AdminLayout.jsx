import React, { useState } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Activity,
  Bot,
  Cpu,
  ShieldCheck,
  Settings,
  ArrowLeft,
  LogOut,
  ClipboardList,
  Menu,
  X,
  HeartPulse,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAuditPageTracker } from "../../hooks/useAuditPageTracker";
import { motion, AnimatePresence } from "motion/react";

export const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useAuditPageTracker();

  const adminNavLinks = [
    {
      to: "/admin",
      end: true,
      label: "Thống kê Dashboard",
      icon: LayoutDashboard,
    },
    { to: "/admin/users", label: "Quản lý Bệnh nhân", icon: Users },
    { to: "/admin/telemetry", label: "Giám sát Sinh tồn", icon: Activity },
    { to: "/admin/ai-reviews", label: "Kiểm duyệt AI", icon: Bot },
    { to: "/admin/devices", label: "Thiết bị & IoT", icon: Cpu },
    {
      to: "/admin/audit-logs",
      label: "Nhật ký Kiểm toán",
      icon: ClipboardList,
    },
    { to: "/admin/logs", label: "Nhật ký Hoạt động", icon: ShieldCheck },
    { to: "/admin/settings", label: "Cài đặt Hệ thống", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row text-slate-900 font-sans antialiased overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5 text-white">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm shadow-primary-900/20">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Admin Console</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="relative w-[80%] max-w-sm bg-slate-950 h-full shadow-2xl flex flex-col p-5 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-5 border-b border-slate-800/60 mb-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                    <HeartPulse className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-bold tracking-tight">Admin Console</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5 flex-1">
                {adminNavLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary-600/15 text-primary-500 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>

              <div className="pt-5 border-t border-slate-800/60 mt-5">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center justify-center gap-2 px-3 py-3 text-sm font-medium text-slate-400 hover:text-rose-500 hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-800"
                >
                  <LogOut className="w-4 h-4" /> Đăng xuất
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Dark Admin Sidebar */}
      <aside className="hidden md:flex w-[260px] bg-slate-950 flex-col h-screen sticky top-0 shrink-0 overflow-hidden select-none z-20">
        <div className="h-16 flex items-center px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm shadow-primary-900/20">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white block leading-tight">
                VitalTrack
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block leading-tight">
                Admin Console
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Hệ thống
          </p>
          {adminNavLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-primary-600/15 text-primary-400 border border-primary-500/20 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.1)]"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent"
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="pt-2 mt-2">
            <NavLink
              to="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Quay lại User App</span>
            </NavLink>
          </div>
        </div>

        <div className="p-4 shrink-0 bg-slate-900/50">
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700/50 group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-md bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                A
              </div>
              <div className="text-sm truncate min-w-0">
                <p className="text-white font-medium truncate leading-tight">
                  {user?.full_name || "Admin"}
                </p>
                <p className="text-slate-500 text-[10px] uppercase tracking-wider mt-0.5">
                  Admin
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-slate-800 rounded-md transition-colors shrink-0 group-hover:opacity-100 md:opacity-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Admin Content Area */}
      <main className="flex-1 flex flex-col w-full h-screen overflow-y-auto custom-scrollbar">
        <div className="hidden md:flex h-16 items-center justify-end px-6 bg-white sticky top-0 z-10 shrink-0">
          <div className="text-sm font-medium text-slate-500 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-12">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
};
