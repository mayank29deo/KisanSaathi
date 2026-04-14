/**
 * Vercel Serverless Function: GET /api/fetch-mandi-prices
 *
 * Fetches daily commodity prices from data.gov.in open API
 * (Ministry of Agriculture — daily mandi price dataset).
 *
 * Query params:
 *   ?state=Punjab          (optional state filter)
 *   ?commodity=Wheat       (optional commodity filter)
 *   ?limit=100             (optional, default 200)
 *
 * Returns JSON array of price records.
 * Uses data.gov.in's free sample API key (1000 req/day).
 */

// data.gov.in provides a sample API key for testing — works for moderate traffic.
// For production, register at data.gov.in and get your own key, then set DATA_GOV_API_KEY env var.
const DEFAULT_API_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b";

const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const BASE_URL = `https://api.data.gov.in/resource/${RESOURCE_ID}`;

// In-memory cache for warm function instances
let cache = { data: null, ts: 0 };
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const stateFilter     = req.query?.state || "";
  const commodityFilter = req.query?.commodity || "";
  const limit           = Math.min(parseInt(req.query?.limit) || 200, 500);

  // Build cache key based on filters
  const cacheKey = `${stateFilter}|${commodityFilter}|${limit}`;

  // Check cache (only for default/no-filter queries)
  if (!stateFilter && !commodityFilter && cache.data && Date.now() - cache.ts < CACHE_TTL) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "public, s-maxage=1800");
    return res.status(200).json({ ok: true, source: "data.gov.in-cached", records: cache.data, total: cache.total });
  }

  try {
    const apiKey = process.env.DATA_GOV_API_KEY || DEFAULT_API_KEY;

    // Build query URL with filters
    const params = new URLSearchParams({
      "api-key": apiKey,
      format: "json",
      limit: String(limit),
      offset: "0",
    });

    if (stateFilter) {
      params.append("filters[state.keyword]", stateFilter);
    }
    if (commodityFilter) {
      params.append("filters[commodity]", commodityFilter);
    }

    const url = `${BASE_URL}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`data.gov.in returned ${response.status}`);
    }

    const json = await response.json();

    if (json.status !== "ok" || !json.records) {
      throw new Error("Unexpected response format from data.gov.in");
    }

    // Normalize records to a clean format
    const records = json.records
      .filter((r) => r.modal_price > 0)
      .map((r) => ({
        state:      r.state,
        district:   r.district,
        market:     r.market,
        commodity:  r.commodity,
        variety:    r.variety || "",
        grade:      r.grade || "",
        min:        r.min_price,
        max:        r.max_price,
        modal:      r.modal_price,
        date:       r.arrival_date || "",
      }));

    // Cache default queries
    if (!stateFilter && !commodityFilter) {
      cache = { data: records, total: json.total, ts: Date.now() };
    }

    res.setHeader("Cache-Control", "public, s-maxage=1800");
    return res.status(200).json({
      ok: true,
      source: "data.gov.in",
      total: json.total,
      records,
    });

  } catch (err) {
    console.error("data.gov.in fetch error:", err.message);
    return res.status(200).json({
      ok: false,
      source: "data.gov.in-error",
      error: err.message,
      records: [],
    });
  }
};
