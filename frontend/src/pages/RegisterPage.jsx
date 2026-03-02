import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { useNavigate } from "react-router-dom";
import { registerSelf } from "../services/api";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// All angles are in degrees from the facial transformation matrix.
// Positive yaw = face turning to the camera-left (user's right).
// Positive pitch = face tilting downward.
const POSES = [
  {
    label: "Look straight at the camera",
    icon: "●",
    yaw: [-13, 13],
    pitch: [-13, 13],
  },
  {
    label: "Turn your head slightly left",
    icon: "←",
    yaw: [20, Infinity],
    pitch: [-20, 20],
  },
  {
    label: "Turn your head slightly right",
    icon: "→",
    yaw: [-Infinity, -20],
    pitch: [-20, 20],
  },
  {
    label: "Tilt your head slightly up",
    icon: "↑",
    yaw: [-15, 15],
    pitch: [-Infinity, -18],
  },
  {
    label: "Look straight at the camera again",
    icon: "●",
    yaw: [-13, 13],
    pitch: [-13, 13],
  },
];

const HOLD_MS = 1000;

// Reject detection when the face geometry looks like a hand or occluded region.
function isValidFace(landmarks) {
  const lEye = landmarks[33];
  const rEye = landmarks[263];
  const chin = landmarks[152];
  const mouth = landmarks[13]; // upper inner lip

  const ecY = (lEye.y + rEye.y) / 2;
  const ew = Math.abs(rEye.x - lEye.x);

  // Eyes must be clearly apart — rejects hands/objects
  if (ew < 0.07) return false;
  // Chin must be well below the eyes
  if (chin.y < ecY + 0.12) return false;
  // Mouth must be between eyes and chin, not above eyes (rejects upside-down)
  if (mouth.y < ecY) return false;

  return true;
}

// Extract yaw & pitch in degrees from MediaPipe's row-major 4×4 transformation matrix.
// MediaPipe stores the matrix row-by-row (proto repeated float).
// Column 2 of the rotation block = where the face's forward (+Z canonical) axis points
// in camera space: (m[2], m[6], m[10]).
//   fwdX > 0  →  face turns to camera-right  →  user turns LEFT  (mirrored)
//   fwdX < 0  →  user turns RIGHT
//   fwdY < 0  →  face tilts up  (camera Y is downward)
function computePoseFromMatrix(matrixData) {
  const m = matrixData;
  const DEG = 180 / Math.PI;
  const fwdX = m[2];   // camera-right component of face-forward
  const fwdY = m[6];   // camera-down  component of face-forward
  const fwdZ = m[10];  // camera-depth component of face-forward (≈1 when face-on)
  return {
    yaw:   Math.atan2(fwdX, fwdZ) * DEG,  // + = user turns left, − = user turns right
    pitch: Math.atan2(fwdY, fwdZ) * DEG,  // + = tilt down,       − = tilt up
  };
}

