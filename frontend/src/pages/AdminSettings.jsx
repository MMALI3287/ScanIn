import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSettings, updateSetting } from "../services/api";
import AdminLayout from "../components/AdminLayout";
import { useDarkMode } from "../DarkModeContext";

export default function AdminSettings() {
  const { dark } = useDarkMode();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [workStart, setWorkStart] = useState("09:00");
  const [gracePeriod, setGracePeriod] = useState("10");
  const [threshold, setThreshold] = useState("0.75");
  const [livenessEnabled, setLivenessEnabled] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await getSettings();
      const data = res.data.data || {};
      if (data.work_start_time) setWorkStart(data.work_start_time);
      if (data.grace_period_minutes) setGracePeriod(data.grace_period_minutes);
      if (data.similarity_threshold) setThreshold(data.similarity_threshold);
      if (data.liveness_check_enabled !== undefined)
        setLivenessEnabled(data.liveness_check_enabled === "true");
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("attendance_token");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Settings">
      {({ setToast }) => {
        const handleSave = async () => {
          setSaving(true);
          try {
            await updateSetting("work_start_time", workStart);
            await updateSetting("grace_period_minutes", gracePeriod);
            await updateSetting("similarity_threshold", threshold);
            await updateSetting(
              "liveness_check_enabled",
              livenessEnabled ? "true" : "false",
            );
            setToast({ type: "success", text: "Settings saved." });
          } catch (err) {
            setToast({
              type: "error",
              text:
                "Failed to save settings: " +
                (err.response?.data?.message || err.message),
            });
          } finally {
            setSaving(false);
          }
        };

        return loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div
            className={`${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} border rounded-xl p-6 max-w-lg`}
          >
            <div className="mb-5">
              <label
                className={`block text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"} mb-1`}
              >
                Class Start Time
              </label>
              <input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className={`w-full ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Trainees arriving after this time + grace period are marked
                "late".
              </p>
            </div>

            <div className="mb-5">
              <label
                className={`block text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"} mb-1`}
              >
                Grace Period (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={gracePeriod}
                onChange={(e) => setGracePeriod(e.target.value)}
                className={`w-full ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Minutes after class start time before marking as late. Default:
                10.
              </p>
            </div>

            <div className="mb-6">
              <label
                className={`block text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"} mb-1`}
              >
                Face Similarity Threshold
              </label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                max="1.0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className={`w-full ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher = stricter matching. Default: 0.75.
              </p>
            </div>

            <div
              className={`mb-6 flex items-center justify-between ${dark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"} border rounded-lg px-4 py-3`}
            >
              <div>
                <p
                  className={`text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}
                >
                  Liveness Detection (Gemini API)
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Uses Google Gemini to verify a real person is present. Disable
                  for testing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLivenessEnabled((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  livenessEnabled ? "bg-cyan-600" : "bg-gray-600"
                }`}
                aria-pressed={livenessEnabled}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                    livenessEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white font-semibold py-2.5 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        );
      }}
    </AdminLayout>
  );
}
