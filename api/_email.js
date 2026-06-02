/**
 * Resend transactional email — shared module for all admin notifications.
 *
 * Env vars:
 *   RESEND_API_KEY     — required. get from resend.com → API Keys
 *   RESEND_FROM_EMAIL  — optional. defaults to "KisanSaathi <onboarding@resend.dev>"
 *                       (works without domain verification, but only delivers to the
 *                        email used to sign up at Resend — fine for admin alerts)
 *   ADMIN_EMAIL        — optional. defaults to mayank99deo@gmail.com
 *
 * Underscore prefix tells Vercel not to expose this as a route.
 */

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "KisanSaathi <onboarding@resend.dev>";
const DEFAULT_ADMIN = "mayank99deo@gmail.com";

export async function sendAdminEmail({ subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping send");
    return { skipped: true };
  }
  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  const to = process.env.ADMIN_EMAIL || DEFAULT_ADMIN;

  const r = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`Resend ${r.status}: ${detail}`);
  }
  return r.json();
}

// ─── Templates ───────────────────────────────────────────────

export function signupEmail(d) {
  const providerEmoji = d.provider === "google" ? "🟦" : "📱";
  return {
    subject: `🎉 New KisanSaathi user: ${d.name}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="margin:0 0 4px;color:#059669;">🎉 New User Signup</h2>
        <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">Someone just joined KisanSaathi!</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Name</td><td style="font-weight:600;">${esc(d.name)}</td></tr>
          ${d.phone ? `<tr><td style="padding:8px 0;color:#6b7280;">Phone</td><td style="font-weight:600;">+91 ${esc(d.phone)}</td></tr>` : ""}
          ${d.email ? `<tr><td style="padding:8px 0;color:#6b7280;">Email</td><td style="font-weight:600;">${esc(d.email)}</td></tr>` : ""}
          <tr><td style="padding:8px 0;color:#6b7280;">Provider</td><td style="font-weight:600;">${providerEmoji} ${esc(d.provider)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Language</td><td style="font-weight:600;">${(d.lang || "en").toUpperCase()}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Time</td><td>${ist(d.timestamp)}</td></tr>
        </table>
      </div>
    `,
  };
}

export function priceEntryEmail(d) {
  const statusBadge = d.status === "verified"
    ? '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">VERIFIED ✓</span>'
    : `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">FLAGGED ⚠ (${esc(d.flagReason || "review")})</span>`;
  const payoutBanner = d.readyForPayout
    ? `<div style="background:#10b981;color:#fff;padding:12px;border-radius:8px;margin-bottom:12px;text-align:center;font-weight:700;">🪙 READY FOR PAYOUT — ₹${d.totalBalance} to ${esc(d.bankUpi || d.bankIfsc)}</div>`
    : "";
  return {
    subject: `${d.readyForPayout ? "🪙 PAYOUT READY: " : ""}₹${d.price}/${d.unit} ${d.commodity} — ${d.userName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
        ${payoutBanner}
        <h2 style="margin:0 0 4px;color:#f59e0b;">🪙 New Price Entry</h2>
        <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">${statusBadge}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#6b7280;width:130px;">User</td><td style="font-weight:600;">${esc(d.userName)}${d.userPhone ? ` (+91 ${esc(d.userPhone)})` : ""}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Commodity</td><td style="font-weight:600;">${esc(d.commodity)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Price</td><td style="font-weight:600;">₹${d.price} / ${esc(d.unit)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Source</td><td>${esc(d.sourceType)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Location</td><td>${esc(d.district)}${d.pincode ? `, ${esc(d.pincode)}` : ""}${d.state ? ` (${esc(d.state)})` : ""}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Credit awarded</td><td style="font-weight:600;color:#059669;">+₹${d.credit}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Running balance</td><td style="font-weight:600;">₹${d.totalBalance}</td></tr>
          ${d.bankUpi ? `<tr><td style="padding:6px 0;color:#6b7280;">UPI</td><td>${esc(d.bankUpi)}</td></tr>` : ""}
          ${d.bankIfsc ? `<tr><td style="padding:6px 0;color:#6b7280;">IFSC</td><td>${esc(d.bankIfsc)} (${esc(d.bankHolder || "")})</td></tr>` : ""}
          <tr><td style="padding:6px 0;color:#6b7280;">Time</td><td>${ist(d.timestamp)}</td></tr>
        </table>
      </div>
    `,
  };
}

export function bankLinkEmail(d) {
  const method = d.upiId
    ? `UPI: ${d.upiId}`
    : `Bank account ending ${d.ifsc} (${d.accountHolder})`;
  return {
    subject: `🏦 ${d.userName} linked payout method`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="margin:0 0 4px;color:#3b82f6;">🏦 New Payout Method Linked</h2>
        <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">KisanSaathi user is now eligible for payouts.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#6b7280;width:140px;">User</td><td style="font-weight:600;">${esc(d.userName)}${d.userPhone ? ` (+91 ${esc(d.userPhone)})` : ""}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Payout method</td><td style="font-weight:600;">${esc(method)}</td></tr>
          ${d.upiId ? `<tr><td style="padding:8px 0;color:#6b7280;">UPI ID</td><td style="font-weight:600;color:#059669;">${esc(d.upiId)}</td></tr>` : ""}
          ${d.ifsc ? `<tr><td style="padding:8px 0;color:#6b7280;">IFSC</td><td style="font-weight:600;">${esc(d.ifsc)}</td></tr>` : ""}
          ${d.accountHolder ? `<tr><td style="padding:8px 0;color:#6b7280;">Account holder</td><td>${esc(d.accountHolder)}</td></tr>` : ""}
          <tr><td style="padding:8px 0;color:#6b7280;">Time</td><td>${ist(d.timestamp)}</td></tr>
        </table>
      </div>
    `,
  };
}

// ─── Utils ───────────────────────────────────────────────────

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function ist(ts) {
  return new Date(ts || Date.now()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}
