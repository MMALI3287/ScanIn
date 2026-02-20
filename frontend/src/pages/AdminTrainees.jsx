import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTrainees, deleteTrainee, registerByAdmin } from "../services/api";

export default function AdminTrainees() {
  const navigate = useNavigate();
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");

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

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete trainee "${name}"? This cannot be undone.`)) return;
    try {
      await deleteTrainee(id);
      fetchTrainees();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete.");
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      setAddError("Name is required.");
      return;
    }
    setAddError("");
    try {
      // Placeholder: admin would upload images in a full flow
      await registerByAdmin(newName.trim(), []);
    } catch (err) {
      setAddError(err.response?.data?.detail || "Failed to add.");
      return;
    }
    setNewName("");
    setShowAdd(false);
    fetchTrainees();
  };

  const handleLogout = () => {
    localStorage.removeItem("attendance_token");
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Trainee Management</h1>
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
          <a href="/admin/trainees" className="text-blue-600 font-medium">
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

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">
            All Trainees ({trainees.length})
          </h2>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
          >
            + Add Trainee
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : trainees.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No trainees registered yet.
          </p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
                  <th className="p-3">ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Registered By</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainees.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">{t.id}</td>
                    <td className="p-3 font-medium">{t.unique_name}</td>
                    <td className="p-3">{t.registered_by}</td>
                    <td className="p-3 text-sm text-gray-500">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDelete(t.id, t.unique_name)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showAdd && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Add Trainee</h3>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trainee Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Jane Smith"
              />
              {addError && (
                <p className="text-red-600 text-sm mb-3">{addError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleAdd}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAdd(false);
                    setAddError("");
                  }}
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
