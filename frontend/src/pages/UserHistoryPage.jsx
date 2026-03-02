import { useState, useEffect, useRef } from "react";
import { getPublicHistory, getPublicTrainees } from "../services/api";

export default function UserHistoryPage() {
  const [trainees, setTrainees] = useState([]);
  const [selectedName, setSelectedName] = useState(""); // "" = All Trainees
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState("");
  const dropdownRef = useRef(null);

  // Load trainee list on mount
  useEffect(() => {
    getPublicTrainees()
      .then((res) => setTrainees(res.data.data || []))
      .catch(() => {});
  }, []);

  // Fetch records whenever filters change
  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedName, fromDate, toDate]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchHistory = async () => {
    setError("");
    setLoading(true);
    try {
      const params = {};
      if (selectedName) params.name = selectedName;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await getPublicHistory(params);
      setRecords(res.data.data || []);
    } catch (err) {
      setError("Something went wrong. Try again.");
      setRecords([]);
    } finally {
      setLoading(false);
      setInitialLoad(false);
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

  const displayLabel = selectedName || "All Trainees";

  return (
    <div
      className="min-h-screen text-white"
      style={{
        fontFamily: "'Inter', sans-serif",
        background:
          "radial-gradient(ellipse 100% 40% at 50% -10%, rgba(6,182,212,0.1) 0%, transparent 60%), #060a10",
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-8 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)",
              boxShadow: "0 0 16px rgba(6,182,212,0.4)",
            }}
          >
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
          <span className="text-white text-lg font-bold tracking-[0.15em] uppercase">
            ScanIn
          </span>
        </div>
        <a
          href="/"
          className="text-gray-300 hover:text-white text-sm transition duration-200"
        >
          ← Back to Kiosk
        </a>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-1 tracking-tight">Attendance History</h1>
        <p className="text-gray-300 text-sm mb-8">
          Select a trainee or view all records.
        </p>

        {/* Filters row */}
        <div className="flex flex-wrap gap-4 items-end mb-8">
          {/* Trainee dropdown */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
              Trainee
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 min-w-[13em]"
                style={{
                  background: dropdownOpen
                    ? "rgba(6,182,212,0.12)"
                    : "rgba(255,255,255,0.05)",
                  border: dropdownOpen
                    ? "1px solid rgba(6,182,212,0.5)"
                    : "1px solid rgba(255,255,255,0.1)",
                  color: selectedName ? "#e2e8f0" : "#94a3b8",
                  boxShadow: dropdownOpen
                    ? "0 0 0 3px rgba(6,182,212,0.1)"
                    : "none",
                }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: selectedName ? "#22d3ee" : "#475569",
                    }}
                  />
                  {displayLabel}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div
                  className="absolute left-0 mt-2 rounded-xl py-1.5 z-50 min-w-full max-h-72 overflow-y-auto"
                  style={{
                    background: "#0d1520",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow:
                      "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(6,182,212,0.08)",
                  }}
                >
                  {/* All Trainees option */}
                  <button
                    onClick={() => {
                      setSelectedName("");
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors duration-150"
                    style={{
                      background: selectedName === "" ? "rgba(6,182,212,0.12)" : "transparent",
                      color: selectedName === "" ? "#22d3ee" : "#cbd5e1",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedName !== "") e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      if (selectedName !== "") e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}
                    >
                      <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                      </svg>
                    </span>
                    <span className="font-medium">All Trainees</span>
                    {selectedName === "" && (
                      <svg className="w-4 h-4 ml-auto text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {trainees.length > 0 && (
                    <div
                      className="my-1.5 mx-3"
                      style={{ height: "1px", background: "rgba(255,255,255,0.06)" }}
                    />
                  )}

                  {trainees.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedName(t.unique_name);
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors duration-150"
                      style={{
                        background:
                          selectedName === t.unique_name
                            ? "rgba(6,182,212,0.12)"
                            : "transparent",
                        color:
                          selectedName === t.unique_name ? "#22d3ee" : "#cbd5e1",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedName !== t.unique_name)
                          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      }}
                      onMouseLeave={(e) => {
                        if (selectedName !== t.unique_name)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold uppercase"
                        style={{
                          background:
                            selectedName === t.unique_name
                              ? "rgba(6,182,212,0.2)"
                              : "rgba(255,255,255,0.06)",
                          border:
                            selectedName === t.unique_name
                              ? "1px solid rgba(6,182,212,0.35)"
                              : "1px solid rgba(255,255,255,0.08)",
                          color:
                            selectedName === t.unique_name ? "#22d3ee" : "#94a3b8",
                        }}
                      >
                        {t.unique_name.charAt(0)}
                      </span>
                      <span>{t.unique_name}</span>
                      {selectedName === t.unique_name && (
                        <svg className="w-4 h-4 ml-auto text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Date filters */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
              From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
              To
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* Results */}
        {loading || initialLoad ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "rgba(6,182,212,0.3)", borderTopColor: "#22d3ee" }}
            />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20">
            <svg
              className="w-12 h-12 mx-auto mb-3"
              style={{ color: "rgba(255,255,255,0.1)" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-400">No attendance records found.</p>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-2xl"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {["Date", "Trainee", "Check-in", "Check-out", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest"
                        style={{ color: "#64748b" }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{
                      background:
                        i % 2 === 0 ? "rgba(10,16,26,0.6)" : "rgba(15,22,36,0.6)",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#e2e8f0" }}>
                      {r.date}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#cbd5e1" }}>
                      <span
                        className="inline-flex items-center gap-1.5"
                      >
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold uppercase"
                          style={{
                            background: "rgba(6,182,212,0.1)",
                            border: "1px solid rgba(6,182,212,0.2)",
                            color: "#67e8f9",
                          }}
                        >
                          {r.trainee_name.charAt(0)}
                        </span>
                        {r.trainee_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#cbd5e1" }}>
                      {r.checkin_time
                        ? new Date(r.checkin_time + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : <span style={{ color: "#475569" }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#cbd5e1" }}>
                      {r.checkout_time
                        ? new Date(r.checkout_time + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : <span style={{ color: "#475569" }}>—</span>}
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-gray-500 text-xs mt-6">
          {!loading && !initialLoad && records.length > 0 && `${records.length} record${records.length !== 1 ? "s" : ""} found`}
        </p>
      </div>
    </div>
  );
}
