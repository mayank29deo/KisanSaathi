/**
 * POST /api/signup
 * Called whenever a new user registers (phone+name OR Google sign-in).
 * - Upserts user into Supabase
 * - Pushes to Google Apps Script webhook for Sheets + email notification
 *
 * Body: { id, name, phone?, email?, provider, photoURL?, lang, referredBy? }
 *
 * Concurrency: Atomically claims the webhook via UPDATE...WHERE webhook_signup_sent=false
 * Only the request that successfully claims it fires the webhook (prevents double-emails
 * from multi-tab or rapid double-render scenarios).
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

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let shouldFireWebhook = false;

  if (SB_URL && SB_KEY) {
    try {
      // Upsert user — on insert webhook_signup_sent defaults to false; on update we don't touch it
      await sb(SB_URL, SB_KEY, "POST", `/rest/v1/users?on_conflict=id`, {
        id, name, phone: phone || null, email: email || null,
        provider: provider || "phone",
        photo_url: photoURL || null,
        lang: lang || "en",
        referred_by: referredBy || null,
        ip, user_agent: userAgent,
        last_login: new Date().toISOString(),
      }, { Prefer: "resolution=merge-duplicates" });

      // Atomically claim the webhook lock — only one request will succeed
      // PATCH returns the affected rows. If webhook_signup_sent was already true, this returns [].
      const claimRes = await sb(SB_URL, SB_KEY, "PATCH",
        `/rest/v1/users?id=eq.${encodeURIComponent(id)}&webhook_signup_sent=eq.false&select=id`,
        { webhook_signup_sent: true },
        { Prefer: "return=representation" }
      );
      shouldFireWebhook = Array.isArray(claimRes) && claimRes.length > 0;
    } catch (err) {
      console.error("Supabase signup error:", err.message);
    }
  } else {
    // Supabase not configured — fall through; webhook still won't fire without URL
    shouldFireWebhook = true;
  }

  if (shouldFireWebhook) {
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

  return res.status(200).json({ ok: true, firedWebhook: shouldFireWebhook });
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
