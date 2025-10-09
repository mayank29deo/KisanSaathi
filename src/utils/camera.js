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
 * Analyzes pixel data from an ImageData array.
 * Basic heuristic: green vs brown pixels → leaf health.
 * Returns label, confidence, and suggestion.
 */
export function analyzeImageData(data) {
  let greenish = 0,
    brownish = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    if (g > r + 10 && g > b + 10) greenish++;
    if (r > g && g > b && r - g < 50 && g - b < 50 && r > 80) brownish++;
  }

  const total = data.length / 4 || 1;
  const brownRatio = brownish / total;
  const greenRatio = greenish / total;

  let label = "Healthy Leaf";
  let confidence = Math.max(greenRatio, 0.7);
  let advice = "Your plant appears healthy. Maintain irrigation and fertilizer balance.";

  if (brownRatio > 0.25) {
    label = "Leaf Blight or Rust (Possible)";
    confidence = Math.min(0.9, 0.6 + brownRatio);
    advice =
      "Possible fungal infection detected. Remove affected leaves and spray copper-based fungicide.";
  } else if (greenRatio < 0.3) {
    label = "Nutrient Deficiency (Possible)";
    confidence = 0.65;
    advice = "Soil nutrient imbalance. Conduct a soil test and apply balanced NPK with micronutrients.";
  }

  return { label, confidence, advice };
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
