import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { exportReport } from "../services/api";
import AdminLayout from "../components/AdminLayout";
import { useDarkMode } from "../DarkModeContext";

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d) => d.toISOString().split("T")[0];
  return { from: fmt(mon), to: fmt(sun) };
}

export default function AdminReports() {
  const { dark } = useDarkMode();
  const navigate = useNavigate();
  const week = getWeekRange();

  const [fromDate, setFromDate] = useState(week.from);
  const [toDate, setToDate] = useState(week.to);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const handleExport = async (format) => {
    const setLoading = format === "excel" ? setLoadingExcel : setLoadingPdf;
    setLoading(true);
    try {
      const res = await exportReport(
        format,
        fromDate || undefined,
        toDate || undefined,
      );
      const mimeType =
        format === "excel"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf";
      const blob = new Blob([res.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      const f = fromDate.replace(/-/g, "");
      const t = toDate.replace(/-/g, "");
      a.download = `attendance_${f}_${t}.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 200);
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

  return (
    <AdminLayout title="Export Reports">
      <div className={`${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} border rounded-xl p-6 max-w-lg`}>
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className={`block text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"} mb-1`}>
              From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={`w-full ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500`}
            />
          </div>
          <div className="flex-1">
            <label className={`block text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"} mb-1`}>
              To
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={`w-full ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500`}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => handleExport("excel")}
            disabled={loadingExcel}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white font-semibold py-2.5 rounded-lg transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            {loadingExcel ? "Exporting…" : "Excel"}
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={loadingPdf}
            className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white font-semibold py-2.5 rounded-lg transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            {loadingPdf ? "Exporting…" : "PDF"}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Defaults to current week (Mon–Sun).
        </p>
      </div>
    </AdminLayout>
  );
}
