import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

const api = axios.create({
  baseURL: API_BASE,
});

export const imageUrl = (path) => {
  if (!path) return null;
  if (!import.meta.env.VITE_API_URL) return path;
  const serverBase = import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, "");
  return `${serverBase}${path}`;
};

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
export const changePassword = (current_password, new_password) =>
  api.patch("/auth/password", { current_password, new_password });

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
export const identifyFace = (frame) =>
  api.post("/attendance/identify", { frame });

export const getAttendance = (params) => api.get("/attendance", { params });
export const getMyAttendance = (params) =>
  api.get("/attendance/my", { params });
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

export default api;
