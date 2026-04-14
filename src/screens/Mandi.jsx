import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMandiPrices, getMandiStates, getMandiCommodities } from "../data/mandiPrices";

const ALL_STATES = getMandiStates();
const ALL_COMMODITIES = getMandiCommodities();

const LIVE_CACHE_KEY = "ks_mandi_live";
const LIVE_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

/** Try loading cached live data from localStorage */
function getCachedLive() {
  try {
    const raw = JSON.parse(localStorage.getItem(LIVE_CACHE_KEY));
    if (raw && Date.now() - raw._ts < LIVE_CACHE_TTL && raw.records?.length > 0) return raw;
  } catch {}
  return null;
}

/** Normalize a data.gov.in record to match our card format */
function normalizeLiveRecord(r) {
  const needle = (r.commodity || "").toLowerCase();
  const match = ALL_COMMODITIES.find((c) =>
    needle.includes(c.id) ||
    c.name.toLowerCase().includes(needle) ||
    needle.includes(c.name.toLowerCase().split(" ")[0]) ||
    needle.includes(c.name.toLowerCase().split("(")[0].trim())
  );

  // Determine trend from seasonal data if we have a match
  const month = new Date().getMonth() + 1;
  let trend = "stable", trendReason = "Prices expected to remain stable";

  return {
    commodityId:  match?.id || needle.replace(/[^a-z0-9]/g, "_"),
    commodity:    r.commodity,
    commodity_hi: match?.name_hi || r.commodity,
    commodity_bn: match?.name_bn || r.commodity,
    market:       r.market || "—",
    state:        r.state || "—",
    district:     r.district || "",
    variety:      r.variety || "",
    modal:        r.modal,
    min:          r.min || Math.round(r.modal * 0.9),
    max:          r.max || Math.round(r.modal * 1.1),
    change:       0,
    trend,
    trendReason,
    history:      [],
    date:         r.date || new Date().toISOString().slice(0, 10),
    isLive:       true,
  };
}

