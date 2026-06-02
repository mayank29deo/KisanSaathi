/**
 * GET /api/admin/dashboard
 *
 * Returns everything the admin UI needs in one round-trip:
 *  - stats   : top-line counters
 *  - payoutsReady : users with balance ≥ ₹10 AND bank linked
 *  - flagged : flagged price entries needing review
 *  - recentEntries : last 100 price entries (any status)
 *  - users   : all users with balance + bank status + last activity
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
    // Fetch all the tables in parallel — fast and stays well under the 10s function timeout
    const [users, ledger, banks, recentEntries, flagged] = await Promise.all([
      sb("/rest/v1/users?select=id,name,phone,email,provider,lang,created_at,last_login&order=created_at.desc&limit=2000"),
      sb("/rest/v1/earnings_ledger?select=user_id,amount"),
      sb("/rest/v1/user_bank_accounts?select=user_id,account_holder,ifsc,upi_id,verified,updated_at"),
      sb("/rest/v1/price_entries?select=id,user_id,commodity,price,unit,source_type,state,district,status,flagged_reason,created_at&order=created_at.desc&limit=200"),
      sb("/rest/v1/price_entries?status=eq.flagged&select=id,user_id,commodity,price,unit,source_type,state,district,flagged_reason,created_at&order=created_at.desc&limit=100"),
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
        payoutsReady.push({
          userId: u.id,
          name: u.name,
          phone: u.phone,
          email: u.email,
          balance,
          payoutAmount: Math.floor(balance / 10) * 10,
          upiId: bank.upi_id || "",
          ifsc: bank.ifsc || "",
          accountHolder: bank.account_holder || "",
          bankUpdatedAt: bank.updated_at,
        });
      }
    }
    payoutsReady.sort((a, b) => b.balance - a.balance);

    // Build users list (denormalised view)
    const userRows = (users || []).map((u) => {
      const bal = balanceByUser[u.id] || 0;
      const bank = bankByUser[u.id];
      return {
        userId: u.id,
        name: u.name,
        phone: u.phone || "",
        email: u.email || "",
        provider: u.provider,
        lang: u.lang,
        balance: bal,
        bankLinked: !!bank,
        bankUpi: bank?.upi_id || "",
        bankIfsc: bank?.ifsc || "",
        createdAt: u.created_at,
        lastLogin: u.last_login,
      };
    });
    userRows.sort((a, b) => b.balance - a.balance);

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
    };

    return res.status(200).json({
      ok: true,
      stats,
      payoutsReady,
      flagged: enrichEntries(flagged),
      recentEntries: enrichEntries(recentEntries),
      users: userRows,
    });
  } catch (err) {
    return res.status(500).json({ error: "internal", detail: err.message });
  }
}
