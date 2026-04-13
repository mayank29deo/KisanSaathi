/**
 * Vercel Serverless Function: POST /api/analyze-crop
 *
 * Receives a base64-encoded crop/leaf image, sends it to Claude
 * claude-sonnet-4-5 via the Anthropic API, and returns a structured
 * disease-detection JSON result.
 *
 * Required env variable (set in Vercel dashboard):
 *   ANTHROPIC_API_KEY=sk-ant-...
 */

const Anthropic = require("@anthropic-ai/sdk");

const SYSTEM_PROMPT = `You are an expert agricultural plant pathologist with 20+ years of experience diagnosing crop diseases across India. You specialise in field crops (rice, wheat, maize, cotton, sugarcane, pulses), vegetables (tomato, brinjal, chilli, potato, onion), and fruit crops common to Indian farming.

When given a crop or plant leaf image, you return ONLY a valid JSON object — no markdown, no explanation, no preamble. The JSON must have exactly this structure:

{
  "crop": "identified crop name in English (e.g. Rice, Tomato, Wheat, Mango)",
  "isHealthy": true or false,
  "disease": "specific disease name or 'None' if healthy (e.g. Early Blight, Leaf Rust, Mosaic Virus, Powdery Mildew)",
  "pathogen": "causative organism if known (e.g. Alternaria solani, Puccinia triticina) or null",
  "severity": "None" or "Mild" or "Moderate" or "Severe",
  "confidence": integer between 55 and 95 representing your confidence percentage,
  "symptoms": ["observed symptom 1", "observed symptom 2", "observed symptom 3"],
  "treatment": [
    "specific actionable treatment step 1",
    "specific actionable treatment step 2",
    "specific actionable treatment step 3"
  ],
  "prevention": [
    "prevention tip 1",
    "prevention tip 2"
  ],
  "urgency": "a short sentence about urgency, e.g. 'Apply fungicide within 48 hours' or 'No urgent action needed'",
  "organicOption": "one organic/low-cost treatment alternative available to Indian farmers, or null",
  "notes": "any important additional observation, or null"
}

Guidelines:
- Focus on diseases common in Indian agriculture (blight, rust, smut, mosaic, leaf curl, yellow vein, downy/powdery mildew, bacterial wilt, anthracnose, sheath blight etc.)
- Treatments must be practical and specific — mention actual fungicide/pesticide names used in India (e.g. Mancozeb, Carbendazim, Chlorpyrifos, Trichoderma)
- If the image is blurry, dark, or not clearly a plant, set confidence to 55, isHealthy to true, disease to "Image unclear — unable to diagnose", severity to "None"
- If the image is clearly not a plant/crop, set disease to "Not a plant image"
- Never hallucinate — if uncertain, lower confidence and note it in the notes field`;

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageBase64, mimeType = "image/jpeg" } = req.body || {};

  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 is required" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: "Analyse this crop/plant image and return the JSON diagnosis exactly as specified.",
            },
          ],
        },
      ],
    });

    const raw = message.content[0]?.text?.trim() || "";

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let diagnosis;
    try {
      diagnosis = JSON.parse(cleaned);
    } catch {
      // If JSON parse fails, return a safe fallback
      diagnosis = {
        crop: "Unknown",
        isHealthy: true,
        disease: "Could not parse AI response",
        pathogen: null,
        severity: "None",
        confidence: 55,
        symptoms: [],
        treatment: ["Please try again with a clearer image."],
        prevention: [],
        urgency: "No urgent action needed",
        organicOption: null,
        notes: "Analysis failed — retry with a well-lit, close-up photo of the leaf.",
      };
    }

    return res.status(200).json({ ok: true, diagnosis });
  } catch (err) {
    console.error("Claude API error:", err?.message);
    return res.status(500).json({
      ok: false,
      error: err?.message || "AI analysis failed. Please try again.",
    });
  }
};
