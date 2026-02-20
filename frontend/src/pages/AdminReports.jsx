import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { exportReport } from "../services/api";

export default function AdminReports() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExport = async (format) => {
    setLoading(true);
    try {
      const res = await exportReport(
        format,
        fromDate || undefined,
        toDate || undefined,
      );
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_report.${format === "excel" ? "xlsx" : "pdf"}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("attendance_token");
        navigate("/admin/login");
      } else {
        alert("Export failed.");
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
        <h1 className="text-xl font-bold text-gray-800">Export Reports</h1>
        <div className="flex gap-4 text-sm">
          <a
            href="/admin/dashboard"
            className="text-gray-600 hover:text-blue-600"
          >
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
          <a href="/admin/reports" className="text-blue-600 font-medium">
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

      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Select Date Range
          </h2>

          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => handleExport("excel")}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 rounded-lg transition"
            >
              {loading ? "Exporting..." : "Export Excel"}
            </button>
            <button
              onClick={() => handleExport("pdf")}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 rounded-lg transition"
            >
              {loading ? "Exporting..." : "Export PDF"}
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Leave dates empty to export the current week.
          </p>
        </div>
      </div>
    </div>
  );
}
