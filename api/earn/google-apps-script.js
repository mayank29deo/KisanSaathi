/**
 * KisanSaathi — Google Apps Script Web App
 *
 * Receives webhook POSTs from Vercel backend, appends rows to the
 * Google Sheet, and emails the admin in real time.
 *
 * ─── SETUP (one-time, ~5 minutes) ────────────────────────────
 * 1. Create a new Google Sheet (any name, e.g. "KisanSaathi Tracking")
 * 2. In the Sheet: Extensions → Apps Script
 * 3. Delete any boilerplate code → paste THIS entire file
 * 4. Update ADMIN_EMAIL below if needed (currently mayank29deo@gmail.com)
 * 5. Save (Ctrl/Cmd + S)
 * 6. Click "Deploy" → "New deployment"
 *      Type: Web app
 *      Execute as: Me (your account)
 *      Who has access: Anyone
 * 7. Click Deploy → authorise the script (allow access to Sheets + Gmail)
 * 8. COPY the Web app URL (looks like https://script.google.com/macros/s/AKfy.../exec)
 * 9. Add it to Vercel env vars as:  SHEETS_WEBHOOK_URL
 * 10. Redeploy Vercel (auto on next push, or manual via dashboard)
 * ──────────────────────────────────────────────────────────────
 *
 * After setup, every signup and price entry will:
 *   - Append a row to the corresponding tab in this sheet
 *   - Send you an email
 */

