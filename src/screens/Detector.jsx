import { useEffect, useRef, useState } from "react";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { startVideoStream, stopVideoStream, analyzeImageData } from "../utils/camera";

export default function Detector({ t }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [imageURL, setImageURL] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => () => { stopVideoStream(videoRef.current); }, []);

  async function startCam() {
    try {
      await startVideoStream(videoRef.current);
      setStreaming(true);
    } catch {
      alert("Camera not available. Try Upload Photo.");
    }
  }
  function stopCam() { stopVideoStream(videoRef.current); setStreaming(false); }

  function captureAndAnalyze() {
    const video = videoRef.current, canvas = canvasRef.current; if (!video || !canvas) return;
    const w = video.videoWidth || 320, h = video.videoHeight || 240; canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.drawImage(video, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data; setImageURL(canvas.toDataURL("image/png")); setResult(analyzeImageData(data));
  }

  function onUpload(e) {
    const f = e.target.files?.[0]; if (!f) return; const reader = new FileReader(); reader.onload = () => setImageURL(reader.result); reader.readAsDataURL(f); setResult(null);
  }
  function analyzeUploaded() {
    if (!imageURL) return; const img = new Image(); img.onload = () => {
      const canvas = canvasRef.current, ctx = canvas.getContext("2d");
      canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data; setResult(analyzeImageData(data));
    }; img.src = imageURL;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">{t.detect || "Detect"}</h1>
      <Card>
        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              {!streaming ? (<PrimaryButton onClick={startCam}>{t.startCamera || "Start Camera"}</PrimaryButton>) : (<PrimaryButton onClick={stopCam}>{t.stopCamera || "Stop Camera"}</PrimaryButton>)}
              <label className="rounded-xl px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold shadow hover:shadow-md cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={onUpload} />{t.uploadPhoto || "Upload Photo"}
              </label>
              {streaming && <PrimaryButton onClick={captureAndAnalyze}>{t.analyze || "Analyze"}</PrimaryButton>}
              {imageURL && !streaming && <PrimaryButton onClick={analyzeUploaded}>{t.analyze || "Analyze"}</PrimaryButton>}
            </div>
            <video ref={videoRef} className="w-full rounded-xl border" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="space-y-3">
            <Card className="bg-emerald-50/60"><div className="text-xs text-gray-700">Early guidance only. Confirm with local KVK/extension officer.</div></Card>
            {imageURL && (<Card><div className="font-semibold mb-2">Preview</div><img src={imageURL} alt="preview" className="w-full rounded-xl border" /></Card>)}
            {result && (
              <Card>
                <div className="font-semibold mb-2">{t.predictedDisease || "Predicted issue"}</div>
                <div className="text-emerald-700 font-semibold">{result.label}</div>
                <div className="text-sm text-gray-600">{(t.confidence || "Confidence")}: {(result.conf * 100).toFixed(0)}%</div>
                <div className="text-sm mt-2"><span className="font-semibold">{t.recommendation || "Recommendation"}:</span> {result.advice}</div>
              </Card>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
