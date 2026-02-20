import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSettings, updateSetting } from "../services/api";

export default function AdminSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workStart, setWorkStart] = useState("09:00");
  const [threshold, setThreshold] = useState("0.75");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await getSettings();
      const data = res.data.data || [];
      setSettings(data);
      const ws = data.find((s) => s.key === "work_start_time");
      if (ws) setWorkStart(ws.value);
      const th = data.find((s) => s.key === "similarity_threshold");
      if (th) setThreshold(th.value);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("attendance_token");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await updateSetting("work_start_time", workStart);
      await updateSetting("similarity_threshold", threshold);
      setMessage("Settings saved.");
    } catch (err) {
      setMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("attendance_token");
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Settings</h1>
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
          <a
            href="/admin/reports"
            className="text-gray-600 hover:text-blue-600"
          >
            Reports
          </a>
          <a href="/admin/settings" className="text-blue-600 font-medium">
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

      <div className="max-w-lg mx-auto p-6">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Start Time
              </label>
              <input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Trainees checking in after this + 10 min grace are marked
                "late".
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Face Similarity Threshold
              </label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                max="1.0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher = stricter matching. Default: 0.75
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 rounded-lg transition"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>

            {message && (
              <p className="mt-3 text-green-600 text-center text-sm">
                {message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
