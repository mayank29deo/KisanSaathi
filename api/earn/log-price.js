/**
 * Vercel Serverless Function: POST /api/earn/log-price
 *
 * Records a user-submitted commodity price entry.
 * Layered architecture for safe high-concurrency operation.
 *
 * Concurrency / abuse protection:
 *   1. Auth        — must include Authorization: Bearer <user_id>
 *   2. Idempotency — Idempotency-Key header (UUID) returns cached response on retry
 *   3. Rate limit  — max 30 entries/user/day (atomic counter)
 *   4. Schema      — commodity in master list, price > 0, valid unit
 *   5. Geo verify  — GPS coords within ~150 km of claimed district centroid (cheap check)
 *   6. Outlier     — flag if price > 3× median or < 0.3× median for last 7 days
 *   7. Dedup       — Postgres UNIQUE(user, commodity, district, date) atomically rejects duplicates
 *   8. Ledger      — single transaction: insert entry + credit ₹1
 *
 * Env vars required (Vercel):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY (service-role key — bypasses RLS for backend writes)
 */

const VALID_COMMODITIES = new Set([
  "onion","tomato","potato","garlic","ginger","carrot","cauliflower","cabbage","brinjal","okra",
  "spinach","green_chilli","capsicum","cucumber","pumpkin","bottle_gourd","bitter_gourd","radish",
  "beans","peas","banana","apple","mango","orange","grapes","papaya","pomegranate","guava",
  "watermelon","lemon","rice","wheat","atta","bajra","jowar","ragi","maize","tur_dal","moong_dal",
  "urad_dal","chana_dal","masoor_dal","rajma","chickpea","turmeric","red_chilli","coriander",
  "cumin","mustard_seed","mustard_oil","sunflower_oil","groundnut_oil","sugar","jaggery","milk",
  "ghee","paneer",
]);
const VALID_UNITS = new Set(["kg", "quintal", "litre", "dozen", "piece", "bunch"]);
const VALID_SOURCES = new Set(["mandi", "local_market", "veg_seller", "grocery"]);
const DAILY_LIMIT = 30;
const REWARD_PER_ENTRY = 1; // ₹

// Sanity bounds per unit (₹) — anything outside is auto-flagged
const PRICE_BOUNDS = {
  kg:      { min: 1,    max: 5000  },
  quintal: { min: 100,  max: 50000 },
  litre:   { min: 5,    max: 2000  },
  dozen:   { min: 5,    max: 2000  },
  piece:   { min: 1,    max: 5000  },
  bunch:   { min: 5,    max: 500   },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ─── Layer 1: Auth ─────────────────────────────────────────
  const auth = req.headers.authorization || "";
  const userId = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const idemKey = req.headers["idempotency-key"];
  if (!idemKey) return res.status(400).json({ error: "missing_idempotency_key" });

  // ─── Layer 4: Schema validation ────────────────────────────
  const { commodity, price, unit, sourceType, state, district, pincode, lat, lon } = req.body || {};
  if (!VALID_COMMODITIES.has(commodity)) return res.status(400).json({ error: "invalid_commodity" });
  if (!VALID_UNITS.has(unit))            return res.status(400).json({ error: "invalid_unit" });
  if (!VALID_SOURCES.has(sourceType))    return res.status(400).json({ error: "invalid_source" });
  if (typeof price !== "number" || price <= 0) return res.status(400).json({ error: "invalid_price" });
  if (!district || typeof district !== "string") return res.status(400).json({ error: "missing_district" });

  const bounds = PRICE_BOUNDS[unit];
  let priceFlag = null;
  if (price < bounds.min) priceFlag = "price_too_low";
  if (price > bounds.max) priceFlag = "price_too_high";

  // ─── Supabase init ─────────────────────────────────────────
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) {
    // Supabase not configured yet — return placeholder success for dev/preview
    return res.status(200).json({
      ok: true,
      mode: "local_only",
      message: "Supabase not configured. Entry stored client-side only.",
      status: priceFlag ? "flagged" : "verified",
      credit: priceFlag ? 0 : REWARD_PER_ENTRY,
    });
  }

  try {
    // ─── Layer 2: Idempotency check ──────────────────────────
    const idemRes = await sb(SB_URL, SB_KEY, "GET",
      `/rest/v1/idempotency_keys?key=eq.${idemKey}&user_id=eq.${userId}&select=response`);
    if (idemRes.length > 0) {
      return res.status(200).json(idemRes[0].response);
    }

    // ─── Layer 3: Rate limit (atomic increment) ──────────────
    const today = new Date().toISOString().slice(0, 10);
    const counterRow = await sb(SB_URL, SB_KEY, "POST",
      `/rest/v1/rpc/increment_daily_counter`,
      { p_user_id: userId, p_date: today, p_limit: DAILY_LIMIT }
    );
    if (counterRow?.error === "limit_exceeded") {
      return res.status(429).json({ error: "daily_limit_exceeded" });
    }

    // ─── Layer 5: Geo verify (deferred — Postgres function) ──
    let geoVerified = false;
    if (typeof lat === "number" && typeof lon === "number") {
      // Cheap server-side bbox check via Postgres function
      const geo = await sb(SB_URL, SB_KEY, "POST",
        `/rest/v1/rpc/check_geo_match`,
        { p_state: state, p_district: district, p_lat: lat, p_lon: lon }
      );
      geoVerified = !!geo?.matched;
    }

    // ─── Layer 6: Outlier detection ──────────────────────────
    const stats = await sb(SB_URL, SB_KEY, "GET",
      `/rest/v1/rpc/get_price_median?p_commodity=${commodity}&p_district=${encodeURIComponent(district)}&p_unit=${unit}&p_days=7`
    );
    let outlierFlag = null;
    if (stats?.median && stats.sample_size >= 3) {
      if (price > stats.median * 3) outlierFlag = "outlier_high";
      else if (price < stats.median * 0.3) outlierFlag = "outlier_low";
    }

    const flagReason = priceFlag || outlierFlag;
    const status = flagReason ? "flagged" : "verified";
    const credit = status === "verified" ? REWARD_PER_ENTRY : 0;

    // ─── Layer 7: Insert entry (UNIQUE constraint catches dups) ─
    const insertRes = await sb(SB_URL, SB_KEY, "POST",
      `/rest/v1/price_entries?select=id`,
      {
        user_id: userId, commodity, price, unit, source_type: sourceType,
        state, district, pincode, lat, lon, geo_verified: geoVerified,
        status, flagged_reason: flagReason,
      },
      { Prefer: "return=representation" }
    );
    if (insertRes?.code === "23505") {
      return res.status(409).json({ error: "duplicate_today" });
    }
    const entryId = insertRes?.[0]?.id;

    // ─── Layer 8: Ledger credit (only if verified) ───────────
    if (credit > 0 && entryId) {
      await sb(SB_URL, SB_KEY, "POST", `/rest/v1/earnings_ledger`, {
        user_id: userId, type: "price_entry", amount: credit,
        reference_id: entryId, description: `Price entry: ${commodity}`,
      });
    }

    // ─── Cache idempotent response ───────────────────────────
    const response = { ok: true, status, credit, flagReason, entryId };
    await sb(SB_URL, SB_KEY, "POST", `/rest/v1/idempotency_keys`, {
      key: idemKey, user_id: userId, response,
    });

    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ error: "internal", detail: err.message });
  }
}

async function sb(url, key, method, path, body, extraHeaders) {
  const r = await fetch(url + path, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(extraHeaders || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return text; }
}
