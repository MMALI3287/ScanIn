import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(username, password);
      localStorage.setItem("attendance_token", res.data.data.token);
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-cyan-500 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </div>
          <span className="text-white text-xl font-bold tracking-wide">
            ScanIn
          </span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          <h1 className="text-xl font-bold text-white mb-6 text-center">
            Admin Login
          </h1>

          <form onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500"
              required
            />

            <label className="block text-sm font-medium text-gray-400 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 disabled:text-cyan-400 text-white font-semibold py-2.5 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            {error && (
              <p className="mt-3 text-red-400 text-center text-sm">{error}</p>
            )}
          </form>
        </div>

        <a
          href="/"
          className="block mt-4 text-center text-gray-500 hover:text-cyan-400 text-sm transition"
        >
          Back to Kiosk
        </a>
      </div>
    </div>
  );
}
