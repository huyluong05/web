import { publishDataChange } from '../hooks/useDataSync';
// Standard API Base URL
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/+$/, "");
function getAuthHeader() {
  const token = localStorage.getItem("vitaltrack_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
const pendingReads = new Map();
function request(endpoint, options = {}) {
  if (options.method && options.method !== 'GET') return performRequest(endpoint, options);
  const key = `${getAuthHeader().Authorization || ''}:${endpoint}`;
  if (pendingReads.has(key)) return pendingReads.get(key);
  const promise = performRequest(endpoint, options).finally(() => { if (pendingReads.get(key) === promise) pendingReads.delete(key); });
  pendingReads.set(key, promise);
  return promise;
}
async function performRequest(endpoint, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...(options.headers || {}),
  };
  try {
    const url = `${API_BASE_URL}/${endpoint.replace(/^\/+/, "")}`;

    const res = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    const rawResponse = await res.text();

    let data;

    try {
      data = JSON.parse(rawResponse);
    } catch {
      data = {
        success: false,
        message: rawResponse || "Backend không trả về JSON hợp lệ",
      };
    }

    if (!res.ok) {
      if (res.status === 401 && !endpoint.startsWith('/auth/login') && headers.Authorization === getAuthHeader().Authorization) window.dispatchEvent(new Event('vitaltrack:auth-expired'));
      return { success: false, message: data.message || `Lỗi yêu cầu: ${res.status}`, status: res.status, code: data.code };
    }

    if (typeof data.success !== 'boolean') return { success: false, message: 'Response API không đúng định dạng.', status: res.status };
    if (data.success && options.method && options.method !== 'GET') {
      pendingReads.clear();
      let resource = endpoint.replace(/^\//, '').split('/')[0];
      if (/^\/admin\/telemetry/.test(endpoint) || /^\/devices\/(ingest|[^/]+\/sync)/.test(endpoint)) resource = 'health';
      publishDataChange(resource);
    }
    return { ...data, status: res.status };

  } catch (error) {
    return {
      success: false,
      message: error.name === 'AbortError' ? 'Máy chủ phản hồi chậm. Kiểm tra lại dữ liệu trước khi thử lưu lần nữa.' : error.message || "Lỗi kết nối máy chủ",
      status: 0,
    };
  } finally { clearTimeout(timeout); }
}
// ==========================================
// API SERVICES
// ==========================================
export const authApi = {
  login: (credentials) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
  logout: () =>
    request("/auth/logout", {
      method: "POST",
    }),
  register: (payload) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  socialLogin: (payload) =>
    request("/auth/social-login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  sendOtp: (payload) =>
    request("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyOtp: (payload) =>
    request("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMe: () => request("/auth/me"),
  updateProfile: (profileData) =>
    request("/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    }),
  updatePassword: (payload) =>
    request("/profile/password", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
export const healthApi = {
  getAll: (range) =>
    request(`/health${range && range !== "all" ? `?range=${range}` : ""}`),
  getLatest: () => request("/health/latest"),
  create: (record) =>
    request("/health", {
      method: "POST",
      body: JSON.stringify(record),
    }),
  update: (id, record) =>
    request(`/health/${id}`, {
      method: "PUT",
      body: JSON.stringify(record),
    }),
  delete: (id) =>
    request(`/health/${id}`, {
      method: "DELETE",
    }),
};
export const goalsApi = {
  getAll: () => request("/goals"),
  create: (goal) =>
    request("/goals", {
      method: "POST",
      body: JSON.stringify(goal),
    }),
  update: (id, goal) =>
    request(`/goals/${id}`, {
      method: "PUT",
      body: JSON.stringify(goal),
    }),
  delete: (id) =>
    request(`/goals/${id}`, {
      method: "DELETE",
    }),
};
export const remindersApi = {
  getAll: () => request("/reminders"),
  create: (reminder) =>
    request("/reminders", {
      method: "POST",
      body: JSON.stringify(reminder),
    }),
  update: (id, reminder) =>
    request(`/reminders/${id}`, {
      method: "PUT",
      body: JSON.stringify(reminder),
    }),
  delete: (id) =>
    request(`/reminders/${id}`, {
      method: "DELETE",
    }),
};
export const adminApi = {
  getDashboardStats: () => request("/admin/dashboard"),
  getSystemStatistics: (range) =>
    request(`/admin/statistics${range ? `?range=${range}` : ""}`),
  getUsers: (search) =>
    request(
      `/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),
  getUserDossier: (id) => request(`/admin/users/${id}/dossier`),
  createUser: (userData) =>
    request("/admin/users", {
      method: "POST",
      body: JSON.stringify(userData),
    }),
  updateUser: (id, userData) =>
    request(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    }),
  updateUserProfile: (id, userData) =>
    request(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    }),
  resetUserPassword: (id, newPassword) =>
    request(`/admin/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    }),
  deleteUser: (id) =>
    request(`/admin/users/${id}`, {
      method: "DELETE",
    }),
  updateUserStatus: (id, is_active) =>
    request(`/admin/users/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ is_active }),
    }),
  updateUserRole: (id, role) =>
    request(`/admin/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),
  getTelemetryRecords: (params) => {
    const query = new URLSearchParams();
    if (params?.userId) query.append("userId", String(params.userId));
    if (params?.riskCategory) query.append("riskCategory", params.riskCategory);
    if (params?.search) query.append("search", params.search);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    const qs = query.toString();
    return request(`/admin/telemetry${qs ? `?${qs}` : ""}`);
  },
  updateTelemetryRecord: (id, payload) =>
    request(`/admin/telemetry/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteTelemetryRecord: (id) =>
    request(`/admin/telemetry/${id}`, {
      method: "DELETE",
    }),
  getAiReviews: (params) => {
    const query = new URLSearchParams();
    if (params?.riskLevel) query.append("riskLevel", params.riskLevel);
    if (params?.search) query.append("search", params.search);
    const qs = query.toString();
    return request(`/admin/ai-reviews${qs ? `?${qs}` : ""}`);
  },
  getAiDiagnosisReviews: (params) => {
    const query = new URLSearchParams();
    if (params?.riskLevel) query.append("riskLevel", params.riskLevel);
    if (params?.search) query.append("search", params.search);
    const qs = query.toString();
    return request(`/admin/ai-reviews${qs ? `?${qs}` : ""}`);
  },
  reviewAiDiagnosis: (id, payload) =>
    request(`/admin/ai-reviews/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getAllDevices: () => request("/admin/devices"),
  deleteDevice: (deviceId) =>
    request(`/admin/devices/${deviceId}`, {
      method: "DELETE",
    }),
  removeDevice: (deviceId) =>
    request(`/admin/devices/${deviceId}`, {
      method: "DELETE",
    }),
  addDeviceForUser: (payload) =>
    request("/admin/devices", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getSystemSettings: () => request("/admin/settings"),
  updateSystemSettings: (settings) =>
    request("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  getSystemLogs: (params) => {
    const query = new URLSearchParams();
    if (params?.action) query.append("action", params.action);
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);
    if (params?.limit) query.append("limit", String(params.limit));
    const qs = query.toString();
    return request(`/admin/logs${qs ? `?${qs}` : ""}`);
  },
  getAuditLogs: (params) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.action && params.action !== "all")
      query.append("action", params.action);
    if (params?.module && params.module !== "all")
      query.append("module", params.module);
    if (params?.role && params.role !== "all")
      query.append("role", params.role);
    if (params?.status && params.status !== "all")
      query.append("status", params.status);
    if (params?.resourceType && params.resourceType !== "all")
      query.append("resourceType", params.resourceType);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    const qs = query.toString();
    return request(`/admin/audit-logs${qs ? `?${qs}` : ""}`);
  },
  getAuditLogDetail: (id) => request(`/admin/audit-logs/${id}`),
  getActiveSessions: () => request("/admin/sessions"),
  terminateSession: (sessionId) =>
    request(`/admin/sessions/${sessionId}`, {
      method: "DELETE",
    }),
  exportDatabase: () => request("/admin/export"),
  exportDatabaseSnapshot: () => request("/admin/export"),
};
// ==========================================
// AI DIAGNOSTICS & RECOMMENDATIONS API
// ==========================================
export const aiApi = {
  getDiagnosis: (payload) =>
    request("/ai/diagnose", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getHistory: () => request("/ai/history"),
  chatWithDoctor: (payload) =>
    request("/ai/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
// ==========================================
// CONNECTED PERIPHERAL / IOT HARDWARE API
// ==========================================
export const deviceApi = {
  getConnectedDevices: () => request("/devices"),
  pairDevice: (device) =>
    request("/devices/pair", {
      method: "POST",
      body: JSON.stringify(device),
    }),
  syncDevice: (deviceId) =>
    request(`/devices/${deviceId}/sync`, {
      method: "POST",
    }),
  disconnectDevice: (deviceId) =>
    request(`/devices/${deviceId}`, {
      method: "DELETE",
    }),
  ingestDeviceData: (payload) =>
    request("/devices/ingest", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
// ==========================================
// DATABASE & MYSQL MANAGEMENT API
// ==========================================
export const databaseApi = {
  getStatus: () => request("/database/status"),
};
// ==========================================
// USER ACTIVITY & TELEMETRY TRACKING API
// ==========================================
export const activityApi = {
  logPageView: (page, module, metadata = {}) =>
    request("/activity/page-view", {
      method: "POST",
      body: JSON.stringify({ page, module, metadata }),
    }),
};
