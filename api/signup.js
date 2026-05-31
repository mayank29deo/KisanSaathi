/**
 * POST /api/signup
 * Called whenever a new user registers (phone+name OR Google sign-in).
 * - Inserts user into Supabase
 * - Pushes to Google Apps Script webhook for Sheets + email notification
 *
 * Body: { id, name, phone?, email?, provider, photoURL?, lang, referredBy? }
 *
 * Idempotent: upserts on `id`. Safe to call on every login if needed.
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  const { id, name, phone, email, provider, photoURL, lang, referredBy } = req.body || {};
  if (!id || !name) return res.status(400).json({ error: "missing_id_or_name" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "";
  const userAgent = req.headers["user-agent"] || "";

  // Detect if this is a brand-new signup vs returning login
  let isNewSignup = true;

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (SB_URL && SB_KEY) {
    try {
      // Check if user exists
      const exists = await sb(SB_URL, SB_KEY, "GET",
        `/rest/v1/users?id=eq.${encodeURIComponent(id)}&select=id`);
      isNewSignup = !exists?.length;

      // Upsert user
      await sb(SB_URL, SB_KEY, "POST", `/rest/v1/users?on_conflict=id`, {
        id, name, phone: phone || null, email: email || null,
        provider: provider || "phone",
        photo_url: photoURL || null,
        lang: lang || "en",
        referred_by: referredBy || null,
        ip, user_agent: userAgent,
        last_login: new Date().toISOString(),
      }, { Prefer: "resolution=merge-duplicates" });
    } catch (err) {
      console.error("Supabase signup error:", err.message);
    }
  }

  // Push to Apps Script webhook ONLY for new signups (not every login)
  if (isNewSignup) {
    const webhookUrl = process.env.SHEETS_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "signup",
            id, name,
            phone: phone || "",
            email: email || "",
            provider: provider || "phone",
            lang: lang || "en",
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.error("Webhook error:", err.message);
      }
    }
  }

  return res.status(200).json({ ok: true, isNewSignup });
}

async function sb(url, key, method, path, body, extra) {
  const r = await fetch(url + path, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(extra || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return text; }
}
