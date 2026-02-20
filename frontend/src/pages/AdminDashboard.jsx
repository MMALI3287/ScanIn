import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAttendance } from "../services/api";
import AttendanceTable from "../components/AttendanceTable";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetchToday();
  }, []);

  const fetchToday = async () => {
    try {
      const res = await getAttendance({ date: today });
      setRecords(res.data.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("attendance_token");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("attendance_token");
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
        <div className="flex gap-4 text-sm">
          <a href="/admin/dashboard" className="text-blue-600 font-medium">
            Today
          </a>
          <a
            href="/admin/history"
            className="text-gray-600 hover:text-blue-600"
          >
            History
          </a>
          <a
            href="/admin/trainees"
            className="text-gray-600 hover:text-blue-600"
          >
            Trainees
          </a>
          <a
            href="/admin/reports"
            className="text-gray-600 hover:text-blue-600"
          >
            Reports
          </a>
          <a
            href="/admin/settings"
            className="text-gray-600 hover:text-blue-600"
          >
            Settings
          </a>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:underline"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Today's Attendance — {today}
        </h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <AttendanceTable records={records} />
        )}
      </div>
    </div>
  );
}
