import React from "react";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AdminRoute } from "./AdminRoute";
import { UserLayout } from "../components/layout/UserLayout";
import { AdminLayout } from "../components/layout/AdminLayout";
// Public Pages
import { LandingPage } from "../pages/public/LandingPage";
import { GuidePage } from "../pages/public/GuidePage";
import { LoginPage } from "../pages/public/LoginPage";
import { RegisterPage } from "../pages/public/RegisterPage";
import { ForgotPasswordPage } from "../pages/public/ForgotPasswordPage";
import { NotFoundPage } from "../pages/public/NotFoundPage";
// User Pages
import { DashboardPage } from "../pages/user/DashboardPage";
import { HealthMetricsPage } from "../pages/user/HealthMetricsPage";
import { AnalyticsPage } from "../pages/user/AnalyticsPage";
import { GoalsPage } from "../pages/user/GoalsPage";
import { RemindersPage } from "../pages/user/RemindersPage";
import { ProfilePage } from "../pages/user/ProfilePage";
import { AIDiagnosticsPage } from "../pages/user/AIDiagnosticsPage";
import { DevicesPage } from "../pages/user/DevicesPage";
// Admin Pages
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage";
import { AdminTelemetryPage } from "../pages/admin/AdminTelemetryPage";
import { AdminAiReviewsPage } from "../pages/admin/AdminAiReviewsPage";
import { AdminDevicesPage } from "../pages/admin/AdminDevicesPage";
import { AdminLogsPage } from "../pages/admin/AdminLogsPage";
import { AdminAuditLogsPage } from "../pages/admin/AdminAuditLogsPage";
import { AdminSettingsPage } from "../pages/admin/AdminSettingsPage";
export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/guide" element={<GuidePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* User Dashboard & Portal */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <UserLayout>
              <DashboardPage />
            </UserLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/health"
        element={
          <ProtectedRoute>
            <UserLayout>
              <HealthMetricsPage />
            </UserLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-diagnostics"
        element={
          <ProtectedRoute>
            <UserLayout>
              <AIDiagnosticsPage />
            </UserLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/devices"
        element={
          <ProtectedRoute>
            <UserLayout>
              <DevicesPage />
            </UserLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <UserLayout>
              <AnalyticsPage />
            </UserLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/goals"
        element={
          <ProtectedRoute>
            <UserLayout>
              <GoalsPage />
            </UserLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reminders"
        element={
          <ProtectedRoute>
            <UserLayout>
              <RemindersPage />
            </UserLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <UserLayout>
              <ProfilePage />
            </UserLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Portal - Deep Management */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout>
              <AdminDashboardPage />
            </AdminLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminLayout>
              <AdminUsersPage />
            </AdminLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/telemetry"
        element={
          <AdminRoute>
            <AdminLayout>
              <AdminTelemetryPage />
            </AdminLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/ai-reviews"
        element={
          <AdminRoute>
            <AdminLayout>
              <AdminAiReviewsPage />
            </AdminLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/devices"
        element={
          <AdminRoute>
            <AdminLayout>
              <AdminDevicesPage />
            </AdminLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <AdminRoute>
            <AdminLayout>
              <AdminAuditLogsPage />
            </AdminLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <AdminRoute>
            <AdminLayout>
              <AdminLogsPage />
            </AdminLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <AdminLayout>
              <AdminSettingsPage />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
