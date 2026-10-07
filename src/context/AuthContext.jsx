import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../api/client";
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() =>
    localStorage.getItem("vitaltrack_token"),
  );
  const [loading, setLoading] = useState(true);
  const refreshUser = async () => {
    const savedToken = localStorage.getItem("vitaltrack_token");
    if (!savedToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await authApi.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        localStorage.removeItem("vitaltrack_token");
        setUser(null);
        setToken(null);
      }
    } catch {
      localStorage.removeItem("vitaltrack_token");
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refreshUser();
  }, []);
  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    if (res.success && res.data) {
      localStorage.setItem("vitaltrack_token", res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true, message: res.message };
    }
    return {
      success: false,
      message: res.message || "Đăng nhập không thành công.",
    };
  };
  const register = async (payload) => {
    const res = await authApi.register(payload);
    if (res.success && res.data) {
      localStorage.setItem("vitaltrack_token", res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true, message: res.message };
    }
    return {
      success: false,
      message: res.message || "Đăng ký không thành công.",
    };
  };
  const socialLogin = async (payload) => {
    const res = await authApi.socialLogin(payload);
    if (res.success && res.data) {
      localStorage.setItem("vitaltrack_token", res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return {
        success: true,
        message: res.message,
        isNewUser: res.data.isNewUser,
      };
    }
    return {
      success: false,
      message: res.message || "Đăng nhập không thành công.",
    };
  };
  const sendOtp = async (identifier) => {
    const res = await authApi.sendOtp({ identifier });
    return res;
  };
  const verifyOtp = async (payload) => {
    const res = await authApi.verifyOtp(payload);
    if (res.success && res.data) {
      localStorage.setItem("vitaltrack_token", res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return {
        success: true,
        message: res.message,
        isNewUser: res.data.isNewUser,
      };
    }
    return {
      success: false,
      message: res.message || "Xác thực OTP không thành công.",
    };
  };
  const updateProfile = async (profileData) => {
    const res = await authApi.updateProfile(profileData);
    if (res.success && res.data) {
      setUser(res.data);
      return { success: true, message: res.message, data: res.data };
    }
    return {
      success: false,
      message: res.message || "Cập nhật hồ sơ thất bại.",
    };
  };
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem("vitaltrack_token");
      setToken(null);
      setUser(null);
    }
  };
  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === "admin",
    loading,
    login,
    register,
    socialLogin,
    sendOtp,
    verifyOtp,
    updateProfile,
    logout,
    refreshUser,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