export default function RegisterPage() {
  const webcamRef = useRef(null);
  const navigate = useNavigate();

  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const holdStartRef = useRef(null);
  const flashRef = useRef(false);
  const poseIdxRef = useRef(0);
  const framesCollected = useRef([]);
  const lastTsRef = useRef(0);

  const [phase, setPhase] = useState("loading");
  const [modelLoaded, setModelLoaded] = useState(false);
  const [poseIndex, setPoseIndex] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [holdPct, setHoldPct] = useState(0);
  const [faceStatus, setFaceStatus] = useState("none");
  const [flash, setFlash] = useState(false);

  // Load FaceLandmarker from CDN
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
        );
        if (cancelled) return;
        const lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFacialTransformationMatrixes: true,
        });
        if (cancelled) return;
        landmarkerRef.current = lm;
        setModelLoaded(true);
        setPhase("camera");
      } catch (e) {
        console.error("FaceLandmarker load failed:", e);
        if (!cancelled) setPhase("camera");
      }
    })();
    return () => {
      cancelled = true;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  // Detection loop
  useEffect(() => {
    if (phase !== "camera") return;

    const loop = () => {
      if (flashRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const video = webcamRef.current?.video;
      const lm = landmarkerRef.current;

      if (video && lm && video.readyState >= 2) {
        const now = performance.now();
        if (now <= lastTsRef.current) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        lastTsRef.current = now;

        try {
          const result = lm.detectForVideo(video, now);

          if (result.faceLandmarks?.length > 0) {
            const landmarks = result.faceLandmarks[0];
            if (!isValidFace(landmarks)) {
              setFaceStatus("none");
              holdStartRef.current = null;
              setHoldPct(0);
              rafRef.current = requestAnimationFrame(loop);
              return;
            }
            const matrixResult = result.facialTransformationMatrixes;
            if (!matrixResult?.length) {
              rafRef.current = requestAnimationFrame(loop);
              return;
            }
            const pose = computePoseFromMatrix(matrixResult[0].data);
            const cfg = POSES[poseIdxRef.current];
            const matches =
              pose.yaw >= cfg.yaw[0] &&
              pose.yaw <= cfg.yaw[1] &&
              pose.pitch >= cfg.pitch[0] &&
              pose.pitch <= cfg.pitch[1];

            if (matches) {
              setFaceStatus("match");
              if (!holdStartRef.current) holdStartRef.current = now;
              const pct = Math.min((now - holdStartRef.current) / HOLD_MS, 1);
              setHoldPct(pct);

              if (pct >= 1) {
                const shot = webcamRef.current?.getScreenshot();
                if (shot) {
                  framesCollected.current.push(shot.split(",")[1]);
                  setFrameCount(framesCollected.current.length);

                  flashRef.current = true;
                  setFlash(true);

                  setTimeout(() => {
                    flashRef.current = false;
                    setFlash(false);
                    holdStartRef.current = null;
                    setHoldPct(0);
                    setFaceStatus("none");

                    if (framesCollected.current.length >= POSES.length) {
                      setPhase("form");
                    } else {
                      const next = poseIdxRef.current + 1;
                      poseIdxRef.current = next;
                      setPoseIndex(next);
                    }
                  }, 600);
                }
              }
            } else {
              setFaceStatus("wrong");
              holdStartRef.current = null;
              setHoldPct(0);
            }
          } else {
            setFaceStatus("none");
            holdStartRef.current = null;
            setHoldPct(0);
          }
        } catch {
          // detectForVideo can fail if called too rapidly
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  // Redirect after success
  useEffect(() => {
    if (phase !== "success") return;
    const t = setTimeout(() => navigate("/"), 2000);
    return () => clearTimeout(t);
  }, [phase, navigate]);

  const manualCapture = () => {
    const shot = webcamRef.current?.getScreenshot();
    if (!shot) return;

    framesCollected.current.push(shot.split(",")[1]);
    setFrameCount(framesCollected.current.length);
    setFlash(true);
    setTimeout(() => setFlash(false), 350);

    if (framesCollected.current.length >= POSES.length) {
      setTimeout(() => setPhase("form"), 400);
    } else {
      const next = poseIdxRef.current + 1;
      poseIdxRef.current = next;
      setPoseIndex(next);
      holdStartRef.current = null;
      setHoldPct(0);
      setFaceStatus("none");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    setPhase("submitting");
    try {
      await registerSelf(
        name.trim(),
        framesCollected.current,
        email.trim() || undefined,
      );
      setPhase("success");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
      setPhase("error");
    }
  };

  const restart = () => {
    framesCollected.current = [];
    setFrameCount(0);
    setPoseIndex(0);
    poseIdxRef.current = 0;
    holdStartRef.current = null;
    lastTsRef.current = 0;
    setHoldPct(0);
    setFaceStatus("none");
    setName("");
    setEmail("");
    setError("");
    setFlash(false);
    setPhase("camera");
  };

  const borderColor =
    faceStatus === "match"
      ? "border-green-500"
      : faceStatus === "wrong"
        ? "border-yellow-500/60"
        : "border-gray-700";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white relative">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center px-8 py-4">
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
      </div>

      <h1 className="text-3xl font-bold mb-2 tracking-wide">
        Register as Trainee
      </h1>
      <p className="text-gray-300 text-sm mb-8">
        Follow the pose instructions to capture your face from different angles
      </p>

      {/* ---- LOADING ---- */}
      {phase === "loading" && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-100">Loading face detection model…</p>
        </div>
      )}

      {/* ---- CAMERA ---- */}
      {phase === "camera" && (
        <div className="w-full max-w-md flex flex-col items-center gap-5">
          <div className="relative w-full">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                facingMode: "user",
                width: 480,
                height: 360,
              }}
              className={`rounded-xl border-2 ${borderColor} w-full transition-colors duration-200`}
            />
            {/* Flash overlay */}
            {flash && (
              <div className="absolute inset-0 bg-white/30 rounded-xl pointer-events-none" />
            )}
            {/* Hold progress ring */}
            {faceStatus === "match" && holdPct > 0 && (
              <div className="absolute bottom-3 right-3">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="#374151"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="3"
                    strokeDasharray={`${holdPct * 94.25} 94.25`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Pose instruction */}
          <div className="text-center">
            <p className="text-xs text-gray-300 mb-1">
              Step {poseIndex + 1} of {POSES.length}
            </p>
            <p className="text-lg font-semibold text-white flex items-center justify-center gap-2">
              <span className="text-2xl">{POSES[poseIndex].icon}</span>
              {POSES[poseIndex].label}
            </p>
            <p className="text-sm mt-1.5 text-gray-100">
              {faceStatus === "none"
                ? "Position your face in front of the camera"
                : faceStatus === "wrong"
                  ? "Almost there — adjust your pose"
                  : "Hold still…"}
            </p>
          </div>

          {/* Step dots */}
          <div className="flex gap-2.5">
            {POSES.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                  i < frameCount
                    ? "bg-green-500"
                    : i === poseIndex
                      ? faceStatus === "match"
                        ? "bg-green-500 animate-pulse"
                        : "bg-cyan-500"
                      : "bg-gray-700"
                }`}
              />
            ))}
          </div>

          {/* Manual capture fallback */}
          <button
            onClick={manualCapture}
            className="text-gray-400 hover:text-gray-100 text-xs transition cursor-pointer"
          >
            {modelLoaded
              ? "Pose not detected? Capture manually"
              : "Auto-detection unavailable — tap to capture"}
          </button>
        </div>
      )}

      {/* ---- FORM ---- */}
      {phase === "form" && (
        <div className="w-full max-w-md flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {POSES.map((p, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center text-green-400 text-sm font-bold border border-green-500/20"
                title={p.label}
              >
                {p.icon}
              </div>
            ))}
          </div>
          <p className="text-green-400 text-sm">
            {POSES.length} poses captured!
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Enter your unique name"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional — for check-in/out notifications)"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleSubmit}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 rounded-lg transition cursor-pointer"
          >
            Register
          </button>
          <button
            onClick={restart}
            className="text-gray-300 hover:text-white text-sm transition cursor-pointer"
          >
            Retake photos
          </button>
        </div>
      )}

      {/* ---- SUBMITTING ---- */}
      {phase === "submitting" && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-100">Registering…</p>
        </div>
      )}

      {/* ---- SUCCESS ---- */}
      {phase === "success" && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-4xl">
            ✓
          </div>
          <p className="text-green-400 text-xl font-semibold">
            Registration successful!
          </p>
          <p className="text-gray-200 text-sm">Redirecting to kiosk…</p>
        </div>
      )}

      {/* ---- ERROR ---- */}
      {phase === "error" && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-4xl">
            ✕
          </div>
          <p className="text-red-400 text-lg font-semibold">{error}</p>
          <button
            onClick={restart}
            className="mt-2 bg-gray-800 hover:bg-gray-700 text-white py-2 px-6 rounded-lg transition cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Footer */}
      <a
        href="/"
        className="mt-8 text-gray-300 hover:text-cyan-300 text-sm transition"
      >
        ← Back to Kiosk
      </a>
    </div>
  );
}
