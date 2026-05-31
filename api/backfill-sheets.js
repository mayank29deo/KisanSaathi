/**
 * GET /api/backfill-sheets?key=ADMIN_KEY&type=signups
 *
 * One-time admin tool to push existing Supabase rows into the Google Sheet
 * via the Apps Script webhook. Useful for:
 *   - Users created before SHEETS_WEBHOOK_URL was set
 *   - Users added via direct DB seed or curl tests
 *   - Recovery if the sheet gets accidentally deleted
 *
 * Auth: requires ?key= matching ADMIN_BACKFILL_KEY env var (you set this in Vercel)
 *
 * Usage examples:
 *   /api/backfill-sheets?key=YOUR_KEY&type=signups
 *   /api/backfill-sheets?key=YOUR_KEY&type=price_entries
 *   /api/backfill-sheets?key=YOUR_KEY&type=bank_links
 *   /api/backfill-sheets?key=YOUR_KEY&type=all
 *
 * Responses include count of rows pushed per type.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const adminKey = process.env.ADMIN_BACKFILL_KEY || "";
  if (!adminKey || req.query.key !== adminKey) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const WEBHOOK = process.env.SHEETS_WEBHOOK_URL;
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: "supabase_not_configured" });
  if (!WEBHOOK)           return res.status(500).json({ error: "webhook_not_configured" });

  const type = req.query.type || "all";
  const result = {};

  try {
    if (type === "signups" || type === "all") {
      result.signups = await backfillSignups(SB_URL, SB_KEY, WEBHOOK);
    }
    if (type === "price_entries" || type === "all") {
      result.price_entries = await backfillPriceEntries(SB_URL, SB_KEY, WEBHOOK);
    }
    if (type === "bank_links" || type === "all") {
      result.bank_links = await backfillBankLinks(SB_URL, SB_KEY, WEBHOOK);
    }
    return res.status(200).json({ ok: true, pushed: result });
  } catch (err) {
    return res.status(500).json({ error: "internal", detail: err.message, partial: result });
  }
}

async function backfillSignups(sbUrl, sbKey, webhook) {
  const users = await sbGet(sbUrl, sbKey, "/rest/v1/users?select=*&order=created_at.asc");
  let pushed = 0;
  for (const u of users || []) {
    await postWebhook(webhook, {
      type: "signup",
      id: u.id,
      name: u.name,
      phone: u.phone || "",
      email: u.email || "",
      provider: u.provider || "phone",
      lang: u.lang || "en",
      timestamp: u.created_at,
    });
    pushed++;
  }
  return pushed;
}

async function backfillPriceEntries(sbUrl, sbKey, webhook) {
  const entries = await sbGet(sbUrl, sbKey, "/rest/v1/price_entries?select=*&order=created_at.asc");
  let pushed = 0;
  for (const e of entries || []) {
    const [user, balanceRows, bank] = await Promise.all([
      sbGet(sbUrl, sbKey, `/rest/v1/users?id=eq.${encodeURIComponent(e.user_id)}&select=name,phone,email`),
      sbGet(sbUrl, sbKey, `/rest/v1/earnings_ledger?user_id=eq.${encodeURIComponent(e.user_id)}&select=amount`),
      sbGet(sbUrl, sbKey, `/rest/v1/user_bank_accounts?user_id=eq.${encodeURIComponent(e.user_id)}&select=upi_id,ifsc,account_holder`),
    ]);
    const userInfo = user?.[0] || {};
    const balance = (balanceRows || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    const bankInfo = bank?.[0] || {};
    await postWebhook(webhook, {
      type: "price_entry",
      userId: e.user_id,
      userName: userInfo.name || "Unknown",
      userPhone: userInfo.phone || "",
      userEmail: userInfo.email || "",
      commodity: e.commodity, price: Number(e.price), unit: e.unit,
      sourceType: e.source_type, state: e.state, district: e.district, pincode: e.pincode,
      status: e.status, credit: e.status === "verified" ? 1 : 0,
      flagReason: e.flagged_reason,
      totalBalance: balance,
      bankUpi: bankInfo.upi_id || "", bankIfsc: bankInfo.ifsc || "",
      bankHolder: bankInfo.account_holder || "",
      readyForPayout: balance >= 10 && !!(bankInfo.upi_id || bankInfo.ifsc),
      timestamp: e.created_at,
    });
    pushed++;
  }
  return pushed;
}

async function backfillBankLinks(sbUrl, sbKey, webhook) {
  const banks = await sbGet(sbUrl, sbKey, "/rest/v1/user_bank_accounts?select=*&order=created_at.asc");
  let pushed = 0;
  for (const b of banks || []) {
    const user = await sbGet(sbUrl, sbKey, `/rest/v1/users?id=eq.${encodeURIComponent(b.user_id)}&select=name,phone,email`);
    const userInfo = user?.[0] || {};
    await postWebhook(webhook, {
      type: "bank_link",
      userId: b.user_id,
      userName: userInfo.name || "Unknown",
      userPhone: userInfo.phone || "",
      userEmail: userInfo.email || "",
      upiId: b.upi_id || "", ifsc: b.ifsc || "",
      accountHolder: b.account_holder || "",
      hasAccountNumber: !!b.account_number_encrypted,
      timestamp: b.created_at,
    });
    pushed++;
  }
  return pushed;
}

async function sbGet(url, key, path) {
  const r = await fetch(url + path, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return r.json();
}

async function postWebhook(url, body) {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
