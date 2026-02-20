import { useState } from "react";
import CameraCapture from "../components/CameraCapture";
import { checkin } from "../services/api";

export default function KioskPage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCapture = async (base64) => {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await checkin(base64);
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Recognition failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Face Attendance</h1>
      <p className="text-gray-500 mb-6">
        Look at the camera and click Scan to check in or out.
      </p>

      <CameraCapture
        onCapture={handleCapture}
        buttonText={loading ? "Scanning..." : "Scan"}
      />

      {loading && (
        <p className="mt-4 text-blue-600 animate-pulse">Processing...</p>
      )}

      {result && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6 text-center max-w-md">
          <p className="text-2xl font-bold text-green-700">
            {result.trainee_name}
          </p>
          <p className="text-gray-600 mt-1">
            {result.action === "checkin" ? "Checked In" : "Checked Out"} at{" "}
            {new Date(result.time).toLocaleTimeString()}
          </p>
          <span
            className={`inline-block mt-2 px-3 py-1 rounded text-sm font-medium ${
              result.status === "present"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {result.status}
          </span>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-center max-w-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="mt-8 flex gap-4 text-sm">
        <a href="/register" className="text-blue-600 hover:underline">
          Register as Trainee
        </a>
        <a href="/admin/login" className="text-gray-500 hover:underline">
          Admin Login
        </a>
      </div>
    </div>
  );
}