const ADMIN_EMAIL = "mayank29deo@gmail.com";  // CHANGE THIS to where you want notifications sent
const APP_NAME = "KisanSaathi";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === "signup") {
      handleSignup(sheet, data);
    } else if (data.type === "price_entry") {
      handlePriceEntry(sheet, data);
    } else if (data.type === "bank_link") {
      handleBankLink(sheet, data);
    } else {
      return jsonResponse({ ok: false, error: "unknown_type" });
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doGet() {
  return jsonResponse({ ok: true, app: APP_NAME, status: "running" });
}

// ─── Signup handler ──────────────────────────────────────────

function handleSignup(sheet, d) {
  let tab = sheet.getSheetByName("Signups");
  if (!tab) {
    tab = sheet.insertSheet("Signups");
    tab.appendRow([
      "Timestamp", "User ID", "Name", "Phone", "Email",
      "Provider", "Language",
    ]);
    tab.getRange("A1:G1").setFontWeight("bold").setBackground("#059669").setFontColor("#fff");
    tab.setFrozenRows(1);
  }

  tab.appendRow([
    new Date(d.timestamp || Date.now()),
    d.id || "",
    d.name || "",
    d.phone || "",
    d.email || "",
    d.provider || "phone",
    d.lang || "en",
  ]);

  // Email notification
  const providerEmoji = d.provider === "google" ? "🟦" : "📱";
  const subject = `🎉 New ${APP_NAME} user: ${d.name}`;
  const html = `
    <div style="font-family:sans-serif;max-width:520px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="margin:0 0 4px;color:#059669;">🎉 New User Signup</h2>
      <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">Someone just joined ${APP_NAME}!</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Name</td><td style="font-weight:600;">${escape(d.name)}</td></tr>
        ${d.phone ? `<tr><td style="padding:8px 0;color:#6b7280;">Phone</td><td style="font-weight:600;">+91 ${escape(d.phone)}</td></tr>` : ""}
        ${d.email ? `<tr><td style="padding:8px 0;color:#6b7280;">Email</td><td style="font-weight:600;">${escape(d.email)}</td></tr>` : ""}
        <tr><td style="padding:8px 0;color:#6b7280;">Provider</td><td style="font-weight:600;">${providerEmoji} ${d.provider}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Language</td><td style="font-weight:600;">${(d.lang || "en").toUpperCase()}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Time</td><td>${new Date(d.timestamp || Date.now()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>
      </table>
    </div>
  `;
  MailApp.sendEmail({ to: ADMIN_EMAIL, subject, htmlBody: html });
}

// ─── Price entry handler ─────────────────────────────────────

function handlePriceEntry(sheet, d) {
  let tab = sheet.getSheetByName("PriceEntries");
  if (!tab) {
    tab = sheet.insertSheet("PriceEntries");
    tab.appendRow([
      "Timestamp", "User Name", "User Phone", "User ID",
      "Commodity", "Price (₹)", "Unit", "Source Type",
      "State", "District", "Pincode",
      "Status", "Flag Reason", "Credit (₹)",
      "Total Balance (₹)", "Bank UPI", "Bank IFSC", "Bank Holder",
      "Ready For Payout?",
    ]);
    tab.getRange("A1:S1").setFontWeight("bold").setBackground("#f59e0b").setFontColor("#fff");
    tab.setFrozenRows(1);
  }

  tab.appendRow([
    new Date(d.timestamp || Date.now()),
    d.userName || "",
    d.userPhone || "",
    d.userId || "",
    d.commodity || "",
    d.price || 0,
    d.unit || "",
    d.sourceType || "",
    d.state || "",
    d.district || "",
    d.pincode || "",
    d.status || "",
    d.flagReason || "",
    d.credit || 0,
    d.totalBalance || 0,
    d.bankUpi || "",
    d.bankIfsc || "",
    d.bankHolder || "",
    d.readyForPayout ? "YES — DISBURSE" : "no",
  ]);

  // Email notification — short, actionable, focused on payout
  const statusBadge = d.status === "verified"
    ? '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">VERIFIED ✓</span>'
    : `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">FLAGGED ⚠ (${d.flagReason || "review"})</span>`;
  const payoutBanner = d.readyForPayout
    ? `<div style="background:#10b981;color:#fff;padding:12px;border-radius:8px;margin-bottom:12px;text-align:center;font-weight:700;">💰 READY FOR PAYOUT — ₹${d.totalBalance} to ${d.bankUpi || d.bankIfsc}</div>`
    : "";
  const subject = `${d.readyForPayout ? "💰 PAYOUT READY: " : ""}₹${d.price}/${d.unit} ${d.commodity} — ${d.userName}`;

  const html = `
    <div style="font-family:sans-serif;max-width:520px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
      ${payoutBanner}
      <h2 style="margin:0 0 4px;color:#f59e0b;">💸 New Price Entry</h2>
      <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">${statusBadge}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#6b7280;width:130px;">User</td><td style="font-weight:600;">${escape(d.userName)}${d.userPhone ? ` (+91 ${escape(d.userPhone)})` : ""}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Commodity</td><td style="font-weight:600;">${escape(d.commodity)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Price</td><td style="font-weight:600;">₹${d.price} / ${escape(d.unit)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Source</td><td>${escape(d.sourceType)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Location</td><td>${escape(d.district)}${d.pincode ? `, ${escape(d.pincode)}` : ""}${d.state ? ` (${escape(d.state)})` : ""}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Credit awarded</td><td style="font-weight:600;color:#059669;">+₹${d.credit}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Running balance</td><td style="font-weight:600;">₹${d.totalBalance}</td></tr>
        ${d.bankUpi ? `<tr><td style="padding:6px 0;color:#6b7280;">UPI</td><td>${escape(d.bankUpi)}</td></tr>` : ""}
        ${d.bankIfsc ? `<tr><td style="padding:6px 0;color:#6b7280;">IFSC</td><td>${escape(d.bankIfsc)} (${escape(d.bankHolder || "")})</td></tr>` : ""}
        <tr><td style="padding:6px 0;color:#6b7280;">Time</td><td>${new Date(d.timestamp || Date.now()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>
      </table>
    </div>
  `;
  MailApp.sendEmail({ to: ADMIN_EMAIL, subject, htmlBody: html });
}

// ─── Bank link handler ───────────────────────────────────────

function handleBankLink(sheet, d) {
  let tab = sheet.getSheetByName("BankLinks");
  if (!tab) {
    tab = sheet.insertSheet("BankLinks");
    tab.appendRow([
      "Timestamp", "User Name", "User Phone", "User ID",
      "UPI ID", "IFSC", "Account Holder", "Has Account Number?",
    ]);
    tab.getRange("A1:H1").setFontWeight("bold").setBackground("#3b82f6").setFontColor("#fff");
    tab.setFrozenRows(1);
  }

  tab.appendRow([
    new Date(d.timestamp || Date.now()),
    d.userName || "",
    d.userPhone || "",
    d.userId || "",
    d.upiId || "",
    d.ifsc || "",
    d.accountHolder || "",
    d.hasAccountNumber ? "yes" : "no",
  ]);

  const method = d.upiId
    ? `UPI: ${d.upiId}`
    : `Bank account ending ${d.ifsc} (${d.accountHolder})`;
  const subject = `🏦 ${d.userName} linked payout method`;
  const html = `
    <div style="font-family:sans-serif;max-width:520px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="margin:0 0 4px;color:#3b82f6;">🏦 New Payout Method Linked</h2>
      <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">${APP_NAME} user is now eligible for payouts.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:140px;">User</td><td style="font-weight:600;">${escape(d.userName)}${d.userPhone ? ` (+91 ${escape(d.userPhone)})` : ""}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Payout method</td><td style="font-weight:600;">${escape(method)}</td></tr>
        ${d.upiId ? `<tr><td style="padding:8px 0;color:#6b7280;">UPI ID</td><td style="font-weight:600;color:#059669;">${escape(d.upiId)}</td></tr>` : ""}
        ${d.ifsc ? `<tr><td style="padding:8px 0;color:#6b7280;">IFSC</td><td style="font-weight:600;">${escape(d.ifsc)}</td></tr>` : ""}
        ${d.accountHolder ? `<tr><td style="padding:8px 0;color:#6b7280;">Account holder</td><td>${escape(d.accountHolder)}</td></tr>` : ""}
        <tr><td style="padding:8px 0;color:#6b7280;">Time</td><td>${new Date(d.timestamp || Date.now()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>
      </table>
    </div>
  `;
  MailApp.sendEmail({ to: ADMIN_EMAIL, subject, htmlBody: html });
}

// ─── Utils ───────────────────────────────────────────────────

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function escape(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
