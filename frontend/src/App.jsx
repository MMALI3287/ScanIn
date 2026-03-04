import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DarkModeProvider } from "./contexts/DarkModeContext";
import ProtectedRoute from "./components/ProtectedRoute";

const KioskPage = lazy(() => import("./pages/KioskPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const UserHistoryPage = lazy(() => import("./pages/UserHistoryPage"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminHistory = lazy(() => import("./pages/AdminHistory"));
const AdminTrainees = lazy(() => import("./pages/AdminTrainees"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));

function App() {
  return (
    <DarkModeProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<KioskPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/history" element={<UserHistoryPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/history"
              element={
                <ProtectedRoute>
                  <AdminHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/trainees"
              element={
                <ProtectedRoute>
                  <AdminTrainees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute>
                  <AdminReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DarkModeProvider>
  );
}

export default App;
