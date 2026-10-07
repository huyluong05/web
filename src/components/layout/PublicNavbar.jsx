import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../common/Button";
import {
  ArrowRight,
  LayoutDashboard,
  Menu,
  X,
  BookOpen,
  Sparkles,
  Activity,
  HeartPulse,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const PublicNavbar = () => {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`w-full fixed top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/60 py-3 shadow-xs"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center transition-colors shadow-sm shadow-primary-900/20">
            <HeartPulse className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-primary-600 transition-colors">
            VitalTrack
          </span>
        </Link>

        {/* Center Links (Desktop) */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <NavLink
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={({ isActive }) =>
              `relative py-2 transition-colors ${
                isActive ? "text-primary-600 font-semibold" : "hover:text-slate-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                Trang chủ
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary-600 rounded-t-full"
                  />
                )}
              </>
            )}
          </NavLink>
          <Link to="/#features" className="hover:text-slate-900 transition-colors">
            Tính năng
          </Link>
          <Link to="/#how-it-works" className="hover:text-slate-900 transition-colors">
            Cách hoạt động
          </Link>
          <NavLink
            to="/guide"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 transition-colors ${
                isActive ? "text-primary-600 font-semibold" : "hover:text-slate-900"
              }`
            }
          >
            <BookOpen className="w-4 h-4" /> <span>Hướng dẫn</span>
          </NavLink>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button
                variant="primary"
                size="md"
                leftIcon={<LayoutDashboard className="w-4 h-4" />}
                className="hidden sm:inline-flex"
              >
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Đăng nhập
              </Link>
              <Link to="/register">
                <Button
                  variant="primary"
                  size="md"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="hidden sm:inline-flex "
                >
                  Bắt đầu ngay
                </Button>
              </Link>
            </>
          )}

          {/* Mobile Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            className="md:hidden p-2 -mr-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200/60 shadow-lg py-4 px-4 flex flex-col gap-2 overflow-hidden"
          >
            <NavLink
              to="/"
              onClick={() => {
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-slate-50 text-primary-600" : "text-slate-700 hover:bg-slate-50"
                }`
              }
            >
              <Sparkles className="w-4 h-4 text-slate-500" />
              <span>Trang chủ</span>
            </NavLink>
            <Link
              to="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Activity className="w-4 h-4 text-slate-500" />
              <span>Tính năng cốt lõi</span>
            </Link>
            <Link
              to="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Activity className="w-4 h-4 text-slate-500" />
              <span>Cách hoạt động</span>
            </Link>
            <NavLink
              to="/guide"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-slate-50 text-primary-600" : "text-slate-700 hover:bg-slate-50"
                }`
              }
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              <span>Hướng dẫn</span>
            </NavLink>

            <div className="h-px bg-slate-100 my-2" />

            {!isAuthenticated ? (
              <div className="flex flex-col gap-2.5">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-center h-11">
                    Đăng nhập
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full justify-center h-11">
                    Tạo tài khoản miễn phí
                  </Button>
                </Link>
              </div>
            ) : (
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" className="w-full justify-center h-11">
                  Vào Dashboard
                </Button>
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
