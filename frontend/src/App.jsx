import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DarkModeProvider } from "./DarkModeContext";
import KioskPage from "./pages/KioskPage";
import RegisterPage from "./pages/RegisterPage";
import UserHistoryPage from "./pages/UserHistoryPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminHistory from "./pages/AdminHistory";
import AdminTrainees from "./pages/AdminTrainees";
import AdminReports from "./pages/AdminReports";
import AdminSettings from "./pages/AdminSettings";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <DarkModeProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </DarkModeProvider>
  );
}

export default App;
