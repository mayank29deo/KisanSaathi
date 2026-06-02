/**
 * KisanSaathi — Google Apps Script Web App (Sheet-append only)
 *
 * Receives webhook POSTs from Vercel backend and appends rows to the
 * Google Sheet. Email notifications are now sent directly from Vercel
 * via Resend (api/_email.js) — Apps Script no longer touches MailApp.
 *
 * ─── SETUP (one-time, ~5 minutes) ────────────────────────────
 * 1. Create a new Google Sheet (any name, e.g. "KisanSaathi Tracking")
 * 2. In the Sheet: Extensions → Apps Script
 * 3. Delete any boilerplate code → paste THIS entire file
 * 4. Save (Ctrl/Cmd + S)
 * 5. Click "Deploy" → "New deployment"
 *      Type: Web app
 *      Execute as: Me (your account)
 *      Who has access: Anyone
 * 6. Click Deploy → authorise the script (allow access to Sheets only — no Gmail scope needed)
 * 7. COPY the Web app URL (looks like https://script.google.com/macros/s/AKfy.../exec)
 * 8. Add it to Vercel env vars as:  SHEETS_WEBHOOK_URL
 * 9. Redeploy Vercel (auto on next push, or manual via dashboard)
 * ──────────────────────────────────────────────────────────────
 */

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
}

// ─── Utils ───────────────────────────────────────────────────

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
