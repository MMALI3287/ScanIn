import { useRef, useCallback } from "react";
import Webcam from "react-webcam";

export default function CameraCapture({ onCapture, buttonText = "Capture" }) {
  const webcamRef = useRef(null);

  const capture = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (screenshot) {
      const base64 = screenshot.split(",")[1];
      onCapture(base64);
    }
  }, [onCapture]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: "user", width: 480, height: 360 }}
        className="rounded-lg border-2 border-gray-300"
      />
      <button
        onClick={capture}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
      >
        {buttonText}
      </button>
    </div>
  );
}
