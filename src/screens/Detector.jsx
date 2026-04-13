import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { startVideoStream, stopVideoStream, analyzeCropWithClaude } from "../utils/camera";

const SEVERITY_CONFIG = {
  None:     { color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "None" },
  Mild:     { color: "bg-yellow-100  text-yellow-700  border-yellow-200",  dot: "bg-yellow-400",  label: "Mild" },
  Moderate: { color: "bg-orange-100  text-orange-700  border-orange-200",  dot: "bg-orange-500",  label: "Moderate" },
  Severe:   { color: "bg-red-100     text-red-700     border-red-200",     dot: "bg-red-600",     label: "Severe" },
};

export default function Detector({ t }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const fileRef    = useRef(null);

  const [streaming,  setStreaming]  = useState(false);
  const [imageURL,   setImageURL]   = useState(null);   // preview
  const [diagnosis,  setDiagnosis]  = useState(null);   // Claude result
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => () => { stopVideoStream(videoRef.current); }, []);

  /* ── Camera ──────────────────────────────────────────────────── */
  async function startCam() {
    try {
      await startVideoStream(videoRef.current);
      setStreaming(true);
      setImageURL(null);
      setDiagnosis(null);
    } catch {
      setError("Camera not available. Please use Upload Photo instead.");
    }
  }
  function stopCam() { stopVideoStream(videoRef.current); setStreaming(false); }

  function captureFrame() {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 640, h = video.videoHeight || 480;
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setImageURL(dataUrl);
    stopCam();
    analyze(dataUrl);
  }

  /* ── Upload ──────────────────────────────────────────────────── */
  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageURL(reader.result);
      setDiagnosis(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function analyzeUploaded() {
    if (imageURL) analyze(imageURL);
  }

  /* ── Core analysis call ──────────────────────────────────────── */
  async function analyze(dataUrl) {
    setLoading(true);
    setDiagnosis(null);
    setError(null);
    try {
      const result = await analyzeCropWithClaude(dataUrl);
      setDiagnosis(result);
    } catch (err) {
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const severityCfg = SEVERITY_CONFIG[diagnosis?.severity] || SEVERITY_CONFIG.None;

  return (
    <motion.div
      key="detect"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="pb-24 space-y-5"
    >
      {/* Header */}
      <div className="pt-2 px-1">
        <h1 className="text-2xl font-extrabold text-gray-900">
          📷 {t?.detect || "Crop Disease Detection"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {t?.detectPrompt || "Capture or upload a leaf photo — AI identifies the disease instantly."}
        </p>
      </div>

      {/* Camera / Upload Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Video element — always in DOM so videoRef.current is never null */}
        <div className={streaming ? "relative" : "hidden"}>
          <video
            ref={videoRef}
            className="w-full max-h-72 object-cover bg-black"
            autoPlay muted playsInline
          />
          {streaming && (
            <div className="absolute inset-0 flex items-end justify-center pb-4">
              <button
                onClick={captureFrame}
                className="w-16 h-16 rounded-full bg-white shadow-xl border-4 border-emerald-500 flex items-center justify-center active:scale-90 transition-transform"
              >
                <span className="w-10 h-10 rounded-full bg-emerald-500 block" />
              </button>
            </div>
          )}
        </div>

        {/* Image preview */}
        {imageURL && !streaming && (
          <div className="relative">
            <img src={imageURL} alt="preview" className="w-full max-h-72 object-cover" />
            {loading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-white text-sm font-semibold">Analysing with AI…</p>
              </div>
            )}
          </div>
        )}

        {/* Placeholder when nothing yet */}
        {!imageURL && !streaming && (
          <div className="h-48 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
            <div className="text-5xl mb-2 opacity-40">🌿</div>
            <p className="text-sm">Start camera or upload a leaf photo</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="p-4 flex gap-2 flex-wrap">
          {!streaming ? (
            <button
              onClick={startCam}
              className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl active:scale-95 transition-transform shadow-sm"
            >
              📷 {t?.startCamera || "Open Camera"}
            </button>
          ) : (
            <button
              onClick={stopCam}
              className="flex items-center gap-2 bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
            >
              ✕ {t?.stopCamera || "Cancel"}
            </button>
          )}

          <label className="flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer active:scale-95 transition-transform">
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
            🖼️ {t?.uploadPhoto || "Upload Photo"}
          </label>

          {imageURL && !streaming && !loading && (
            <button
              onClick={analyzeUploaded}
              className="flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl active:scale-95 transition-transform shadow-sm ml-auto"
            >
              ✨ {t?.analyze || "Re-analyse"}
            </button>
          )}
        </div>
      </div>

      {/* Canvas (hidden) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3"
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {[80, 60, 90, 70].map((w, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
                <div className={`h-4 bg-gray-100 rounded-full animate-pulse`} style={{ width: `${w}%` }} />
                <div className="h-3 bg-gray-100 rounded-full animate-pulse w-1/2" />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {diagnosis && !loading && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Hero card — crop + health status */}
            <div className={`rounded-2xl border p-5 ${
              diagnosis.isHealthy
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Crop Identified
                  </p>
                  <h2 className="text-2xl font-extrabold text-gray-900">{diagnosis.crop}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${severityCfg.color}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${severityCfg.dot}`} />
                      {diagnosis.isHealthy ? "Healthy Plant" : `${severityCfg.label} Severity`}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {diagnosis.confidence}% confidence
                    </span>
                  </div>
                </div>
                <div className="text-5xl flex-shrink-0">
                  {diagnosis.isHealthy ? "✅" : "🔴"}
                </div>
              </div>

              {/* Confidence bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>AI Confidence</span>
                  <span className="font-bold">{diagnosis.confidence}%</span>
                </div>
                <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${diagnosis.confidence}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      diagnosis.confidence >= 80 ? "bg-emerald-500" :
                      diagnosis.confidence >= 65 ? "bg-yellow-400" : "bg-orange-400"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Disease details (only if not healthy) */}
            {!diagnosis.isHealthy && diagnosis.disease && diagnosis.disease !== "None" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Disease</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{diagnosis.disease}</p>
                  {diagnosis.pathogen && (
                    <p className="text-xs text-gray-400 italic mt-0.5">Caused by: {diagnosis.pathogen}</p>
                  )}
                </div>

                {/* Symptoms */}
                {diagnosis.symptoms?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Symptoms Observed</p>
                    <div className="space-y-1.5">
                      {diagnosis.symptoms.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-orange-400 flex-shrink-0 mt-0.5">●</span>
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Urgency banner */}
            {!diagnosis.isHealthy && diagnosis.urgency && diagnosis.urgency !== "No urgent action needed" && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <span className="text-xl flex-shrink-0">⏰</span>
                <p className="text-sm font-semibold text-red-700">{diagnosis.urgency}</p>
              </div>
            )}

            {/* Treatment steps */}
            {diagnosis.treatment?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {t?.recommendation || "Treatment Steps"}
                </p>
                <div className="space-y-3">
                  {diagnosis.treatment.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Organic option */}
                {diagnosis.organicOption && (
                  <div className="mt-4 flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl p-3">
                    <span className="text-base flex-shrink-0">🌿</span>
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-0.5">Organic / Low-cost Option</p>
                      <p className="text-xs text-green-800">{diagnosis.organicOption}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Prevention tips */}
            {diagnosis.prevention?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Prevention Tips
                </p>
                <div className="space-y-2">
                  {diagnosis.prevention.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-emerald-500 flex-shrink-0 mt-0.5">✓</span>
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {diagnosis.notes && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                <span className="text-base flex-shrink-0">💡</span>
                <p className="text-xs text-amber-800 leading-relaxed">{diagnosis.notes}</p>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-gray-400 text-center px-2 leading-relaxed">
              {t?.detectorDisclaimer || "AI diagnosis is indicative. Confirm with your local KVK or agriculture officer before applying treatments."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
