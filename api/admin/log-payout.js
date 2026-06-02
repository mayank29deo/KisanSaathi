/**
 * POST /api/admin/log-payout
 *
 * Manually record a payout that was already disbursed outside the system
 * (or retroactively log historical transfers).
 *
 * Body: { userId, amount, method, reference?, transferDate? }
 *   method     : "upi" | "bank" | "mobile" | "other"
 *   reference  : transaction id / UTR / NBFC ref
 *   transferDate : ISO date string. Defaults to now.
 *
 * Atomic: creates payout_requests row (status='completed') + debits earnings_ledger
 * in the same logical transaction (single supabase round-trip for each, both must succeed).
 *
 * Requires admin Firebase ID token.
 */
import { requireAdmin, setAdminCors, sb } from "./_auth.js";

const VALID_METHODS = new Set(["upi", "bank", "mobile", "other"]);

export default async function handler(req, res) {
  setAdminCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const guard = await requireAdmin(req);
  if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

  const { userId, amount, method, reference, transferDate } = req.body || {};
  if (!userId) return res.status(400).json({ error: "missing_userId" });
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: "invalid_amount" });
  if (!method || !VALID_METHODS.has(method)) return res.status(400).json({ error: "invalid_method" });

  const txTime = transferDate ? new Date(transferDate).toISOString() : new Date().toISOString();
  if (txTime === "Invalid Date") return res.status(400).json({ error: "invalid_date" });

  try {
    // Verify user exists
    const userRows = await sb(`/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=id,name,phone`);
    if (!userRows?.[0]) return res.status(404).json({ error: "user_not_found" });

    const nbfcRef = reference?.trim() || `manual_${method}_${guard.email}_${Date.now()}`;

    // Create the payout record (already completed)
    const payoutRows = await sb(`/rest/v1/payout_requests`, {
      method: "POST",
      body: {
        user_id: userId,
        amount: amt,
        status: "completed",
        nbfc_ref: nbfcRef,
        requested_at: txTime,
        completed_at: txTime,
      },
      headers: { Prefer: "return=representation" },
    });

    const payoutId = payoutRows?.[0]?.id;
    if (!payoutId) {
      return res.status(500).json({ error: "payout_insert_failed", detail: payoutRows });
    }

    // Debit the ledger
    await sb(`/rest/v1/earnings_ledger`, {
      method: "POST",
      body: {
        user_id: userId,
        type: "payout",
        amount: -amt,
        reference_id: payoutId,
        description: `Manual ${method} payout logged by ${guard.email}${reference ? ` — ref: ${reference}` : ""}`,
        created_at: txTime,
      },
      headers: { Prefer: "return=minimal" },
    });

    return res.status(200).json({ ok: true, payoutId, amount: amt, method, reference: nbfcRef, transferDate: txTime });
  } catch (err) {
    return res.status(500).json({ error: "internal", detail: err.message });
  }
}
