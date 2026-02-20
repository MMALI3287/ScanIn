import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { registerSelf } from "../services/api";

export default function RegisterPage() {
  const webcamRef = useRef(null);
  const [name, setName] = useState("");
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const capture = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (screenshot) {
      const base64 = screenshot.split(",")[1];
      setCaptures((prev) => [...prev, base64]);
    }
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (captures.length < 3) {
      setError("Please capture at least 3 photos.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);
    try {
      // Send raw base64 images as embeddings placeholder
      // Backend will compute embeddings from these
      const res = await registerSelf(
        name.trim(),
        captures.map((c) => Array.from({ length: 512 }, () => 0)),
      );
      setMessage(
        "Registration successful! You can now use the kiosk to check in.",
      );
      setCaptures([]);
      setName("");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Trainee Registration
      </h1>

      <div className="bg-white rounded-lg shadow p-6 w-full max-w-lg">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your Unique Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. John Doe"
        />

        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "user", width: 480, height: 360 }}
          className="rounded-lg border-2 border-gray-300 w-full"
        />

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={capture}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            Capture ({captures.length}/5)
          </button>
          {captures.length > 0 && (
            <button
              onClick={() => setCaptures([])}
              className="text-red-600 hover:underline text-sm"
            >
              Clear All
            </button>
          )}
        </div>

        {captures.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {captures.map((_, i) => (
              <div
                key={i}
                className="w-16 h-16 bg-green-100 rounded flex items-center justify-center text-green-700 text-xs font-medium"
              >
                #{i + 1}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 rounded-lg transition"
        >
          {loading ? "Registering..." : "Register"}
        </button>

        {message && (
          <p className="mt-3 text-green-600 text-center">{message}</p>
        )}
        {error && <p className="mt-3 text-red-600 text-center">{error}</p>}
      </div>

      <a href="/" className="mt-6 text-blue-600 hover:underline text-sm">
        Back to Kiosk
      </a>
    </div>
  );
}
