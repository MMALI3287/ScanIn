import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAttendance, getWeeklyAnalytics } from "../services/api";
import AttendanceTable from "../components/AttendanceTable";
import AdminLayout from "../components/AdminLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useDarkMode } from "../DarkModeContext";

const CLASS_START = "09:00";
const CLASS_END = "12:30";

function getClassStatus(now) {
  const h = now.getHours();
  const m = now.getMinutes();
  const current = h * 60 + m;
  const start = 9 * 60;
  const end = 12 * 60 + 30;
  if (current < start) return { label: "Class starts soon", color: "yellow", active: false };
  if (current >= start && current < end) return { label: "Class in progress", color: "green", active: true };
  return { label: "Class ended", color: "gray", active: false };
}

export default function AdminDashboard() {
  const { dark } = useDarkMode();
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState([]);
  const [clock, setClock] = useState(new Date());
  const [liveFeed, setLiveFeed] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchAttendance(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    getWeeklyAnalytics()
      .then((res) => setWeeklyData(res.data.data || []))
      .catch(() => {});
  }, []);

  // WebSocket for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/attendance`;
    let reconnectTimer;

    function connectWs() {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setLiveFeed((prev) => [data, ...prev].slice(0, 10));
        if (selectedDate === new Date().toISOString().split("T")[0]) {
          fetchAttendance(selectedDate);
        }
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(() => {
          if (wsRef.current === ws || wsRef.current === null) connectWs();
        }, 3000);
      };
    }

    connectWs();

    return () => {
      clearTimeout(reconnectTimer);
      const current = wsRef.current;
      wsRef.current = null;
      current?.close();
    };
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
  const earlyDepartCount = records.filter((r) => {
    if (!r.checkout_time) return false;
    const co = new Date(r.checkout_time);
    const coMinutes = co.getHours() * 60 + co.getMinutes();
    return coMinutes < 12 * 60 + 30;
  }).length;

  const classStatus = getClassStatus(clock);
  const csColors = {
    green: dark ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-green-50 text-green-700 border-green-200",
    yellow: dark ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" : "bg-yellow-50 text-yellow-700 border-yellow-200",
    gray: dark ? "bg-gray-700/50 text-gray-400 border-gray-600/30" : "bg-gray-100 text-gray-500 border-gray-200",
  };

  const stats = [
    { label: "Total", value: records.length, color: dark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200" },
    { label: "Present", value: presentCount, color: dark ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-700 border-green-200" },
    { label: "Late", value: lateCount, color: dark ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-yellow-50 text-yellow-700 border-yellow-200" },
    { label: "Absent", value: absentCount, color: dark ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-50 text-red-700 border-red-200" },
    { label: "Early Departure", value: earlyDepartCount, color: dark ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-700 border-orange-200" },
  ];

  const pieData = [
    { name: "Present", value: presentCount, color: "#22c55e" },
    { name: "Late", value: lateCount, color: "#eab308" },
    { name: "Absent", value: absentCount, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
            {selectedDate === today ? "Today's Attendance" : `Attendance — ${selectedDate}`}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${csColors[classStatus.color]}`}>
              <span className={`w-2 h-2 rounded-full ${classStatus.active ? "bg-green-400 animate-pulse" : classStatus.color === "yellow" ? "bg-yellow-400" : "bg-gray-400"}`} />
              {classStatus.label}
            </span>
            <span className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
              {CLASS_START} – {CLASS_END}
            </span>
          </div>
        </div>
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(e) => setSelectedDate(e.target.value)}
          className={`${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500`}
        />
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{loading ? "—" : s.value}</p>
            <p className="text-sm opacity-70 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className={`col-span-2 rounded-xl border p-4 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <h3 className={`text-sm font-semibold mb-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>Weekly Attendance</h3>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1f2937" : "#e5e7eb"} />
                <XAxis dataKey="label" tick={{ fill: dark ? "#9ca3af" : "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: dark ? "#9ca3af" : "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: dark ? "#111827" : "#fff", border: dark ? "1px solid #374151" : "1px solid #e5e7eb", borderRadius: "8px", color: dark ? "#e5e7eb" : "#111827" }} />
                <Bar dataKey="present" fill="#22c55e" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="late" fill="#eab308" radius={[4, 4, 0, 0]} name="Late" />
                <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px]">
              <p className={`text-sm ${dark ? "text-gray-600" : "text-gray-400"}`}>No data</p>
            </div>
          )}
        </div>

        <div className={`rounded-xl border p-4 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <h3 className={`text-sm font-semibold mb-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>Today's Breakdown</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: dark ? "#111827" : "#fff", border: dark ? "1px solid #374151" : "1px solid #e5e7eb", borderRadius: "8px", color: dark ? "#e5e7eb" : "#111827" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px]">
              <p className={`text-sm ${dark ? "text-gray-600" : "text-gray-400"}`}>No data</p>
            </div>
          )}
          <div className="flex flex-wrap gap-3 justify-center mt-1">
            {[{ label: "Present", color: "bg-green-500" }, { label: "Late", color: "bg-yellow-500" }, { label: "Absent", color: "bg-red-500" }].map((l) => (
              <span key={l.label} className={`flex items-center gap-1.5 text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {liveFeed.length > 0 && (
        <div className={`rounded-xl border p-4 mb-6 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Activity
          </h3>
          <div className="space-y-2">
            {liveFeed.map((item, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg ${dark ? "bg-gray-800/50" : "bg-gray-50"}`}>
                <span className={`w-2 h-2 rounded-full ${item.type === "checkin" ? "bg-green-500" : "bg-blue-500"}`} />
                <span className={`font-medium ${dark ? "text-white" : "text-gray-900"}`}>{item.trainee_name}</span>
                <span className={dark ? "text-gray-500" : "text-gray-400"}>
                  {item.type === "checkin" ? "checked in" : "checked out"} at {item.time}
                </span>
                {item.status === "late" && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">late</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
