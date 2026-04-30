/**
 * GET /api/earn/my-entries?limit=20
 * Returns recent price entries for the authenticated user.
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers.authorization || "";
  const userId = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) return res.status(200).json({ entries: [], mode: "local_only" });

  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/price_entries?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=${limit}`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    const entries = await r.json();
    return res.status(200).json({ entries });
  } catch (err) {
    return res.status(500).json({ error: "internal", detail: err.message });
  }
}
