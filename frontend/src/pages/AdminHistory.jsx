import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAttendance, patchAttendance } from "../services/api";
import AttendanceTable from "../components/AttendanceTable";

export default function AdminHistory() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editing, setEditing] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await getAttendance(params);
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

  const handleEdit = (record) => {
    setEditing({ ...record });
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      await patchAttendance(editing.id, {
        checkin_time: editing.checkin_time,
        checkout_time: editing.checkout_time,
        status: editing.status,
      });
      setEditing(null);
      fetchHistory();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("attendance_token");
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Attendance History</h1>
        <div className="flex gap-4 text-sm">
          <a
            href="/admin/dashboard"
            className="text-gray-600 hover:text-blue-600"
          >
            Today
          </a>
          <a href="/admin/history" className="text-blue-600 font-medium">
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
        <div className="flex gap-4 items-end mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={fetchHistory}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            Search
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <AttendanceTable records={records} onEdit={handleEdit} />
        )}

        {editing && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
              <h3 className="text-lg font-semibold mb-4">
                Edit Record — {editing.trainee_name}
              </h3>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={editing.status}
                onChange={(e) =>
                  setEditing({ ...editing, status: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
              >
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