const TREND_CONFIG = {
  up:          { icon: "📈", label: "Likely to rise",     labelHi: "बढ़ने की संभावना",   labelBn: "বাড়ার সম্ভাবনা",   color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  slight_up:   { icon: "↗️", label: "May increase",       labelHi: "बढ़ सकता है",       labelBn: "বাড়তে পারে",       color: "text-green-600 bg-green-50 border-green-100" },
  stable:      { icon: "➡️", label: "Stable",             labelHi: "स्थिर",             labelBn: "স্থিতিশীল",          color: "text-gray-500 bg-gray-50 border-gray-100" },
  slight_down: { icon: "↘️", label: "May decrease",       labelHi: "घट सकता है",        labelBn: "কমতে পারে",         color: "text-orange-500 bg-orange-50 border-orange-100" },
  down:        { icon: "📉", label: "Likely to fall",     labelHi: "गिरने की संभावना",   labelBn: "কমার সম্ভাবনা",    color: "text-red-500 bg-red-50 border-red-100" },
};

const TREND_REASONS = {
  "Off-season / demand rise ahead":    { hi: "ऑफ-सीजन / आगे माँग बढ़ेगी",      bn: "অফ-সিজন / চাহিদা বাড়বে" },
  "Gradual price increase expected":   { hi: "धीरे-धीरे दाम बढ़ने की उम्मीद",   bn: "ধীরে ধীরে দাম বাড়ার সম্ভাবনা" },
  "Harvest season approaching":        { hi: "फसल कटाई का मौसम आ रहा है",       bn: "ফসল কাটার মৌসুম আসছে" },
  "Supply increase expected":          { hi: "आपूर्ति बढ़ने की संभावना",          bn: "সরবরাহ বাড়ার সম্ভাবনা" },
  "Prices expected to remain stable":  { hi: "दाम स्थिर रहने की उम्मीद",        bn: "দাম স্থিতিশীল থাকার সম্ভাবনা" },
};

/** Mini sparkline SVG from 7-day history */
function Sparkline({ data, trend }) {
  if (!data || data.length < 2) return null;
  const h = 24, w = 60;
  const mn = Math.min(...data), mx = Math.max(...data);
  const range = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / range) * h}`).join(" ");
  const strokeColor = trend === "up" || trend === "slight_up" ? "#10b981" : trend === "down" || trend === "slight_down" ? "#ef4444" : "#9ca3af";
  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

export default function Mandi({ t }) {
  const [search, setSearch]       = useState("");
  const [state, setState]         = useState("");
  const [commodity, setCommodity] = useState("");
  const [liveData, setLiveData]   = useState(() => getCachedLive());
  const [liveLoading, setLiveLoading] = useState(false);

  const lang = t?._lang || "en";
  const localPrices = useMemo(() => getMandiPrices(), []);
  const todayStr = new Date().toISOString().slice(0, 10);

  const isFiltered = !!(search || state || commodity);

  // Source: live data if available, else local engine
  const source = liveData?.records?.length > 0 ? "live" : "local";
  const allPrices = useMemo(() => {
    if (liveData?.records?.length > 0) {
      return liveData.records.map(normalizeLiveRecord);
    }
    return localPrices;
  }, [liveData, localPrices]);

  // Fetch live data from data.gov.in on mount (if cache expired)
  useEffect(() => {
    if (liveData && Date.now() - liveData._ts < LIVE_CACHE_TTL) return;
    let cancelled = false;
    setLiveLoading(true);

    fetch("/api/fetch-mandi-prices?limit=2000")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.ok && json.records?.length > 0) {
          const cached = { records: json.records, source: json.source, total: json.total, _ts: Date.now() };
          localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify(cached));
          setLiveData(cached);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLiveLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // Unique states from live data for filter dropdown
  const liveStates = useMemo(() => {
    if (source !== "live") return ALL_STATES;
    const s = new Set(allPrices.map((p) => p.state));
    return [...s].sort();
  }, [allPrices, source]);

  // Unique commodities from live data for filter dropdown
  const liveCommodities = useMemo(() => {
    if (source !== "live") {
      return ALL_COMMODITIES.map((c) => ({
        id: c.id,
        label: lang === "hi" ? c.name_hi : lang === "bn" ? c.name_bn : c.name,
      }));
    }
    const seen = new Map();
    for (const p of allPrices) {
      const key = p.commodityId;
      if (!seen.has(key)) {
        seen.set(key, {
          id: key,
          label: lang === "hi" ? p.commodity_hi : lang === "bn" ? p.commodity_bn : p.commodity,
        });
      }
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [allPrices, source, lang]);

  // Default "highlights" — one entry per unique commodity, from different states
  const highlights = useMemo(() => {
    const picked = [];
    const seenCommodities = new Set();
    const usedStates = new Set();

    // Sort by modal price descending so higher-value crops show first
    const sorted = [...allPrices].sort((a, b) => b.modal - a.modal);

    for (const p of sorted) {
      const key = p.commodity.toLowerCase().trim();
      if (seenCommodities.has(key)) continue;

      // Prefer entries from states we haven't shown yet (variety)
      const sameComm = sorted.filter((x) => x.commodity.toLowerCase().trim() === key);
      const fromNewState = sameComm.find((x) => !usedStates.has(x.state));
      const entry = fromNewState || sameComm[0];

      seenCommodities.add(key);
      picked.push(entry);
      usedStates.add(entry.state);
      if (usedStates.size >= 15) usedStates.clear(); // reset to keep variety going
      if (picked.length >= 40) break; // cap at 40 highlights
    }

    return picked;
  }, [allPrices]);

  // Filtered results when user applies filters
  const filtered = useMemo(() => {
    return allPrices.filter((p) => {
      const stateOk = !state || p.state === state;
      const commOk  = !commodity || p.commodityId === commodity;
      const searchOk = !search ||
        p.commodity.toLowerCase().includes(search.toLowerCase()) ||
        p.commodity_hi.includes(search) ||
        p.commodity_bn.includes(search) ||
        p.market.toLowerCase().includes(search.toLowerCase());
      return stateOk && commOk && searchOk;
    });
  }, [allPrices, state, commodity, search]);

  const displayList = isFiltered ? filtered : highlights;

  const cName = (p) =>
    lang === "hi" ? p.commodity_hi : lang === "bn" ? p.commodity_bn : p.commodity;

  const trendLabel = (trend) => {
    const cfg = TREND_CONFIG[trend] || TREND_CONFIG.stable;
    return lang === "hi" ? cfg.labelHi : lang === "bn" ? cfg.labelBn : cfg.label;
  };

  const trendReasonText = (reason) => {
    const r = TREND_REASONS[reason];
    if (!r) return reason;
    return lang === "hi" ? r.hi : lang === "bn" ? r.bn : reason;
  };

  return (
    <motion.div
      key="mandi"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="pb-24 space-y-5"
    >
      {/* Header */}
      <div className="pt-2 px-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-gray-900">
            📊 {t?.mandi || "Mandi Prices"}
          </h1>
          <div className="flex items-center gap-1.5">
            {liveLoading ? (
              <span className="flex items-center gap-1 text-xs text-blue-500 font-semibold">
                <span className="w-2.5 h-2.5 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                Fetching…
              </span>
            ) : source === "live" ? (
              <>
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-600">AGMARKNET LIVE</span>
              </>
            ) : (
              <>
                <span className="inline-flex h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold text-amber-600">ESTIMATED</span>
              </>
            )}
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          {source === "live"
            ? (t?.mandiSubtitleLive || "Today's wholesale prices from Agmarknet (₹/quintal)")
            : (t?.mandiSubtitle || "Today's indicative wholesale prices (₹/quintal)")}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {todayStr}
          {source === "live" && liveData?.total && ` · ${liveData.total.toLocaleString("en-IN")} records across India`}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <input
          type="text"
          placeholder={t?.mandiSearch || "Search crop or market…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">{t?.mandiAllStates || "All States"}</option>
            {liveStates.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">{t?.mandiAllCrops || "All Crops"}</option>
            {liveCommodities.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        {isFiltered && (
          <button
            onClick={() => { setSearch(""); setState(""); setCommodity(""); }}
            className="text-xs text-gray-500 font-semibold px-3 py-1 rounded-lg bg-gray-100 active:scale-95 transition-transform"
          >
            {t?.clearFilters || "Clear filters"}
          </button>
        )}
      </div>

      {/* Section label */}
      <div className="px-1 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {isFiltered
            ? `${filtered.length} ${t?.mandiResults || "results"}`
            : (t?.mandiHighlights || "Today's Market Highlights")}
        </p>
        {!isFiltered && (
          <p className="text-xs text-gray-400">{highlights.length} {t?.mandiCrops || "crops"}</p>
        )}
      </div>

      {/* Price cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {displayList.length > 0 ? (
            displayList.slice(0, 60).map((p, i) => {
              const tc = TREND_CONFIG[p.trend] || TREND_CONFIG.stable;
              return (
                <motion.div
                  key={`${p.commodityId}-${p.market}-${p.state}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* Main row */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-base truncate">{cName(p)}</h3>
                          {p.isLive && <span className="text-xs bg-emerald-100 text-emerald-600 font-bold px-1.5 py-0.5 rounded flex-shrink-0">LIVE</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">📍 {p.market}, {p.state}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-extrabold text-gray-900">₹{p.modal.toLocaleString("en-IN")}</p>
                        <div className={`flex items-center justify-end gap-1 mt-0.5 ${
                          p.change > 0 ? "text-emerald-600" : p.change < 0 ? "text-red-500" : "text-gray-400"
                        }`}>
                          <span className="text-xs font-bold">
                            {p.change > 0 ? "▲" : p.change < 0 ? "▼" : "—"} {Math.abs(p.change)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Min/Max bar */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-14 text-right">₹{p.min.toLocaleString("en-IN")}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden relative">
                        <div className="absolute h-full bg-gradient-to-r from-amber-300 to-emerald-400 rounded-full" style={{ width: "100%" }} />
                        <div className="absolute top-0 h-full w-0.5 bg-gray-800 rounded-full" style={{ left: `${((p.modal - p.min) / (p.max - p.min)) * 100}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-14">₹{p.max.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Trend + sparkline footer */}
                  <div className={`px-4 py-2.5 border-t flex items-center justify-between gap-3 ${tc.color}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{tc.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{trendLabel(p.trend)}</p>
                        <p className="text-xs opacity-70 truncate">{trendReasonText(p.trendReason)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Sparkline data={p.history} trend={p.trend} />
                      <span className="text-xs opacity-60">7d</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
              <div className="text-3xl mb-2 opacity-40">🔍</div>
              <p className="text-sm">{t?.noneFound || "No results found."}</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 text-center px-4 leading-relaxed">
        {t?.mandiDisclaimer || "Indicative prices based on historical market data with seasonal adjustments. Confirm rates at your local mandi before selling."}
      </p>
    </motion.div>
  );
}
