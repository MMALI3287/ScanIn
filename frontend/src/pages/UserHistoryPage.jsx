import { useState } from "react";
import { getMyAttendance } from "../services/api";

export default function UserHistoryPage() {
  const [name, setName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const fetchHistory = async () => {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    setLoading(true);
    setSearched(true);
    try {
      const params = { name: name.trim() };
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await getMyAttendance(params);
      setRecords(res.data.data || []);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Trainee not found. Check your name and try again.");
      } else {
        setError("Something went wrong. Try again.");
      }
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (s) => {
    const colors =
      s === "present"
        ? "bg-green-500/10 text-green-400 border border-green-500/20"
        : s === "late"
          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
          : "bg-red-500/10 text-red-400 border border-red-500/20";
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
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
          <span className="text-white text-lg font-bold tracking-wide">
            ScanIn
          </span>
        </div>
        <a
          href="/"
          className="text-gray-500 hover:text-cyan-400 text-sm transition"
        >
          ← Back to Kiosk
        </a>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">My Attendance History</h1>
        <p className="text-gray-500 text-sm mb-6">
          Enter your name to view your attendance records.
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchHistory()}
              placeholder="Enter your registered name"
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 w-56"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              To
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white font-semibold py-2 px-6 rounded-lg transition text-sm cursor-pointer"
          >
            {loading ? "Loading…" : "Search"}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !searched ? (
          <div className="text-center py-16">
            <svg
              className="w-12 h-12 mx-auto text-gray-700 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <p className="text-gray-500">
              Enter your name and click Search to view your records.
            </p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="w-12 h-12 mx-auto text-gray-700 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-500">No attendance records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-gray-900 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-800 text-left text-sm font-semibold text-gray-400">
                  <th className="p-3">Date</th>
                  <th className="p-3">Check-in</th>
                  <th className="p-3">Check-out</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-gray-800 hover:bg-gray-800/50"
                  >
                    <td className="p-3 text-gray-300">{r.date}</td>
                    <td className="p-3 text-gray-300">
                      {r.checkin_time
                        ? new Date(r.checkin_time).toLocaleTimeString()
                        : "—"}
                    </td>
                    <td className="p-3 text-gray-300">
                      {r.checkout_time
                        ? new Date(r.checkout_time).toLocaleTimeString()
                        : "—"}
                    </td>
                    <td className="p-3">{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
