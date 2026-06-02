/**
 * POST /api/admin/mark-paid  { userId, nbfcRef? }
 *
 * Calls the request_payout RPC to atomically:
 *  - check existing in-flight payout (returns error if found)
 *  - floor balance to nearest ₹10 multiple
 *  - insert payout_requests row (status='pending')
 *  - debit earnings_ledger
 *
 * If nbfcRef is provided, marks the payout as 'completed' immediately
 * (use this when you've manually disbursed via UPI).
 *
 * Requires admin Firebase ID token.
 */
import { requireAdmin, setAdminCors, sb } from "./_auth.js";

const PAYOUT_MIN = 10;

export default async function handler(req, res) {
  setAdminCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const guard = await requireAdmin(req);
  if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

  const { userId, nbfcRef } = req.body || {};
  if (!userId) return res.status(400).json({ error: "missing_userId" });

  try {
    // Step 1 — atomic payout request (creates payout row + ledger debit)
    const rpc = await sb(`/rest/v1/rpc/request_payout`, {
      method: "POST",
      body: { p_user_id: userId, p_min_amount: PAYOUT_MIN },
    });

    if (rpc?.error) {
      return res.status(409).json({ error: rpc.error, detail: rpc });
    }
    const payoutId = rpc?.payout_id;
    const amount = rpc?.amount;
    if (!payoutId) {
      return res.status(500).json({ error: "rpc_no_payout_id", detail: rpc });
    }

    // Step 2 — if admin marked as already disbursed, flip status to completed
    if (nbfcRef !== undefined) {
      await sb(`/rest/v1/payout_requests?id=eq.${encodeURIComponent(payoutId)}`, {
        method: "PATCH",
        body: {
          status: "completed",
          nbfc_ref: nbfcRef || `manual_${guard.email}_${Date.now()}`,
          completed_at: new Date().toISOString(),
        },
        headers: { Prefer: "return=minimal" },
      });
    }

    return res.status(200).json({ ok: true, payoutId, amount, status: nbfcRef !== undefined ? "completed" : "pending" });
  } catch (err) {
    return res.status(500).json({ error: "internal", detail: err.message });
  }
}
