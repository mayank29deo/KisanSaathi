/**
 * POST /api/admin/review-entry  { entryId, action: 'verify' | 'reject' }
 *
 * Updates a flagged entry's status. If verify → status='verified' and credit
 * ₹1 to the user (since the original entry was flagged, no credit was given yet).
 * If reject → status='rejected' (no credit, entry stays as audit record).
 *
 * Requires admin Firebase ID token.
 */
import { requireAdmin, setAdminCors, sb } from "./_auth.js";

const REWARD_PER_ENTRY = 1;

export default async function handler(req, res) {
  setAdminCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const guard = await requireAdmin(req);
  if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

  const { entryId, action } = req.body || {};
  if (!entryId) return res.status(400).json({ error: "missing_entryId" });
  if (action !== "verify" && action !== "reject") {
    return res.status(400).json({ error: "invalid_action" });
  }

  try {
    const newStatus = action === "verify" ? "verified" : "rejected";

    // Fetch the entry first so we know which user to credit (and to make sure
    // it was actually flagged — don't double-credit a row that was already verified)
    const rows = await sb(`/rest/v1/price_entries?id=eq.${encodeURIComponent(entryId)}&select=user_id,status`);
    const entry = rows?.[0];
    if (!entry) return res.status(404).json({ error: "entry_not_found" });
    if (entry.status !== "flagged") {
      return res.status(409).json({ error: "not_flagged", currentStatus: entry.status });
    }

    // Update status
    await sb(`/rest/v1/price_entries?id=eq.${encodeURIComponent(entryId)}`, {
      method: "PATCH",
      body: {
        status: newStatus,
        verified_at: action === "verify" ? new Date().toISOString() : null,
      },
      headers: { Prefer: "return=minimal" },
    });

    // Credit ₹1 to the ledger only when verifying
    if (action === "verify") {
      await sb(`/rest/v1/earnings_ledger`, {
        method: "POST",
        body: {
          user_id: entry.user_id,
          type: "price_entry",
          amount: REWARD_PER_ENTRY,
          reference_id: entryId,
          description: `Admin-verified flagged entry by ${guard.email}`,
        },
        headers: { Prefer: "return=minimal" },
      });
    }

    return res.status(200).json({ ok: true, entryId, status: newStatus });
  } catch (err) {
    return res.status(500).json({ error: "internal", detail: err.message });
  }
}
