/**
 * GET /api/admin/dashboard
 *
 * Returns everything the admin UI needs in one round-trip:
 *  - stats         : top-line counters
 *  - payoutsReady  : users with balance ≥ ₹10 AND bank linked
 *  - flagged       : flagged price entries needing review
 *  - recentEntries : last 200 price entries (any status)
 *  - users         : all users with balance, lifetime disbursed, bank, location
 *  - payoutHistory : completed/pending payouts, newest first
 *
 * Requires admin Firebase ID token in Authorization: Bearer header.
 */
import { requireAdmin, setAdminCors, sb } from "./_auth.js";

const PAYOUT_MIN = 10;

export default async function handler(req, res) {
  setAdminCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const guard = await requireAdmin(req);
  if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

  try {
    // Fetch all the tables in parallel — fast and stays well under the 10s function timeout.
    // entriesForLocation has a higher limit because we use it to derive each user's
    // most recent district/state (location). recentEntries is the UI feed.
    const [users, ledger, banks, recentEntries, flagged, payouts, entriesForLocation] = await Promise.all([
      sb("/rest/v1/users?select=id,name,phone,email,provider,lang,created_at,last_login&order=created_at.desc&limit=2000"),
      sb("/rest/v1/earnings_ledger?select=user_id,amount"),
      sb("/rest/v1/user_bank_accounts?select=user_id,account_holder,account_number_encrypted,ifsc,upi_id,verified,created_at,updated_at"),
      sb("/rest/v1/price_entries?select=id,user_id,commodity,price,unit,source_type,state,district,status,flagged_reason,created_at&order=created_at.desc&limit=200"),
      sb("/rest/v1/price_entries?status=eq.flagged&select=id,user_id,commodity,price,unit,source_type,state,district,flagged_reason,created_at&order=created_at.desc&limit=100"),
      sb("/rest/v1/payout_requests?select=id,user_id,amount,status,nbfc_ref,failure_reason,requested_at,completed_at&order=requested_at.desc&limit=500"),
      sb("/rest/v1/price_entries?select=user_id,state,district,created_at&order=created_at.desc&limit=2000"),
    ]);

    // Build per-user balance lookup
    const balanceByUser = {};
    for (const row of ledger || []) {
      balanceByUser[row.user_id] = (balanceByUser[row.user_id] || 0) + Number(row.amount || 0);
    }

    // Bank lookup
    const bankByUser = {};
    for (const b of banks || []) {
      bankByUser[b.user_id] = b;
    }

    // Lifetime disbursed + last paid timestamp per user
    const lifetimeDisbursedByUser = {};
    const pendingPayoutByUser = {};
    const lastPaidByUser = {};
    for (const p of payouts || []) {
      if (p.status === "completed") {
        lifetimeDisbursedByUser[p.user_id] = (lifetimeDisbursedByUser[p.user_id] || 0) + Number(p.amount || 0);
        const ts = p.completed_at || p.requested_at;
        if (ts) {
          const t = new Date(ts).getTime();
          if (!lastPaidByUser[p.user_id] || t > new Date(lastPaidByUser[p.user_id].iso).getTime()) {
            lastPaidByUser[p.user_id] = { iso: ts, amount: Number(p.amount || 0) };
          }
        }
      } else if (p.status === "pending" || p.status === "processing") {
        pendingPayoutByUser[p.user_id] = (pendingPayoutByUser[p.user_id] || 0) + Number(p.amount || 0);
      }
    }

    // Most recent location (district + state) per user, derived from entriesForLocation.
    // entries are ordered by created_at desc, so the first occurrence for a user IS the most recent.
    const locationByUser = {};
    for (const e of entriesForLocation || []) {
      if (!locationByUser[e.user_id]) {
        locationByUser[e.user_id] = { district: e.district || "", state: e.state || "" };
      }
    }

    // Today (UTC) for "active today" count
    const todayUtc = new Date().toISOString().slice(0, 10);
    const activeTodaySet = new Set(
      (recentEntries || [])
        .filter((e) => (e.created_at || "").slice(0, 10) === todayUtc)
        .map((e) => e.user_id)
    );

    // User name lookup for entry tables
    const userNameById = {};
    const userPhoneById = {};
    for (const u of users || []) {
      userNameById[u.id] = u.name || "Unknown";
      userPhoneById[u.id] = u.phone || "";
    }

    // Build payoutsReady list
    const payoutsReady = [];
    for (const u of users || []) {
      const balance = balanceByUser[u.id] || 0;
      const bank = bankByUser[u.id];
      if (balance >= PAYOUT_MIN && bank && (bank.upi_id || bank.ifsc)) {
        const loc = locationByUser[u.id] || {};
        const lastPaid = lastPaidByUser[u.id];
        payoutsReady.push({
          userId: u.id,
          name: u.name,
          phone: u.phone,
          email: u.email,
          balance,
          payoutAmount: Math.floor(balance / 10) * 10,
          lifetimeDisbursed: lifetimeDisbursedByUser[u.id] || 0,
          lastPaidAt: lastPaid?.iso || null,
          lastPaidAmount: lastPaid?.amount || 0,
          upiId: bank.upi_id || "",
          ifsc: bank.ifsc || "",
          accountHolder: bank.account_holder || "",
          bankUpdatedAt: bank.updated_at,
          district: loc.district || "",
          state: loc.state || "",
        });
      }
    }
    payoutsReady.sort((a, b) => b.balance - a.balance);

    // Build users list (denormalised view)
    const userRows = (users || []).map((u) => {
      const bal = balanceByUser[u.id] || 0;
      const bank = bankByUser[u.id];
      const loc = locationByUser[u.id] || {};
      return {
        userId: u.id,
        name: u.name,
        phone: u.phone || "",
        email: u.email || "",
        provider: u.provider,
        lang: u.lang,
        balance: bal,
        lifetimeDisbursed: lifetimeDisbursedByUser[u.id] || 0,
        pendingPayout: pendingPayoutByUser[u.id] || 0,
        bankLinked: !!bank,
        bankUpi: bank?.upi_id || "",
        bankIfsc: bank?.ifsc || "",
        bankHolder: bank?.account_holder || "",
        district: loc.district || "",
        state: loc.state || "",
        createdAt: u.created_at,
        lastLogin: u.last_login,
      };
    });
    userRows.sort((a, b) => b.balance - a.balance);

    // Build payout history list
    const payoutHistory = (payouts || []).map((p) => {
      const loc = locationByUser[p.user_id] || {};
      const bank = bankByUser[p.user_id];
      return {
        id: p.id,
        userId: p.user_id,
        userName: userNameById[p.user_id] || "Unknown",
        userPhone: userPhoneById[p.user_id] || "",
        amount: Number(p.amount || 0),
        status: p.status,
        nbfcRef: p.nbfc_ref || "",
        failureReason: p.failure_reason || "",
        requestedAt: p.requested_at,
        completedAt: p.completed_at,
        district: loc.district || "",
        state: loc.state || "",
        method: p.nbfc_ref?.startsWith("manual_") ? (p.nbfc_ref.split("_")[1] || "manual") : (bank?.upi_id ? "upi" : bank?.ifsc ? "bank" : "manual"),
        upiId: bank?.upi_id || "",
        ifsc: bank?.ifsc || "",
      };
    });

    // Enrich entry rows with user name
    const enrichEntries = (rows) => (rows || []).map((e) => ({
      id: e.id,
      userId: e.user_id,
      userName: userNameById[e.user_id] || "Unknown",
      userPhone: userPhoneById[e.user_id] || "",
      commodity: e.commodity,
      price: Number(e.price),
      unit: e.unit,
      sourceType: e.source_type,
      state: e.state,
      district: e.district,
      status: e.status,
      flagReason: e.flagged_reason || "",
      createdAt: e.created_at,
    }));

    // Build bankLinks list — mirrors the BankLinks tab in the Google Sheet
    const bankLinks = (banks || []).map((b) => {
      const loc = locationByUser[b.user_id] || {};
      return {
        userId: b.user_id,
        userName: userNameById[b.user_id] || "Unknown",
        userPhone: userPhoneById[b.user_id] || "",
        upiId: b.upi_id || "",
        ifsc: b.ifsc || "",
        accountHolder: b.account_holder || "",
        hasAccountNumber: !!b.account_number_encrypted,
        verified: !!b.verified,
        district: loc.district || "",
        state: loc.state || "",
        balance: balanceByUser[b.user_id] || 0,
        lifetimeDisbursed: lifetimeDisbursedByUser[b.user_id] || 0,
        createdAt: b.created_at || b.updated_at,
        updatedAt: b.updated_at,
      };
    });
    bankLinks.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    const totalDisbursedAllTime = Object.values(lifetimeDisbursedByUser).reduce((s, v) => s + v, 0);
    const stats = {
      totalUsers: users?.length || 0,
      activeToday: activeTodaySet.size,
      totalEntriesToday: (recentEntries || []).filter(
        (e) => (e.created_at || "").slice(0, 10) === todayUtc
      ).length,
      totalBalanceOwed: Object.values(balanceByUser).reduce((s, v) => s + v, 0),
      payoutsReadyCount: payoutsReady.length,
      payoutsReadyAmount: payoutsReady.reduce((s, p) => s + p.payoutAmount, 0),
      flaggedCount: flagged?.length || 0,
      totalDisbursedAllTime,
      totalPayoutCount: (payouts || []).filter((p) => p.status === "completed").length,
      bankLinkedCount: bankLinks.length,
    };

    return res.status(200).json({
      ok: true,
      stats,
      payoutsReady,
      flagged: enrichEntries(flagged),
      recentEntries: enrichEntries(recentEntries),
      users: userRows,
      payoutHistory,
      bankLinks,
    });
  } catch (err) {
    return res.status(500).json({ error: "internal", detail: err.message });
  }
}
