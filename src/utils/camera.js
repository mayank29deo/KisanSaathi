/* ----------------------------------------------------
   📸 Kisan Saathi Camera Utilities
   Used by Detector.jsx
   Handles webcam stream + leaf health analysis
----------------------------------------------------- */

/**
 * Starts the user’s webcam and attaches the stream
 * to the provided <video> element.
 */
export async function startVideoStream(videoEl) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }, // rear camera on mobile
      audio: false,
    });
    videoEl.srcObject = stream;
    await videoEl.play();
    return stream;
  } catch (err) {
    console.error("Camera access error:", err);
    throw new Error("Could not start camera");
  }
}

/**
 * Stops the current webcam stream and detaches it.
 */
export function stopVideoStream(videoEl) {
  try {
    if (videoEl && videoEl.srcObject) {
      const tracks = videoEl.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      videoEl.srcObject = null;
    }
  } catch (err) {
    console.warn("Stop camera error:", err);
  }
}

/**
 * Sends a base64 image to the /api/analyze-crop serverless function
 * which calls Claude vision for accurate disease detection.
 *
 * @param {string} dataUrl  — full data URL (data:image/jpeg;base64,...)
 * @returns {Promise<object>}  — structured diagnosis from Claude
 */
export async function analyzeCropWithClaude(dataUrl) {
  // Split "data:image/jpeg;base64,<data>" → mimeType + pure base64
  const [header, imageBase64] = dataUrl.split(",");
  const mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg";

  const res = await fetch("/api/analyze-crop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Analysis failed");
  return json.diagnosis;
}

/**
 * Captures current video frame → ImageData object.
 */
export function captureFrame(videoEl) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const w = videoEl.videoWidth || 320;
  const h = videoEl.videoHeight || 240;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(videoEl, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  return { imageData, dataUrl: canvas.toDataURL("image/png") };
}

/**
 * Utility to analyze a given uploaded image file.
 * Returns a dataURL + analysis result.
 */
export async function analyzeUploadedFile(file) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const result = analyzeImageData(imageData.data);
          resolve({ dataUrl: reader.result, result });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
}
