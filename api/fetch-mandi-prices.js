/**
 * Vercel Serverless Function: GET /api/fetch-mandi-prices
 *
 * Fetches daily commodity prices from data.gov.in open API.
 * The free API key returns max 10 records per request, so we
 * paginate with parallel requests spread across the dataset
 * to sample ~200 diverse records covering all states + commodities.
 *
 * Query params:
 *   ?state=Punjab          (optional state filter)
 *   ?commodity=Wheat       (optional commodity filter)
 *
 * Caches results for 3 hours.
 */

const DEFAULT_API_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b";
const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const BASE_URL = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
const PER_PAGE = 10; // API cap per request with free key

// In-memory cache
let cache = { data: null, total: 0, ts: 0 };
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

async function fetchPage(apiKey, offset, stateFilter, commodityFilter) {
  const params = new URLSearchParams({
    "api-key": apiKey,
    format: "json",
    limit: String(PER_PAGE),
    offset: String(offset),
  });
  if (stateFilter) params.append("filters[state.keyword]", stateFilter);
  if (commodityFilter) params.append("filters[commodity]", commodityFilter);

  const res = await fetch(`${BASE_URL}?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return { records: [], total: 0 };
  const json = await res.json();
  return { records: json.records || [], total: json.total || 0 };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const stateFilter     = req.query?.state || "";
  const commodityFilter = req.query?.commodity || "";
  const noFilter        = !stateFilter && !commodityFilter;

  // Return cache for unfiltered requests
  if (noFilter && cache.data && Date.now() - cache.ts < CACHE_TTL) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "public, s-maxage=1800");
    return res.status(200).json({ ok: true, source: "data.gov.in-cached", records: cache.data, total: cache.total });
  }

  try {
    const apiKey = process.env.DATA_GOV_API_KEY || DEFAULT_API_KEY;

    // Step 1: Get total count
    const first = await fetchPage(apiKey, 0, stateFilter, commodityFilter);
    const total = first.total || 0;

    if (total === 0) {
      return res.status(200).json({ ok: true, source: "data.gov.in", records: [], total: 0 });
    }

    // Step 2: Spread 25 parallel requests evenly across the dataset
    const numRequests = Math.min(25, Math.ceil(total / PER_PAGE));
    const step = Math.floor(total / numRequests);
    const offsets = [];
    for (let i = 0; i < numRequests; i++) {
      const off = i * step;
      if (off > 0) offsets.push(off); // skip 0, we already have it
    }

    // Parallel fetch
    const pages = await Promise.allSettled(
      offsets.map((off) => fetchPage(apiKey, off, stateFilter, commodityFilter))
    );

    // Combine all records
    const allRecords = [...first.records];
    for (const p of pages) {
      if (p.status === "fulfilled" && p.value.records.length > 0) {
        allRecords.push(...p.value.records);
      }
    }

    // Deduplicate by (market + commodity)
    const seen = new Set();
    const unique = allRecords.filter((r) => {
      const key = `${r.state}|${r.market}|${r.commodity}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return r.modal_price > 0;
    });

    // Normalize
    const records = unique.map((r) => ({
      state:     r.state,
      district:  r.district,
      market:    r.market,
      commodity: r.commodity,
      variety:   r.variety || "",
      grade:     r.grade || "",
      min:       r.min_price,
      max:       r.max_price,
      modal:     r.modal_price,
      date:      r.arrival_date || "",
    }));

    // Cache unfiltered results
    if (noFilter) {
      cache = { data: records, total, ts: Date.now() };
    }

    res.setHeader("Cache-Control", "public, s-maxage=1800");
    return res.status(200).json({
      ok: true,
      source: "data.gov.in",
      total,
      sampled: records.length,
      records,
    });

  } catch (err) {
    console.error("data.gov.in error:", err.message);
    return res.status(200).json({
      ok: false,
      source: "data.gov.in-error",
      error: err.message,
      records: [],
    });
  }
};
