import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { activityApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

const routeModuleMap = {
  "/dashboard": "Dashboard",
  "/health": "Health Metrics",
  "/ai-diagnostics": "AI Diagnostics",
  "/devices": "Devices & IoT",
  "/analytics": "Analytics",
  "/goals": "Health Goals",
  "/reminders": "Medication Reminders",
  "/profile": "Profile & Settings",
  "/admin": "Admin Dashboard",
  "/admin/users": "User Management",
  "/admin/telemetry": "Telemetry Monitoring",
  "/admin/ai-reviews": "AI Review Console",
  "/admin/devices": "IoT Gateways",
  "/admin/logs": "System Logs",
  "/admin/audit-logs": "Audit Logs",
  "/admin/settings": "System Settings",
};

export const useAuditPageTracker = () => {
  const location = useLocation();
  const { user } = useAuth();
  const lastTrackedPath = useRef("");

  useEffect(() => {
    if (!user) return;
    const currentPath = location.pathname;
    if (currentPath === lastTrackedPath.current) return;

    lastTrackedPath.current = currentPath;
    const moduleName = routeModuleMap[currentPath] || "Navigation";

    // Fire and forget page view audit logging
    activityApi
      .logPageView(currentPath, moduleName, {
        search: location.search || undefined,
        user_role: user.role,
      })
      .catch(() => {
        // Silently handle if network error
      });
  }, [location.pathname, location.search, user]);
};
