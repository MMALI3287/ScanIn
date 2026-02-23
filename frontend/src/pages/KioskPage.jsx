import { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { checkIn, identifyFace } from "../services/api";

export default function KioskPage() {
  const webcamRef = useRef(null);
  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const [identified, setIdentified] = useState(null);
  const [capturedFrame, setCapturedFrame] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const resetFull = useCallback((delay = 3000) => {
    setTimeout(() => {
      setPhase("idle");
      setResult(null);
      setIdentified(null);
      setCapturedFrame(null);
      setErrorMsg("");
    }, delay);
  }, []);

  const handleScan = useCallback(async () => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (!screenshot) return;

    const base64 = screenshot.split(",")[1];
    setCapturedFrame(base64);
    setPhase("scanning");

    try {
      const res = await identifyFace(base64);
      if (res.data.success) {
        setIdentified(res.data.data);
        setPhase("confirm");
      } else {
        setErrorMsg(res.data.message || "Something went wrong. Try again.");
        setPhase("error");
        resetFull(2000);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        (err?.request
          ? "Server unreachable. Try again."
          : "Something went wrong. Try again.");
      setErrorMsg(msg);
      setPhase("error");
      resetFull(2000);
    }
  }, [resetFull]);

  const handleConfirm = useCallback(async () => {
    if (!capturedFrame) return;
    setPhase("recording");

    try {
      const res = await checkIn(capturedFrame);
      if (res.data.success) {
        setResult(res.data.data);
        setPhase("success");
        resetFull(3000);
      } else {
        setErrorMsg(res.data.message || "Something went wrong. Try again.");
        setPhase("error");
        resetFull(2000);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        (err?.request
          ? "Server unreachable. Try again."
          : "Something went wrong. Try again.");
      setErrorMsg(msg);
      setPhase("error");
      resetFull(2000);
    }
  }, [capturedFrame, resetFull]);

  const handleCancel = useCallback(() => {
    setPhase("idle");
    setIdentified(null);
    setCapturedFrame(null);
    setErrorMsg("");
  }, []);

  const timeStr = clock.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const dateStr = clock.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center select-none relative">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-4">
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
          href="/admin/login"
          className="text-gray-600 hover:text-gray-400 text-xs transition"
        >
          Admin
        </a>
      </div>

      {/* Clock */}
      <div className="mb-6 text-center">
        <p className="text-5xl font-bold text-white tracking-tight font-mono tabular-nums">
          {timeStr}
        </p>
        <p className="text-gray-500 mt-1 text-sm">{dateStr}</p>
      </div>

      {/* Camera / Result Area */}
      {phase === "success" ? (
        /* Success card */
        <div
          className={`w-[640px] h-[480px] rounded-2xl border ${result?.action === "checkout" ? "border-blue-500/30" : "border-green-500/30"} bg-gray-900 flex flex-col items-center justify-center`}
        >
          <div
            className={`w-24 h-24 rounded-full ${result?.action === "checkout" ? "bg-blue-500/20" : "bg-green-500/20"} flex items-center justify-center mb-6`}
          >
            {result?.action === "checkout" ? (
              <svg
                className="w-14 h-14 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
            ) : (
              <svg
                className="w-14 h-14 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
          <p className="text-3xl font-bold text-white">
            {result?.trainee_name}
          </p>
          <p className="text-gray-400 mt-2 text-lg">
            {result?.action === "checkout" ? "Checked out" : "Checked in"} at{" "}
            {result?.time}
          </p>
          <span
            className={`mt-4 px-4 py-1.5 rounded-full text-sm font-medium ${result?.action === "checkout" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}
          >
            {result?.action === "checkout"
              ? "Check-out Successful"
              : "Check-in Successful"}
          </span>
        </div>
      ) : phase === "confirm" || phase === "recording" ? (
        /* Confirmation card */
        <div
          className={`w-[640px] h-[480px] rounded-2xl border ${identified?.action === "checkout" ? "border-blue-500/30" : "border-cyan-500/30"} bg-gray-900 flex flex-col items-center justify-center`}
        >
          <div
            className={`w-20 h-20 rounded-full ${identified?.action === "checkout" ? "bg-blue-500/20" : "bg-cyan-500/20"} flex items-center justify-center mb-5`}
          >
            <svg
              className={`w-10 h-10 ${identified?.action === "checkout" ? "text-blue-400" : "text-cyan-400"}`}
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
          <p className="text-2xl font-bold text-white mb-1">
            {identified?.trainee_name}
          </p>
          <p className="text-gray-400 text-sm mb-8">
            {identified?.action === "checkout"
              ? "You are about to check out"
              : "You are about to check in"}
          </p>

          {phase === "recording" ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-cyan-400 text-sm animate-pulse">
                Recording...
              </p>
            </div>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={handleConfirm}
                className={`font-bold text-lg py-3 px-10 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  identified?.action === "checkout"
                    ? "bg-blue-500 hover:bg-blue-400 text-white"
                    : "bg-green-500 hover:bg-green-400 text-white"
                }`}
              >
                {identified?.action === "checkout"
                  ? "Confirm Check-out"
                  : "Confirm Check-in"}
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-lg py-3 px-8 rounded-xl transition-all duration-200 cursor-pointer"
              >
                Not Me
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
            className="rounded-2xl border border-gray-800 w-[640px] h-[480px] object-cover"
          />

          {/* Corner brackets overlay */}
          <div className="absolute inset-12 pointer-events-none">
            <div className="absolute top-0 left-0 w-10 h-10 border-t-3 border-l-3 border-cyan-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-3 border-r-3 border-cyan-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-3 border-l-3 border-cyan-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-3 border-r-3 border-cyan-400 rounded-br-lg" />
          </div>

          {/* Scanning overlay */}
          {phase === "scanning" && (
            <div className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-cyan-400 text-lg font-semibold mt-4 animate-pulse">
                Scanning...
              </p>
            </div>
          )}

          {/* Error overlay */}
          {phase === "error" && (
            <div className="absolute inset-0 bg-black/70 rounded-2xl flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-red-400 text-lg font-semibold mt-4">
                {errorMsg || "Face not recognized. Try again."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Scan button + hint */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {phase !== "confirm" &&
          phase !== "recording" &&
          phase !== "success" && (
            <>
              <button
                onClick={handleScan}
                disabled={phase !== "idle"}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold text-lg py-3 px-14 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                {phase === "scanning" ? "Scanning..." : "Scan Face"}
              </button>
              <p className="text-gray-600 text-xs">
                Look straight at the camera and stay still
              </p>
            </>
          )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 flex items-center gap-4">
        <a
          href="/register"
          className="text-gray-600 hover:text-cyan-400 text-xs transition"
        >
          New here? Register as a trainee
        </a>
        <span className="text-gray-700">|</span>
        <a
          href="/history"
          className="text-gray-600 hover:text-cyan-400 text-xs transition"
        >
          View my attendance
        </a>
      </div>
    </div>
  );
}
