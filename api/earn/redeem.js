/**
 * POST /api/earn/redeem
 * Triggers a payout to user's linked bank/UPI.
 *
 * Concurrency safety:
 *  - Creates a payout_request row and atomically debits ledger in single transaction
 *    via Postgres RPC (request_payout)
 *  - Idempotency: if a payout for this user is already in 'processing' state, returns existing
 *  - Min payout: ₹10
 *
 * Actual NBFC integration is a TODO — this endpoint just creates the request record.
 * A separate worker/cron picks up 'pending' rows and calls the NBFC API.
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers.authorization || "";
  const userId = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) {
    return res.status(200).json({ ok: true, mode: "local_only", note: "Payout will run when Supabase + NBFC are wired up." });
  }

  try {
    const result = await fetch(`${SB_URL}/rest/v1/rpc/request_payout`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_user_id: userId, p_min_amount: 10 }),
    }).then((r) => r.json());

    if (result?.error) return res.status(400).json({ error: result.error });
    return res.status(200).json({ ok: true, payout_id: result.payout_id, amount: result.amount });
  } catch (err) {
    return res.status(500).json({ error: "internal", detail: err.message });
  }
}
