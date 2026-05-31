/**
 * GET /api/check-user?phone=9876543210
 *
 * Returns the user profile (minimal fields) if the phone exists in Supabase.
 * Used by the login flow to support cross-device login —
 * if a user signed up on device A, they can log in from device B by phone
 * and we restore their profile from the backend.
 *
 * Response:
 *   { user: { id, name, phone, lang, provider, photo_url } } if found
 *   { user: null } if not found
 *
 * Privacy notes:
 *   - email is intentionally NOT returned (anyone who guesses a phone shouldn't
 *     get an email back).
 *   - Returning name + provider is a deliberate tradeoff for login UX.
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const phone = (req.query.phone || "").replace(/\D/g, "");
  if (!phone || phone.length < 10) return res.status(400).json({ error: "invalid_phone" });

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SB_URL || !SB_KEY) return res.status(200).json({ user: null, mode: "local_only" });

  try {
    // Lookup either by id=phone (phone signups use phone as id)
    // or by phone column (Google users may have a linked phone)
    // Limit to provider='phone' so this endpoint only restores phone-based logins.
    const url = `${SB_URL}/rest/v1/users?or=(id.eq.${phone},phone.eq.${phone})&provider=eq.phone&select=id,name,phone,lang,provider,photo_url&limit=1`;
    const r = await fetch(url, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(200).json({ user: null });
    }
    return res.status(200).json({ user: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: "internal", detail: err.message });
  }
}
