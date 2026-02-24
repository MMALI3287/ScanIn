import { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { checkIn, identifyFace } from "../services/api";

function playChime(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.15;

    if (type === "success") {
      osc.frequency.value = 880;
      osc.type = "sine";
      osc.start();
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.stop(ctx.currentTime + 0.6);
    } else {
      osc.frequency.value = 330;
      osc.type = "square";
      osc.start();
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // Audio not available
  }
}

export default function KioskPage() {
  const webcamRef = useRef(null);
  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const [identified, setIdentified] = useState(null);
  const [capturedFrame, setCapturedFrame] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [clock, setClock] = useState(new Date());
  const [showPulse, setShowPulse] = useState(false);

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
      playChime("error");
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
        playChime("success");
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 1000);
        resetFull(3000);
      } else {
        setErrorMsg(res.data.message || "Something went wrong. Try again.");
        setPhase("error");
        playChime("error");
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
      playChime("error");
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
    <div
      className="min-h-screen flex flex-col items-center justify-center select-none relative overflow-hidden"
      style={{
        fontFamily: "'Inter', sans-serif",
        background:
          "radial-gradient(ellipse 110% 55% at 50% -5%, rgba(6,182,212,0.14) 0%, transparent 62%), #060a10",
      }}
    >
      {/* Subtle dot-grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)",
              boxShadow: "0 0 16px rgba(6,182,212,0.45)",
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
          <span className="text-white text-lg font-bold tracking-[0.2em] uppercase">
            ScanIn
          </span>
        </div>
        <a
          href="/admin/login"
          className="text-gray-400 hover:text-white text-xs tracking-widest uppercase transition duration-200"
        >
          Admin
        </a>
      </div>

      {/* Clock */}
      <div className="mb-8 text-center">
        <p
          className="tabular-nums text-white"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "clamp(2.2rem, 5vh, 4.8rem)",
            fontWeight: 300,
            letterSpacing: "-0.03em",
            textShadow: "0 0 40px rgba(6,182,212,0.25)",
          }}
        >
          {timeStr}
        </p>
        <p className="text-gray-100 mt-2 text-sm font-medium tracking-wide">
          {dateStr}
        </p>
      </div>

      {/* Camera / Result Area */}
      {phase === "success" ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center relative overflow-hidden"
          style={{
            width: "clamp(32.5em, 33vw, 48.75em)",
            height: "clamp(24.375em, 24.75vw, 36.5em)",
            background: "rgba(10,16,26,0.95)",
            border:
              result?.action === "checkout"
                ? "1px solid rgba(59,130,246,0.35)"
                : "1px solid rgba(34,197,94,0.35)",
            boxShadow:
              result?.action === "checkout"
                ? "0 0 60px rgba(59,130,246,0.08), inset 0 0 40px rgba(59,130,246,0.04)"
                : "0 0 60px rgba(34,197,94,0.08), inset 0 0 40px rgba(34,197,94,0.04)",
          }}
        >
          {/* Pulse animation */}
          {showPulse && (
            <div
              className="absolute inset-0 rounded-2xl animate-ping pointer-events-none"
              style={{
                background: result?.action === "checkout" ? "rgba(59,130,246,0.1)" : "rgba(34,197,94,0.1)",
                animationDuration: "0.8s",
                animationIterationCount: 1,
              }}
            />
          )}
          {/* Captured photo */}
          {capturedFrame && (
            <div className="mb-4">
              <img
                src={`data:image/jpeg;base64,${capturedFrame}`}
                alt="Captured"
                className="w-20 h-20 rounded-full object-cover border-2"
                style={{
                  borderColor: result?.action === "checkout" ? "rgba(59,130,246,0.5)" : "rgba(34,197,94,0.5)",
                  boxShadow: result?.action === "checkout" ? "0 0 20px rgba(59,130,246,0.3)" : "0 0 20px rgba(34,197,94,0.3)",
                }}
              />
            </div>
          )}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{
              background:
                result?.action === "checkout"
                  ? "rgba(59,130,246,0.15)"
                  : "rgba(34,197,94,0.15)",
              boxShadow:
                result?.action === "checkout"
                  ? "0 0 40px rgba(59,130,246,0.25)"
                  : "0 0 40px rgba(34,197,94,0.25)",
            }}
          >
            {result?.action === "checkout" ? (
              <svg
                className="w-7 h-7 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
            ) : (
              <svg
                className="w-7 h-7 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">
            {result?.trainee_name}
          </p>
          <p className="text-gray-200 mt-2 text-base">
            {result?.action === "checkout" ? "Checked out" : "Checked in"} at{" "}
            <span className="text-gray-200 font-semibold">{result?.time}</span>
          </p>
          <span
            className="mt-5 px-5 py-1.5 rounded-full text-sm font-semibold tracking-wide"
            style={{
              background:
                result?.action === "checkout"
                  ? "rgba(59,130,246,0.15)"
                  : "rgba(34,197,94,0.15)",
              color:
                result?.action === "checkout" ? "#93c5fd" : "#86efac",
              border:
                result?.action === "checkout"
                  ? "1px solid rgba(59,130,246,0.3)"
                  : "1px solid rgba(34,197,94,0.3)",
            }}
          >
            {result?.action === "checkout"
              ? "Check-out Successful"
              : "Check-in Successful"}
          </span>
        </div>
      ) : phase === "confirm" || phase === "recording" ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center"
          style={{
            width: "clamp(32.5em, 33vw, 48.75em)",
            height: "clamp(24.375em, 24.75vw, 36.5em)",
            background: "rgba(10,16,26,0.95)",
            border:
              identified?.action === "checkout"
                ? "1px solid rgba(59,130,246,0.35)"
                : "1px solid rgba(6,182,212,0.35)",
            boxShadow:
              identified?.action === "checkout"
                ? "0 0 60px rgba(59,130,246,0.08)"
                : "0 0 60px rgba(6,182,212,0.08)",
          }}
        >
          {/* Captured photo as avatar */}
          {capturedFrame ? (
            <div className="mb-5">
              <img
                src={`data:image/jpeg;base64,${capturedFrame}`}
                alt="You"
                className="w-20 h-20 rounded-full object-cover border-2"
                style={{
                  borderColor: identified?.action === "checkout" ? "rgba(59,130,246,0.4)" : "rgba(6,182,212,0.4)",
                  boxShadow: identified?.action === "checkout" ? "0 0 24px rgba(59,130,246,0.2)" : "0 0 24px rgba(6,182,212,0.2)",
                }}
              />
            </div>
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
              style={{
                background:
                  identified?.action === "checkout"
                    ? "rgba(59,130,246,0.12)"
                    : "rgba(6,182,212,0.12)",
                boxShadow:
                  identified?.action === "checkout"
                    ? "0 0 32px rgba(59,130,246,0.2)"
                    : "0 0 32px rgba(6,182,212,0.2)",
              }}
            >
              <svg
                className={`w-10 h-10 ${identified?.action === "checkout" ? "text-blue-400" : "text-cyan-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>
          )}
          <p className="text-2xl font-bold text-white tracking-tight mb-1">
            {identified?.trainee_name}
          </p>
          <p className="text-gray-200 text-sm font-medium mb-10 tracking-wide">
            {identified?.action === "checkout"
              ? "You are about to check out"
              : "You are about to check in"}
          </p>

          {phase === "recording" ? (
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "rgba(6,182,212,0.2)", borderTopColor: "transparent" }}
              >
                <div className="w-full h-full rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              </div>
              <p className="text-cyan-400 text-sm font-medium tracking-widest uppercase animate-pulse">
                Recording…
              </p>
            </div>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={handleConfirm}
                className="font-semibold text-base py-3.5 px-10 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer tracking-wide"
                style={
                  identified?.action === "checkout"
                    ? {
                        background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                        color: "#fff",
                        boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
                      }
                    : {
                        background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                        color: "#fff",
                        boxShadow: "0 4px 20px rgba(34,197,94,0.4)",
                      }
                }
              >
                {identified?.action === "checkout"
                  ? "Confirm Check-out"
                  : "Confirm Check-in"}
              </button>
              <button
                onClick={handleCancel}
                className="font-semibold text-base py-3.5 px-8 rounded-xl transition-all duration-200 cursor-pointer tracking-wide"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.color = "#f8fafc";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.color = "#e2e8f0";
                }}
              >
                Not Me
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className="relative"
          style={{ width: "clamp(32.5em, 33vw, 48.75em)" }}
        >
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "user", width: 1280, height: 960 }}
            className="rounded-2xl w-full object-cover"
            style={{
              aspectRatio: "4/3",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 0 0 1px rgba(6,182,212,0.08), 0 24px 60px rgba(0,0,0,0.5)",
            }}
          />

          {/* Corner bracket overlays */}
          {["top-0 left-0 border-t-2 border-l-2 rounded-tl-lg", "top-0 right-0 border-t-2 border-r-2 rounded-tr-lg", "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg", "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg"].map(
            (cls, i) => (
              <div
                key={i}
                className={`absolute w-9 h-9 pointer-events-none ${cls}`}
                style={{
                  margin: "3rem",
                  borderColor: "#22d3ee",
                  filter: "drop-shadow(0 0 4px rgba(6,182,212,0.7))",
                }}
              />
            )
          )}

          {/* Scanning overlay */}
          {phase === "scanning" && (
            <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center" style={{ background: "rgba(6,10,16,0.72)", backdropFilter: "blur(2px)" }}>
              <div
                className="w-16 h-16 rounded-full border-2 border-t-transparent animate-spin mb-5"
                style={{ borderColor: "rgba(6,182,212,0.3)", borderTopColor: "#22d3ee", boxShadow: "0 0 20px rgba(6,182,212,0.3)" }}
              />
              <p className="text-cyan-400 text-base font-semibold tracking-widest uppercase animate-pulse">
                Scanning…
              </p>
            </div>
          )}

          {/* Error overlay */}
          {phase === "error" && (
            <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center" style={{ background: "rgba(6,10,16,0.75)", backdropFilter: "blur(2px)" }}>
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  boxShadow: "0 0 32px rgba(239,68,68,0.2)",
                }}
              >
                <svg
                  className="w-10 h-10 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-red-300 text-base font-semibold tracking-wide text-center max-w-xs">
                {errorMsg || "Face not recognized. Try again."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Scan button + hint */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {phase !== "confirm" && phase !== "recording" && phase !== "success" && (
          <>
            <button
              onClick={handleScan}
              disabled={phase !== "idle"}
              className="font-semibold text-base py-4 px-16 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer disabled:cursor-not-allowed tracking-wider"
              style={
                phase !== "idle"
                  ? { background: "rgba(255,255,255,0.06)", color: "#4b5563", border: "1px solid rgba(255,255,255,0.06)" }
                  : {
                      background: "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)",
                      color: "#fff",
                      boxShadow: "0 4px 24px rgba(6,182,212,0.45), 0 0 0 1px rgba(6,182,212,0.2)",
                    }
              }
            >
              {phase === "scanning" ? "Scanning…" : "Scan Face"}
            </button>
            <p className="text-gray-300 text-sm tracking-wide">
              Look straight at the camera and stay still
            </p>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 flex items-center gap-5">
        <a
          href="/register"
          className="text-gray-300 hover:text-cyan-300 text-sm tracking-wide transition duration-200"
        >
          New here? Register as a trainee
        </a>
        <span className="text-gray-500">•</span>
        <a
          href="/history"
          className="text-gray-300 hover:text-cyan-300 text-sm tracking-wide transition duration-200"
        >
          View my attendance
        </a>
      </div>
    </div>
  );
}
