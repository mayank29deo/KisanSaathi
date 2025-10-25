import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import LoadingBar from "../components/LoadingBar";
import { startVideoStream, stopVideoStream, analyzeImageData } from "../utils/camera";

export default function Detector({ t }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [imageURL, setImageURL] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Stop camera stream on component unmount
  useEffect(() => () => stopVideoStream(videoRef.current), []);

  async function startCam() {
    try {
      await startVideoStream(videoRef.current);
      setStreaming(true);
    } catch {
      alert("Camera not available. Try Upload Photo.");
    }
  }

  function stopCam() {
    stopVideoStream(videoRef.current);
    setStreaming(false);
  }

  async function captureAndAnalyze() {
    const video = videoRef.current,
      canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || 320,
      h = video.videoHeight || 240;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    setImageURL(canvas.toDataURL("image/png"));
    setLoading(true);
    setResult(null);

    // Simulate ML model delay
    await new Promise((res) => setTimeout(res, 2000));
    setResult(analyzeImageData(data));
    setLoading(false);
  }

  function onUpload(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImageURL(reader.result);
    reader.readAsDataURL(f);
    setResult(null);
  }

  async function analyzeUploaded() {
    if (!imageURL) return;
    const img = new Image();
    img.onload = async () => {
      const canvas = canvasRef.current,
        ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      setLoading(true);
      setResult(null);
      await new Promise((res) => setTimeout(res, 2000));
      setResult(analyzeImageData(data));
      setLoading(false);
    };
    img.src = imageURL;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-lime-100 p-6 space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-green-800"
      >
        🌱 {t.detect || "AI Crop Detector (फसल पहचान)"}
      </motion.h1>

      <Card>
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Left Section: Camera + Upload */}
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {!streaming ? (
                <PrimaryButton onClick={startCam}>
                  {t.startCamera || "📷 Start Camera"}
                </PrimaryButton>
              ) : (
                <PrimaryButton onClick={stopCam}>
                  {t.stopCamera || "🛑 Stop Camera"}
                </PrimaryButton>
              )}

              <label className="rounded-xl px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold shadow hover:shadow-md cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
                {t.uploadPhoto || "📸 Upload Photo"}
              </label>

              {streaming && (
                <PrimaryButton onClick={captureAndAnalyze}>
                  {t.analyze || "🔍 Analyze"}
                </PrimaryButton>
              )}

              {imageURL && !streaming && (
                <PrimaryButton onClick={analyzeUploaded}>
                  {t.analyze || "🔍 Analyze"}
                </PrimaryButton>
              )}
            </div>

            <video
              ref={videoRef}
              className="w-full rounded-xl border border-green-300 shadow-md mt-2"
              autoPlay
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Right Section: Results */}
          <div className="space-y-4">
            <Card className="bg-emerald-50/60">
              <div className="text-xs text-gray-700">
                📢 Early guidance only. Confirm with local KVK / extension officer.
              </div>
            </Card>

            {imageURL && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <div className="font-semibold mb-2">Preview (पूर्वावलोकन)</div>
                  <img
                    src={imageURL}
                    alt="preview"
                    className="w-full rounded-xl border border-gray-200"
                  />
                </Card>
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="bg-green-50">
                  <div className="font-semibold mb-2">
                    {t.predictedDisease || "Predicted Issue (अनुमानित समस्या)"}
                  </div>
                  <div className="text-emerald-700 font-semibold text-lg">{result.label}</div>
                  <div className="text-sm text-gray-600">
                    {(t.confidence || "Confidence")}: {(result.conf * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm mt-2">
                    <span className="font-semibold">
                      {t.recommendation || "Recommendation"}:
                    </span>{" "}
                    {result.advice}
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </Card>

      {/* Loading Overlay */}
      {loading && (
        <LoadingBar
          overlay
          type="spinner"
          text="Analyzing image... कृपया प्रतीक्षा करें 🌾"
        />
      )}
    </div>
  );
}
