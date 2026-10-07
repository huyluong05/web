import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  Brain,
  LineChart,
  MoreHorizontal,
} from "lucide-react";
export const MobileNav = ({ onOpenMenu }) => {
  const items = [
    { label: "Tổng quan", path: "/dashboard", icon: LayoutDashboard },
    { label: "Chỉ số", path: "/health", icon: Activity },
    { label: "AI Y khoa", path: "/ai-diagnostics", icon: Brain },
    { label: "Biểu đồ", path: "/analytics", icon: LineChart },
  ];
  return (
    <nav
      aria-label="Điều hướng di động"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg select-none"
    >
      {" "}
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all min-h-[44px] ${isActive ? "text-indigo-700 bg-indigo-50/80 font-extrabold" : "text-slate-500 hover:text-slate-700"}`
          }
        >
          {" "}
          <item.icon className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 shrink-0" />{" "}
          <span className="truncate max-w-[64px] text-center leading-tight">
            {item.label}
          </span>{" "}
        </NavLink>
      ))}{" "}
      {/* 5th Tab: Menu Drawer Toggle */}{" "}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Xem thêm menu"
        className="flex flex-col items-center justify-center flex-1 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold text-slate-500 hover:text-slate-700 min-h-[44px] cursor-pointer transition-all"
      >
        {" "}
        <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 shrink-0" />{" "}
        <span className="truncate max-w-[64px] text-center leading-tight">
          Thêm
        </span>{" "}
      </button>{" "}
    </nav>
  );
};
