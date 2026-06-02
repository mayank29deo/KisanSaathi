/**
 * Admin auth — verifies a Firebase ID token and checks the email against
 * an allowlist. Use at the top of every /api/admin/* handler.
 *
 * Env vars:
 *   VITE_FIREBASE_API_KEY  — same Firebase Web API key used by the client
 *                            (Vercel exposes VITE_ vars to functions too)
 *   ADMIN_EMAILS           — comma-separated allowlist. Defaults to mayank29deo@gmail.com
 *
 * Underscore prefix tells Vercel not to expose this as a route.
 */

const DEFAULT_ADMINS = ["mayank29deo@gmail.com"];

export async function requireAdmin(req) {
  const auth = req.headers.authorization || "";
  const idToken = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!idToken) return { ok: false, status: 401, error: "missing_auth" };

  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (!apiKey) return { ok: false, status: 500, error: "firebase_not_configured" };

  // Verify token via Firebase Identity Toolkit. This call returns the
  // user record only if the token is valid + not expired + signed by Firebase.
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!r.ok) return { ok: false, status: 401, error: "invalid_token" };
  const data = await r.json();
  const email = data?.users?.[0]?.email;
  if (!email) return { ok: false, status: 401, error: "no_email" };

  const allowlist = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const admins = allowlist.length > 0 ? allowlist : DEFAULT_ADMINS;

  if (!admins.includes(email.toLowerCase())) {
    return { ok: false, status: 403, error: "not_admin" };
  }

  return { ok: true, email };
}

// CORS + method guard helper used by all admin endpoints
export function setAdminCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Convenience sb fetch wrapper used by all admin endpoints
export async function sb(path, opts = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("supabase_not_configured");
  const r = await fetch(url + path, {
    method: opts.method || "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return text; }
}
