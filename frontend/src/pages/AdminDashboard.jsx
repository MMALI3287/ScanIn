import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAttendance } from "../services/api";
import AttendanceTable from "../components/AttendanceTable";
import AdminLayout from "../components/AdminLayout";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance(selectedDate);
  }, [selectedDate]);

  const fetchAttendance = async (dateStr) => {
    setLoading(true);
    try {
      const res = await getAttendance({ date: dateStr });
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

  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const absentCount = records.filter((r) => r.status === "absent").length;

  const stats = [
    {
      label: "Total",
      value: records.length,
      color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    },
    {
      label: "Present",
      value: presentCount,
      color: "bg-green-500/10 text-green-400 border-green-500/20",
    },
    {
      label: "Late",
      value: lateCount,
      color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    },
    {
      label: "Absent",
      value: absentCount,
      color: "bg-red-500/10 text-red-400 border-red-500/20",
    },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          {selectedDate === today
            ? "Today's Attendance"
            : `Attendance — ${selectedDate}`}
        </h1>
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{loading ? "—" : s.value}</p>
            <p className="text-sm opacity-70 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <AttendanceTable records={records} />
      )}
    </AdminLayout>
  );
}
