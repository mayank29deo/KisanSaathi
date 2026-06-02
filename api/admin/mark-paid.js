/**
 * POST /api/admin/mark-paid  { userId, nbfcRef? }
 *
 * Records that you've disbursed money to a user. Simple flow:
 *
 *   1. If user already has a pending/processing payout, mark THAT one completed
 *      with your reference (don't create a duplicate or double-debit).
 *   2. Otherwise, create a fresh completed payout_requests row and debit
 *      the earnings_ledger by the floored ₹10-multiple of their current balance.
 *
 * No RPC, no two-step. Trust the admin: if you're clicking this, the transfer
 * happened. We just record it.
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

  const ref = (nbfcRef && nbfcRef.trim()) || `manual_${guard.email}_${Date.now()}`;
  const now = new Date().toISOString();

  try {
    // Step 1: any in-flight payout for this user? Adopt it instead of double-debiting.
    const pending = await sb(
      `/rest/v1/payout_requests?user_id=eq.${encodeURIComponent(userId)}&status=in.(pending,processing)&select=id,amount&order=requested_at.asc&limit=1`
    );
    const existing = pending?.[0];

    if (existing) {
      // Adopt: flip the existing pending row to completed with the new ref.
      // Ledger was already debited by request_payout RPC when the pending row
      // was created, so no need to debit again.
      await sb(`/rest/v1/payout_requests?id=eq.${encodeURIComponent(existing.id)}`, {
        method: "PATCH",
        body: { status: "completed", nbfc_ref: ref, completed_at: now },
        headers: { Prefer: "return=minimal" },
      });
      return res.status(200).json({
        ok: true,
        adopted: true,
        payoutId: existing.id,
        amount: Number(existing.amount),
        reference: ref,
      });
    }

    // Step 2: no pending payout. Compute payout amount from current balance.
    const ledgerRows = await sb(
      `/rest/v1/earnings_ledger?user_id=eq.${encodeURIComponent(userId)}&select=amount`
    );
    const balance = (ledgerRows || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    if (balance < PAYOUT_MIN) {
      return res.status(409).json({ error: "balance_too_low", balance });
    }
    const amount = Math.floor(balance / 10) * 10;

    // Insert completed payout row
    const payoutRows = await sb(`/rest/v1/payout_requests`, {
      method: "POST",
      body: {
        user_id: userId,
        amount,
        status: "completed",
        nbfc_ref: ref,
        requested_at: now,
        completed_at: now,
      },
      headers: { Prefer: "return=representation" },
    });
    const payoutId = payoutRows?.[0]?.id;
    if (!payoutId) {
      return res.status(500).json({ error: "payout_insert_failed", detail: payoutRows });
    }

    // Debit ledger
    await sb(`/rest/v1/earnings_ledger`, {
      method: "POST",
      body: {
        user_id: userId,
        type: "payout",
        amount: -amount,
        reference_id: payoutId,
        description: `Payout marked by ${guard.email} — ref: ${ref}`,
      },
      headers: { Prefer: "return=minimal" },
    });

    return res.status(200).json({ ok: true, payoutId, amount, reference: ref });
  } catch (err) {
    return res.status(500).json({ error: "internal", detail: err.message });
  }
}
