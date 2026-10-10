import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  LineChart,
  Target,
  BellRing,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Brain,
  Wifi,
  HeartPulse,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { motion } from "motion/react";

export const UserSidebar = () => {
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { label: "Tổng quan", path: "/dashboard", icon: LayoutDashboard },
    { label: "Chỉ số sinh tồn", path: "/health", icon: Activity },
    {
      label: "AI Phân tích",
      path: "/ai-diagnostics",
      icon: Brain,
      badge: "AI",
    },
    { label: "Thiết bị kết nối", path: "/devices", icon: Wifi },
    { label: "Báo cáo & Phân tích", path: "/analytics", icon: LineChart },
    { label: "Mục tiêu sức khỏe", path: "/goals", icon: Target },
    { label: "Nhắc nhở y tế", path: "/reminders", icon: BellRing },
  ];

  return (
    <aside className="w-[260px] bg-white flex flex-col h-screen sticky top-0 shrink-0 select-none z-20 overflow-hidden">
      {/* Brand */}
      <div className="h-16 flex items-center px-6">
        <NavLink to="/dashboard" className="flex items-center gap-3 w-full group">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm shadow-primary-900/20">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-primary-600 transition-colors">
            VitalTrack
          </span>
        </NavLink>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Tính năng chính
        </p>

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 ease-out ${
                isActive
                  ? "bg-primary-50 text-primary-700 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-primary-600" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-100 text-indigo-700 tracking-wider">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        <div className="pt-2 mt-2">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 ease-out ${
                isActive
                  ? "bg-primary-50 text-primary-700 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <UserIcon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-primary-600" : "text-slate-400"
                  }`}
                />
                <span className="flex-1 text-left">Hồ sơ cá nhân</span>
              </>
            )}
          </NavLink>
        </div>

        {isAdmin && (
          <div className="pt-2 mt-2">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
              Quản trị
            </p>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white/50 text-slate-700 hover:bg-white/80 border border-white/40 hover:border-white shadow-xs"
                }`
              }
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Quản trị hệ thống</span>
            </NavLink>
          </div>
        )}
      </div>

      {/* User Profile */}
      <div className="p-4 bg-slate-50/50">
        <div className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-xs group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-primary-100 border border-primary-200/50 flex items-center justify-center font-bold text-primary-700 text-sm shrink-0">
              {user?.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="text-sm min-w-0">
              <p className="text-slate-900 font-semibold truncate">
                {user?.full_name || "Người dùng"}
              </p>
              <p className="text-slate-500 text-xs font-medium truncate mt-0.5">
                {user?.role === "admin" ? "Quản trị viên" : "Bệnh nhân"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Đăng xuất"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors shrink-0 md:opacity-0 group-hover:opacity-100"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
