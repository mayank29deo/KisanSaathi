/**
 * GET /api/earn/my-stats
 * Returns: { balance, entriesToday, entriesTotal, verified, flagged }
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers.authorization || "";
  const userId = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) {
    return res.status(200).json({ mode: "local_only", balance: 0, entriesToday: 0, entriesTotal: 0 });
  }

  try {
    const stats = await sbCall(SB_URL, SB_KEY, "GET",
      `/rest/v1/rpc/get_user_earn_stats?p_user_id=${encodeURIComponent(userId)}`
    );
    return res.status(200).json(stats);
  } catch (err) {
    return res.status(500).json({ error: "internal", detail: err.message });
  }
}

async function sbCall(url, key, method, path, body) {
  const r = await fetch(url + path, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}
