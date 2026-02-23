import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTrainees, deleteTrainee, registerByAdmin } from "../services/api";
import AdminLayout from "../components/AdminLayout";

export default function AdminTrainees() {
  const navigate = useNavigate();

  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchTrainees();
  }, []);

  const fetchTrainees = async () => {
    try {
      const res = await getTrainees();
      setTrainees(res.data.data || []);
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
    <AdminLayout>
      {({ setToast }) => {
        const handleDelete = async () => {
          if (!confirmDelete) return;
          try {
            await deleteTrainee(confirmDelete.id);
            setToast({
              type: "success",
              text: `"${confirmDelete.name}" deleted.`,
            });
            setConfirmDelete(null);
            fetchTrainees();
          } catch (err) {
            setToast({
              type: "error",
              text: err.response?.data?.detail || "Failed to delete.",
            });
            setConfirmDelete(null);
          }
        };

        const handleAdd = async () => {
          if (!newName.trim()) {
            setAddError("Name is required.");
            return;
          }
          if (files.length < 1) {
            setAddError("Upload at least 1 image.");
            return;
          }
          if (files.length > 5) {
            setAddError("Maximum 5 images.");
            return;
          }

          setAddError("");
          setSubmitting(true);
          try {
            await registerByAdmin(
              newName.trim(),
              Array.from(files),
              newEmail.trim() || undefined,
            );
            setToast({
              type: "success",
              text: `"${newName.trim()}" registered.`,
            });
            setNewName("");
            setNewEmail("");
            setFiles([]);
            setShowAdd(false);
            fetchTrainees();
          } catch (err) {
            setAddError(err.response?.data?.detail || "Registration failed.");
          } finally {
            setSubmitting(false);
          }
        };

        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">
                Trainees
                <span className="ml-2 text-base font-normal text-gray-500">
                  ({trainees.length})
                </span>
              </h1>
              <button
                onClick={() => setShowAdd(true)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-4 rounded-lg transition text-sm cursor-pointer flex items-center gap-2"
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
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Add Trainee
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : trainees.length === 0 ? (
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
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
                <p className="text-gray-500">No trainees registered yet.</p>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-800 text-left text-sm font-semibold text-gray-400">
                      <th className="p-3">Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Registered By</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainees.map((t) => (
                      <tr
                        key={t.id}
                        className="border-t border-gray-800 hover:bg-gray-800/50"
                      >
                        <td className="p-3 font-medium text-white">
                          {t.unique_name}
                        </td>
                        <td className="p-3 text-sm text-gray-400">
                          {t.email || "—"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              t.registered_by === "admin"
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            }`}
                          >
                            {t.registered_by}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-400">
                          {new Date(t.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() =>
                              setConfirmDelete({
                                id: t.id,
                                name: t.unique_name,
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add Trainee Modal */}
            {showAdd && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Add Trainee
                  </h3>

                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Trainee Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500"
                    placeholder="e.g. Jane Smith"
                  />

                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500"
                    placeholder="e.g. jane@example.com"
                  />

                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Face Images (1–5)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFiles(e.target.files)}
                    className="w-full text-sm text-gray-400 mb-1 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-500/10 file:text-cyan-400 file:font-medium file:cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mb-4">
                    {files.length} file{files.length !== 1 ? "s" : ""} selected
                  </p>

                  {addError && (
                    <p className="text-red-400 text-sm mb-3">{addError}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleAdd}
                      disabled={submitting}
                      className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white font-semibold py-2 px-4 rounded-lg transition cursor-pointer"
                    >
                      {submitting ? "Registering…" : "Add"}
                    </button>
                    <button
                      onClick={() => {
                        setShowAdd(false);
                        setAddError("");
                        setFiles([]);
                        setNewName("");
                        setNewEmail("");
                      }}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-4 rounded-lg transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Confirm Delete Modal */}
            {confirmDelete && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm shadow-lg text-center">
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
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Delete Trainee
                  </h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Are you sure you want to delete{" "}
                    <span className="text-white font-medium">
                      "{confirmDelete.name}"
                    </span>
                    ? This will also remove their attendance records.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-5 rounded-lg transition cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-5 rounded-lg transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      }}
    </AdminLayout>
  );
}
