/**
 * Vercel Serverless Function: GET /api/fetch-mandi-prices
 *
 * Scrapes daily commodity prices from Agmarknet (agmarknet.gov.in).
 * Two-step process: GET page → extract ASP.NET ViewState → POST search → parse HTML table.
 *
 * Query params:
 *   ?commodity=Wheat&state=Punjab  (optional filters)
 *
 * Returns JSON array of price records.
 * Caches results for 6 hours via Cache-Control headers.
 *
 * Falls back gracefully — frontend has a local price engine as backup.
 */

const cheerio = require("cheerio");

const BASE_URL = "https://agmarknet.gov.in";
const SEARCH_URL = `${BASE_URL}/SearchCmmMkt.aspx`;

// Common commodities to fetch if no specific commodity is requested
const DEFAULT_COMMODITIES = [
  "Wheat", "Paddy(Dhan)(Common)", "Maize", "Cotton", "Soyabean",
  "Mustard", "Gram Dal(Chana Dal)", "Arhar (Tur/Red Gram)(Whole)",
  "Moong(Green Gram)(Whole)", "Urad (Whole)", "Masoor Dal",
  "Groundnut", "Bajra(Pearl Millet/Cumbu)", "Jowar(Sorghum)",
  "Potato", "Onion", "Tomato", "Banana", "Turmeric", "Coconut",
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Content-Type": "application/x-www-form-urlencoded",
};

/**
 * Step 1: Fetch the search page and extract ASP.NET tokens + dropdown values
 */
async function getPageTokens() {
  const res = await fetch(SEARCH_URL, { headers: HEADERS, redirect: "follow" });
  if (!res.ok) throw new Error(`Agmarknet page fetch failed: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  return {
    viewState:          $('input[name="__VIEWSTATE"]').val() || "",
    viewStateGenerator: $('input[name="__VIEWSTATEGENERATOR"]').val() || "",
    eventValidation:    $('input[name="__EVENTVALIDATION"]').val() || "",
    cookies:            res.headers.get("set-cookie") || "",
  };
}

/**
 * Step 2: POST search query and parse the results table
 */
async function searchPrices(tokens, commodity, state) {
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const formData = new URLSearchParams({
    "__VIEWSTATE": tokens.viewState,
    "__VIEWSTATEGENERATOR": tokens.viewStateGenerator,
    "__EVENTVALIDATION": tokens.eventValidation,
    "ctl00$cph_InnerContainerRight$txt_FrmDt": dateStr,
    "ctl00$cph_InnerContainerRight$txt_ToDt": dateStr,
    "ctl00$cph_InnerContainerRight$ddl_Commodity": commodity || "",
    "ctl00$cph_InnerContainerRight$ddl_State": state || "--Select--",
    "ctl00$cph_InnerContainerRight$btn_Search": "Search",
  });

  const cookieHeader = tokens.cookies.split(",").map((c) => c.split(";")[0].trim()).join("; ");

  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { ...HEADERS, Cookie: cookieHeader },
    body: formData.toString(),
    redirect: "follow",
  });

  if (!res.ok) throw new Error(`Agmarknet search failed: ${res.status}`);
  return res.text();
}

/**
 * Parse the HTML results table into structured records
 */
function parseResults(html) {
  const $ = cheerio.load(html);
  const records = [];

  // Agmarknet uses a GridView table with ID containing "grd"
  $("table[id*='grd'] tr, table.dGrid tr, #ctl00_cph_InnerContainerRight_grd_MktData tr").each((i, row) => {
    if (i === 0) return; // skip header row
    const cells = $(row).find("td");
    if (cells.length < 6) return;

    const getText = (idx) => $(cells[idx]).text().trim();

    const record = {
      state:     getText(0),
      district:  getText(1),
      market:    getText(2),
      commodity: getText(3),
      variety:   getText(4),
      min:       parseInt(getText(5), 10) || 0,
      max:       parseInt(getText(6), 10) || 0,
      modal:     parseInt(getText(7), 10) || 0,
      date:      getText(8) || new Date().toISOString().slice(0, 10),
    };

    // Only include if we got meaningful price data
    if (record.modal > 0 && record.commodity) {
      records.push(record);
    }
  });

  return records;
}

// In-memory cache (persists across warm function invocations)
let cache = { data: null, ts: 0 };
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  // Check cache first
  if (cache.data && Date.now() - cache.ts < CACHE_TTL) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "public, s-maxage=3600");
    return res.status(200).json({ ok: true, source: "agmarknet-cached", records: cache.data });
  }

  try {
    // Step 1: Get page tokens
    const tokens = await getPageTokens();

    if (!tokens.viewState) {
      throw new Error("Could not extract ASP.NET ViewState — page structure may have changed");
    }

    // Step 2: Fetch prices for default commodities
    const allRecords = [];
    const commodity = req.query?.commodity || "";
    const state = req.query?.state || "";

    if (commodity) {
      // Specific commodity requested
      const html = await searchPrices(tokens, commodity, state);
      allRecords.push(...parseResults(html));
    } else {
      // Fetch top commodities (limit to 5 parallel to avoid rate limiting)
      const batches = [];
      for (let i = 0; i < DEFAULT_COMMODITIES.length; i += 5) {
        batches.push(DEFAULT_COMMODITIES.slice(i, i + 5));
      }

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(async (comm) => {
            // Re-fetch tokens for each request (ASP.NET may invalidate)
            try {
              const t = await getPageTokens();
              const html = await searchPrices(t, comm, state);
              return parseResults(html);
            } catch {
              return [];
            }
          })
        );
        for (const r of results) {
          if (r.status === "fulfilled") allRecords.push(...r.value);
        }
      }
    }

    if (allRecords.length > 0) {
      // Cache successful results
      cache = { data: allRecords, ts: Date.now() };
      res.setHeader("Cache-Control", "public, s-maxage=3600");
      return res.status(200).json({ ok: true, source: "agmarknet-live", records: allRecords });
    }

    // No records found — return empty (frontend will use fallback)
    return res.status(200).json({ ok: true, source: "agmarknet-empty", records: [] });

  } catch (err) {
    console.error("Agmarknet scrape error:", err.message);
    // Return error — frontend falls back to local engine
    return res.status(200).json({
      ok: false,
      source: "agmarknet-error",
      error: err.message,
      records: [],
    });
  }
};
