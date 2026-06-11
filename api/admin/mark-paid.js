/**
 * POST /api/admin/mark-paid  { userId, nbfcRef? }
 *
 * Records that the admin disbursed money to a user. One-click flow:
 *   1. If user already has a pending/processing payout (from old code paths),
 *      flip it to completed with the new ref. No re-debit (ledger was
 *      already hit when the pending row was created).
 *   2. Otherwise, create a fresh completed payout_requests row and debit
 *      earnings_ledger by floor(balance/10)*10. Never disburses more
 *      than the user has earned.
 *
 * Headers:
 *   Idempotency-Key (optional): caller-generated UUID. Same key returns the
 *     cached response on retry.
 *
 * Atomicity: all writes happen inside a single PL/pgSQL function
 * (mark_payout_completed) which holds FOR UPDATE row locks on the user's
 * earnings_ledger AND any pending payout row for the whole call. Two
 * concurrent admin clicks cannot both pass the balance check and double-debit.
 *
 * Requires admin Firebase ID token.
 */
import { requireAdmin, setAdminCors, sb } from "./_auth.js";

export default async function handler(req, res) {
  setAdminCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const guard = await requireAdmin(req);
  if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

  const { userId, nbfcRef } = req.body || {};
  if (!userId) return res.status(400).json({ error: "missing_userId" });

  const ref = (nbfcRef && nbfcRef.trim()) || `manual_${guard.email}_${Date.now()}`;
  const idemKey = req.headers["idempotency-key"];

  try {
    // Idempotency short-circuit
    if (idemKey) {
      const cached = await sb(
        `/rest/v1/idempotency_keys?key=eq.${encodeURIComponent(idemKey)}&user_id=eq.${encodeURIComponent(guard.email)}&select=response`
      );
      if (cached?.[0]?.response) {
        return res.status(200).json(cached[0].response);
      }
    }

    // Single atomic call — balance lock + adopt-or-create + debit
    const rpc = await sb(`/rest/v1/rpc/mark_payout_completed`, {
      method: "POST",
      body: {
        p_user_id:     userId,
        p_nbfc_ref:    ref,
        p_admin_email: guard.email,
      },
    });

    if (rpc?.error === "balance_too_low") {
      return res.status(409).json({ error: "balance_too_low", balance: Number(rpc.balance) });
    }
    if (rpc?.error || !rpc?.payout_id) {
      return res.status(500).json({ error: rpc?.error || "rpc_failed", detail: rpc });
    }

    const response = {
      ok:        true,
      adopted:   !!rpc.adopted,
      payoutId:  rpc.payout_id,
      amount:    Number(rpc.amount),
      reference: rpc.reference || ref,
      newBalance: rpc.new_balance !== undefined ? Number(rpc.new_balance) : undefined,
    };

    if (idemKey) {
      try {
        await sb(`/rest/v1/idempotency_keys`, {
          method: "POST",
          body: { key: idemKey, user_id: guard.email, response },
          headers: { Prefer: "return=minimal" },
        });
      } catch {}
    }

    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ error: "internal", detail: err.message });
  }
}
