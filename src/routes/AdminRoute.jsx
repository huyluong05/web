import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading, authError, refreshUser } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFC] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (authError && !isAuthenticated) return <div role="alert" className="p-6 text-center"><p>{authError}</p><button className="mt-3 underline" onClick={refreshUser}>Thử lại phiên đăng nhập</button></div>;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};
