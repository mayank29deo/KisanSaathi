/**
 * POST /api/admin/log-payout
 *
 * Manually record a payout that was already disbursed outside the system
 * (or retroactively log historical transfers).
 *
 * Body: { userId, amount, method, reference?, transferDate?, force? }
 *   method      : "upi" | "bank" | "mobile" | "other"
 *   reference   : transaction id / UTR / NBFC ref
 *   transferDate: ISO date string. Defaults to now.
 *   force       : if true, bypass balance check (allows over-debit). Default false.
 *
 * Headers:
 *   Idempotency-Key (optional): caller-generated UUID. Same key returns the
 *     cached response — protects against retries after network errors.
 *
 * Atomicity: all writes happen inside a single PL/pgSQL function
 * (log_manual_payout) which holds FOR UPDATE row locks on the user's
 * earnings_ledger for the whole call. Concurrent admin clicks cannot
 * race past the balance guard or double-debit.
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

  const { userId, amount, method, reference, transferDate, force } = req.body || {};
  if (!userId) return res.status(400).json({ error: "missing_userId" });
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: "invalid_amount" });
  if (!method || !VALID_METHODS.has(method)) return res.status(400).json({ error: "invalid_method" });

  const txTime = transferDate ? new Date(transferDate).toISOString() : new Date().toISOString();
  if (txTime === "Invalid Date") return res.status(400).json({ error: "invalid_date" });

  const idemKey = req.headers["idempotency-key"];

  try {
    // Idempotency short-circuit: if the same key was already processed
    // for this admin, return the cached response without re-running.
    if (idemKey) {
      const cached = await sb(
        `/rest/v1/idempotency_keys?key=eq.${encodeURIComponent(idemKey)}&user_id=eq.${encodeURIComponent(guard.email)}&select=response`
      );
      if (cached?.[0]?.response) {
        return res.status(200).json(cached[0].response);
      }
    }

    const nbfcRef = reference?.trim() || `manual_${method}_${guard.email}_${Date.now()}`;

    // Single atomic call — balance check + payout insert + ledger debit
    // all happen under one FOR UPDATE lock.
    const rpc = await sb(`/rest/v1/rpc/log_manual_payout`, {
      method: "POST",
      body: {
        p_user_id:       userId,
        p_amount:        amt,
        p_method:        method,
        p_reference:     nbfcRef,
        p_transfer_date: txTime,
        p_admin_email:   guard.email,
        p_force:         !!force,
      },
    });

    if (rpc?.error === "user_not_found") {
      return res.status(404).json({ error: "user_not_found" });
    }
    if (rpc?.error === "insufficient_balance") {
      return res.status(409).json({
        error:           "insufficient_balance",
        currentBalance:  Number(rpc.currentBalance),
        requestedAmount: Number(rpc.requestedAmount),
        detail: `Logging ₹${rpc.requestedAmount} would push this user's ledger to ₹${Number(rpc.currentBalance) - Number(rpc.requestedAmount)}. Resend with force=true if intentional.`,
      });
    }
    if (rpc?.error || !rpc?.payout_id) {
      return res.status(500).json({ error: rpc?.error || "rpc_failed", detail: rpc });
    }

    const response = {
      ok:           true,
      payoutId:     rpc.payout_id,
      amount:       Number(rpc.amount),
      method,
      reference:    nbfcRef,
      transferDate: txTime,
      newBalance:   Number(rpc.new_balance),
      forced:       !!rpc.forced,
    };

    // Persist idempotency response (best-effort — failure to cache
    // doesn't affect the successful write that already happened).
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
