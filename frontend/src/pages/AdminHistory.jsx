import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAttendance,
  getTrainees,
  patchAttendance,
  deleteAttendance,
} from "../services/api";
import AdminLayout from "../components/AdminLayout";
import { useDarkMode } from "../DarkModeContext";

const PAGE_SIZE = 15;

function toLocalInput(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminHistory() {
  const { dark } = useDarkMode();
  const navigate = useNavigate();

  const [trainees, setTrainees] = useState([]);
  const [traineeId, setTraineeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getTrainees()
      .then((res) => setTrainees(res.data.data || []))
      .catch(() => {});
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setPage(1);
    try {
      const params = {};
      if (traineeId) params.trainee_id = traineeId;
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

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditForm({
      checkin_time: toLocalInput(r.checkin_time),
      checkout_time: toLocalInput(r.checkout_time),
      status: r.status,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
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
    <AdminLayout title="Attendance History">
      {({ setToast }) => {
        const saveEdit = async (id) => {
          setSaving(true);
          try {
            const payload = {};
            if (editForm.checkin_time)
              payload.checkin_time = new Date(
                editForm.checkin_time,
              ).toISOString();
            if (editForm.checkout_time)
              payload.checkout_time = new Date(
                editForm.checkout_time,
              ).toISOString();
            payload.status = editForm.status;
            await patchAttendance(id, payload);
            setToast({ type: "success", text: "Record updated." });
            cancelEdit();
            fetchHistory();
          } catch (err) {
            setToast({
              type: "error",
              text: err.response?.data?.detail || "Failed to update.",
            });
          } finally {
            setSaving(false);
          }
        };

        return (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end mb-6">
              <div>
                <label className={`block text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"} mb-1`}>
                  Trainee
                </label>
                <select
                  value={traineeId}
                  onChange={(e) => setTraineeId(e.target.value)}
                  className={`${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                >
                  <option value="">All trainees</option>
                  {trainees.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.unique_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"} mb-1`}>
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={`${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"} mb-1`}>
                  To
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={`${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                />
              </div>
              <button
                onClick={fetchHistory}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-6 rounded-lg transition text-sm cursor-pointer"
              >
                Apply
              </button>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
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
                <p className="text-gray-500">
                  No records found. Use the filters above and click Apply.
                </p>
              </div>
            ) : (
              <>
              <div className="overflow-x-auto">
                <table className={`w-full border-collapse ${dark ? "bg-gray-900" : "bg-white"} rounded-lg overflow-hidden`}>
                  <thead>
                    <tr className={`${dark ? "bg-gray-800" : "bg-gray-50"} text-left text-sm font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}>
                      <th className="p-3">Name</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Check-in</th>
                      <th className="p-3">Check-out</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Images</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) =>
                      editingId === r.id ? (
                        <tr
                          key={r.id}
                          className={`${dark ? "border-t border-gray-800 bg-gray-800/50" : "border-t border-gray-200 bg-gray-50"}`}
                        >
                          <td className={`p-3 font-medium ${dark ? "text-white" : "text-gray-900"}`}>
                            {r.trainee_name}
                          </td>
                          <td className={`p-3 ${dark ? "text-gray-300" : "text-gray-600"}`}>{r.date}</td>
                          <td className="p-3">
                            <input
                              type="datetime-local"
                              value={editForm.checkin_time}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  checkin_time: e.target.value,
                                })
                              }
                              className={`${dark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-100 border-gray-300 text-gray-900"} border rounded px-2 py-1 text-sm w-44 focus:outline-none focus:ring-1 focus:ring-cyan-500`}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="datetime-local"
                              value={editForm.checkout_time}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  checkout_time: e.target.value,
                                })
                              }
                              className={`${dark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-100 border-gray-300 text-gray-900"} border rounded px-2 py-1 text-sm w-44 focus:outline-none focus:ring-1 focus:ring-cyan-500`}
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={editForm.status}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  status: e.target.value,
                                })
                              }
                              className={`${dark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-100 border-gray-300 text-gray-900"} border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500`}
                            >
                              <option value="present">present</option>
                              <option value="late">late</option>
                              <option value="absent">absent</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              {r.checkin_image && (
                                <img
                                  src={r.checkin_image}
                                  alt="Check-in"
                                  className="w-8 h-8 rounded object-cover cursor-pointer border border-gray-600 hover:border-cyan-500"
                                  onClick={() =>
                                    setPreviewImage(r.checkin_image)
                                  }
                                />
                              )}
                              {r.checkout_image && (
                                <img
                                  src={r.checkout_image}
                                  alt="Check-out"
                                  className="w-8 h-8 rounded object-cover cursor-pointer border border-gray-600 hover:border-cyan-500"
                                  onClick={() =>
                                    setPreviewImage(r.checkout_image)
                                  }
                                />
                              )}
                              {!r.checkin_image && !r.checkout_image && (
                                <span className="text-gray-600 text-xs">—</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(r.id)}
                                disabled={saving}
                                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 text-sm font-medium px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.5 12.75l6 6 9-13.5"
                                  />
                                </svg>
                                {saving ? "Saving…" : "Save"}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-gray-300 border border-gray-600/30 hover:border-gray-600/60 text-sm font-medium px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={r.id}
                          className={`${dark ? "border-t border-gray-800 hover:bg-gray-800/50" : "border-t border-gray-100 hover:bg-gray-50"}`}
                        >
                          <td className={`p-3 font-medium ${dark ? "text-white" : "text-gray-900"}`}>
                            {r.trainee_name}
                          </td>
                          <td className={`p-3 ${dark ? "text-gray-300" : "text-gray-600"}`}>{r.date}</td>
                          <td className={`p-3 ${dark ? "text-gray-300" : "text-gray-600"}`}>
                            {r.checkin_time
                              ? new Date(r.checkin_time).toLocaleTimeString()
                              : "—"}
                          </td>
                          <td className={`p-3 ${dark ? "text-gray-300" : "text-gray-600"}`}>
                            {r.checkout_time
                              ? new Date(r.checkout_time).toLocaleTimeString()
                              : "—"}
                          </td>
                          <td className="p-3">{statusBadge(r.status)}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              {r.checkin_image && (
                                <img
                                  src={r.checkin_image}
                                  alt="Check-in"
                                  className={`w-8 h-8 rounded object-cover cursor-pointer border ${dark ? "border-gray-600" : "border-gray-300"} hover:border-cyan-500 transition`}
                                  title="Check-in capture"
                                  onClick={() =>
                                    setPreviewImage(r.checkin_image)
                                  }
                                />
                              )}
                              {r.checkout_image && (
                                <img
                                  src={r.checkout_image}
                                  alt="Check-out"
                                  className={`w-8 h-8 rounded object-cover cursor-pointer border ${dark ? "border-gray-600" : "border-gray-300"} hover:border-cyan-500 transition`}
                                  title="Check-out capture"
                                  onClick={() =>
                                    setPreviewImage(r.checkout_image)
                                  }
                                />
                              )}
                              {!r.checkin_image && !r.checkout_image && (
                                <span className="text-gray-600 text-xs">—</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEdit(r)}
                                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 text-sm font-medium px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                                  />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  setConfirmDelete({
                                    id: r.id,
                                    name: r.trainee_name,
                                    date: r.date,
                                  })
                                }
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 text-sm font-medium px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                  />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {records.length > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 px-1">
                  <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, records.length)} of {records.length}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${dark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.ceil(records.length / PAGE_SIZE) }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === Math.ceil(records.length / PAGE_SIZE) || Math.abs(p - page) <= 1)
                      .map((p, idx, arr) => (
                        <span key={p} className="flex items-center">
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className={`px-1 ${dark ? "text-gray-600" : "text-gray-400"}`}>…</span>}
                          <button
                            onClick={() => setPage(p)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition cursor-pointer ${p === page ? "bg-cyan-600 text-white" : dark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                          >
                            {p}
                          </button>
                        </span>
                      ))}
                    <button
                      onClick={() => setPage((p) => Math.min(Math.ceil(records.length / PAGE_SIZE), p + 1))}
                      disabled={page >= Math.ceil(records.length / PAGE_SIZE)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${dark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              </>
            )}
            {/* Confirm Delete Modal */}
            {confirmDelete && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className={`${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} border rounded-xl p-6 w-full max-w-sm shadow-lg text-center`}>
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </div>
                  <h3 className={`text-lg font-semibold ${dark ? "text-white" : "text-gray-900"} mb-2`}>
                    Delete Attendance Record
                  </h3>
                  <p className={`${dark ? "text-gray-400" : "text-gray-500"} text-sm mb-6`}>
                    Delete the record for{" "}
                    <span className={`${dark ? "text-white" : "text-gray-900"} font-medium`}>
                      "{confirmDelete.name}"
                    </span>{" "}
                    on{" "}
                    <span className={`${dark ? "text-white" : "text-gray-900"} font-medium`}>
                      {confirmDelete.date}
                    </span>
                    ?
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={async () => {
                        try {
                          await deleteAttendance(confirmDelete.id);
                          setToast({
                            type: "success",
                            text: "Record deleted.",
                          });
                          setConfirmDelete(null);
                          fetchHistory();
                        } catch (err) {
                          setToast({
                            type: "error",
                            text:
                              err.response?.data?.detail || "Failed to delete.",
                          });
                          setConfirmDelete(null);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-5 rounded-lg transition cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className={`${dark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600"} py-2 px-5 rounded-lg transition cursor-pointer`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Image Preview Modal */}
            {previewImage && (
              <div
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-pointer"
                onClick={() => setPreviewImage(null)}
              >
                <div className="relative max-w-lg max-h-[80vh]">
                  <img
                    src={previewImage}
                    alt="Captured face"
                    className="rounded-xl max-w-full max-h-[80vh] object-contain"
                  />
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        );
      }}
    </AdminLayout>
  );
}
