/**
 * POST /api/earn/link-bank
 * Stores user's bank/UPI for payouts. Encrypts account number at rest.
 *
 * Body: { accountHolder, accountNumber, ifsc, upiId? }
 */
import crypto from "node:crypto";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers.authorization || "";
  const userId = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const { accountHolder, accountNumber, ifsc, upiId } = req.body || {};
  if (!upiId && (!accountHolder || !accountNumber || !ifsc)) {
    return res.status(400).json({ error: "missing_fields" });
  }
  if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    return res.status(400).json({ error: "invalid_ifsc" });
  }
  if (upiId && !/^[\w.\-]+@[\w]+$/.test(upiId)) {
    return res.status(400).json({ error: "invalid_upi" });
  }

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const ENC_KEY = process.env.ENCRYPTION_KEY; // 32 bytes hex

  if (!SB_URL || !SB_KEY) {
    return res.status(200).json({ ok: true, mode: "local_only" });
  }

  try {
    // AES-256-GCM encrypt account number
    let encryptedAccNum = null;
    if (accountNumber && ENC_KEY) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(ENC_KEY, "hex"), iv);
      const encrypted = Buffer.concat([cipher.update(accountNumber, "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      encryptedAccNum = Buffer.concat([iv, tag, encrypted]).toString("base64");
    }

    await sbCall(SB_URL, SB_KEY, "POST", `/rest/v1/user_bank_accounts?on_conflict=user_id`, {
      user_id: userId,
      account_holder: accountHolder || null,
      account_number_encrypted: encryptedAccNum,
      ifsc: ifsc || null,
      upi_id: upiId || null,
      verified: false,
    }, { Prefer: "resolution=merge-duplicates" });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "internal", detail: err.message });
  }
}

async function sbCall(url, key, method, path, body, extra) {
  const r = await fetch(url + path, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(extra || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}
