import React from "react";
import { Link } from "react-router-dom";
export const PublicFooter = () => {
  return (
    <footer className="border-t border-slate-200 bg-white py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {" "}
      {/* Subtle background gradient pattern */}{" "}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent" />{" "}
      <div className="max-w-7xl mx-auto">
        {" "}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
          {" "}
          <div className="flex items-center gap-4">
            {" "}
            <div className="w-12 h-12 bg-primary-600 text-white rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-500/20">
              {" "}
              V{" "}
            </div>{" "}
            <div>
              {" "}
              <span className="text-2xl font-bold tracking-tighter text-slate-900">
                {" "}
                VitalTrack{" "}
              </span>{" "}
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Bảo vệ sức khỏe theo cách thông minh
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-semibold text-slate-600">
            {" "}
            <Link to="/" className="hover:text-primary-600 transition-colors">
              Trang chủ
            </Link>{" "}
            <Link
              to="/guide"
              className="hover:text-primary-600 transition-colors"
            >
              Hướng dẫn
            </Link>{" "}
            <Link
              to="/login"
              className="hover:text-primary-600 transition-colors"
            >
              Đăng nhập
            </Link>{" "}
            <Link
              to="/register"
              className="hover:text-primary-600 transition-colors"
            >
              Đăng ký
            </Link>{" "}
          </div>{" "}
        </div>{" "}
        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          {" "}
          <p className="text-sm text-slate-500 font-medium">
            {" "}
            © {new Date().getFullYear()} VitalTrack. Đồ án môn Lập trình
            Web.{" "}
          </p>{" "}
          <div className="flex items-center gap-4 text-sm text-slate-500">
            {" "}
            <span className="hover:text-slate-600 cursor-pointer transition-colors">
              Chính sách bảo mật
            </span>{" "}
            <span className="w-1 h-1 rounded-full bg-slate-300" />{" "}
            <span className="hover:text-slate-600 cursor-pointer transition-colors">
              Điều khoản dịch vụ
            </span>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </footer>
  );
};
