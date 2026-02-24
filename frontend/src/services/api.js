import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("attendance_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (username, password) =>
  api.post("/auth/login", { username, password });

// Trainees
export const getTrainees = () => api.get("/trainees");
export const registerSelf = (unique_name, frames, email) => {
  const body = { unique_name, frames };
  if (email) body.email = email;
  return api.post("/trainees/register-self", body);
};
export const registerByAdmin = (unique_name, imageFiles, email) => {
  const form = new FormData();
  form.append("unique_name", unique_name);
  if (email) form.append("email", email);
  imageFiles.forEach((f) => form.append("images", f));
  return api.post("/trainees/register-admin", form);
};
export const deleteTrainee = (id) => api.delete(`/trainees/${id}`);

// Attendance
export const checkin = (frame) => api.post("/attendance/checkin", { frame });
export const checkout = (frame) => api.post("/attendance/checkout", { frame });

export const checkIn = (base64Frame) =>
  api.post("/attendance/checkin", { frame: base64Frame });

export const identifyFace = (base64Frame) =>
  api.post("/attendance/identify", { frame: base64Frame });

export const getAttendance = (params) => api.get("/attendance", { params });
export const getMyAttendance = (params) =>
  api.get("/attendance/my", { params });
export const getPublicHistory = (params) =>
  api.get("/attendance/history", { params });
export const getPublicTrainees = () => api.get("/trainees/public");
export const patchAttendance = (id, data) =>
  api.patch(`/attendance/${id}`, data);
export const deleteAttendance = (id) => api.delete(`/attendance/${id}`);

// Reports
export const exportReport = (format, from, to) =>
  api.get("/reports/export", {
    params: { format, from, to },
    responseType: "blob",
  });

// Settings
export const getSettings = () => api.get("/settings");
export const updateSetting = (key, value) =>
  api.patch("/settings", { key, value });

// Analytics
export const getWeeklyAnalytics = () => api.get("/analytics/weekly");

export default api;
