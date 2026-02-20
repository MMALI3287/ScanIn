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
export const registerSelf = (unique_name, embeddings) =>
  api.post("/trainees/register-self", { unique_name, embeddings });
export const registerByAdmin = (unique_name, images) =>
  api.post("/trainees/register-admin", { unique_name, images });
export const deleteTrainee = (id) => api.delete(`/trainees/${id}`);

// Attendance
export const checkin = (frame) => api.post("/attendance/checkin", { frame });
export const checkout = (frame) => api.post("/attendance/checkout", { frame });
export const getAttendance = (params) => api.get("/attendance", { params });
export const patchAttendance = (id, data) =>
  api.patch(`/attendance/${id}`, data);

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
