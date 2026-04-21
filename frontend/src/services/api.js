import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("idToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  signup: (payload) => api.post("/auth/signup", payload),
  login: (payload) => api.post("/auth/login", payload),
  me: () => api.get("/auth/me"),
  linkUser: (targetUserId) => api.post("/auth/link-user", { targetUserId }),
};

export const medicineApi = {
  addMedicine: (payload) => api.post("/medicines/add-medicine", payload),
  getMedicines: (targetUserId) => api.get("/medicines", { params: { targetUserId } }),
  updateMedicine: (medicineId, payload) => api.put(`/medicines/${medicineId}`, payload),
  deleteMedicine: (medicineId) => api.delete(`/medicines/${medicineId}`),
  updateStatus: (medicineId, payload) => api.post(`/medicines/${medicineId}/dispense`, payload),
};

export const scheduleApi = {
  createSchedule: (payload) => api.post("/schedules", payload),
  getSchedule: (targetUserId) => api.get("/schedules/get-schedule", { params: { targetUserId } }),
  updateSchedule: (scheduleId, payload) => api.put(`/schedules/${scheduleId}`, payload),
  deleteSchedule: (scheduleId) => api.delete(`/schedules/${scheduleId}`),
  getNextSchedule: (targetUserId) => api.get("/schedules/next", { params: { targetUserId } }),
};

export const logApi = {
  updateStatus: (payload) => api.post("/logs/update-status", payload),
  getLogs: (targetUserId) => api.get("/logs/logs", { params: { targetUserId } }),
};

export const notificationApi = {
  getNotifications: (targetUserId) => api.get("/notifications", { params: { targetUserId } }),
  createNotification: (payload) => api.post("/notifications", payload),
  markRead: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
};

export const dashboardApi = {
  getSummary: (targetUserId) => api.get("/dashboard/summary", { params: { targetUserId } }),
};

export default api;
