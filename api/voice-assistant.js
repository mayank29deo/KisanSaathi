/**
 * Vercel Serverless Function: POST /api/voice-assistant
 *
 * Receives a farmer's question (transcribed from voice) and the language,
 * sends it to Claude as an agricultural expert, returns a structured answer.
 *
 * Required env: ANTHROPIC_API_KEY
 */

const Anthropic = require("@anthropic-ai/sdk");

const SYSTEM_PROMPT = `You are "Kisan Saathi AI" — a friendly, expert agricultural assistant for Indian farmers. You have deep knowledge of Indian farming practices, crops, soil health, weather patterns, government schemes, market prices, livestock care, pest management, organic farming, and rural livelihoods.

RULES:
1. Always reply in the SAME LANGUAGE the farmer speaks. If they ask in Hindi, answer in Hindi. Bengali → Bengali. English → English. Mixed → match their mix.
2. Keep answers SHORT and practical — 3-5 bullet points max. Farmers are busy.
3. Use simple, everyday language — avoid technical jargon unless explaining it.
4. When recommending chemicals/pesticides, ALWAYS mention the generic name + one organic alternative.
5. For government schemes, give the scheme name, one-line benefit, and how to apply.
6. For weather/season questions, answer for the current Indian agricultural calendar.
7. If the question is unclear or not agriculture-related, gently redirect to farming topics.
8. End with one actionable next step the farmer can take TODAY.

Return a JSON object with this structure:
{
  "answer": "your main answer text (in the farmer's language, use line breaks for readability)",
  "category": "crops" | "soil" | "weather" | "pests" | "schemes" | "market" | "livestock" | "general",
  "actionStep": "one concrete next step (in farmer's language)",
  "relatedTopics": ["topic1", "topic2"] (2-3 related things they might want to ask about, in their language)
}

Return ONLY valid JSON — no markdown, no preamble.`;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { question, lang = "en" } = req.body || {};

  if (!question || question.trim().length < 2) {
    return res.status(400).json({ error: "question is required" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Farmer's question (language: ${lang}): "${question.trim()}"`,
        },
      ],
    });

    const raw = message.content[0]?.text?.trim() || "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback if JSON parsing fails
      parsed = {
        answer: raw,
        category: "general",
        actionStep: "",
        relatedTopics: [],
      };
    }

    return res.status(200).json({ ok: true, result: parsed });
  } catch (err) {
    console.error("Claude voice-assistant error:", err?.message);
    return res.status(500).json({ ok: false, error: "AI could not process your question. Please try again." });
  }
};
