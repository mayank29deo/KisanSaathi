import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMandiPrices, getMandiStates, getMandiCommodities } from "../data/mandiPrices";

const ALL_STATES = getMandiStates();
const ALL_COMMODITIES = getMandiCommodities();

export default function Mandi({ t }) {
  const [search, setSearch]   = useState("");
  const [state, setState]     = useState("");
  const [commodity, setCommodity] = useState("");

  const lang = t?._lang || "en";

  // Generate today's prices (memoized — only recalculates on date change)
  const allPrices = useMemo(() => getMandiPrices(), []);
  const todayStr = allPrices[0]?.date || new Date().toISOString().slice(0, 10);

  // Filter
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

  // Commodity name in user language
  const cName = (p) =>
    lang === "hi" ? `${p.commodity_hi}` :
    lang === "bn" ? `${p.commodity_bn}` :
    p.commodity;

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
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-600">LIVE</span>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          {t?.mandiSubtitle || "Today's indicative wholesale prices (₹/quintal)"}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{todayStr}</p>
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
            {ALL_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">{t?.mandiAllCrops || "All Crops"}</option>
            {ALL_COMMODITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {lang === "hi" ? c.name_hi : lang === "bn" ? c.name_bn : c.name}
              </option>
            ))}
          </select>
        </div>

        {(search || state || commodity) && (
          <button
            onClick={() => { setSearch(""); setState(""); setCommodity(""); }}
            className="text-xs text-gray-500 font-semibold px-3 py-1 rounded-lg bg-gray-100 active:scale-95 transition-transform"
          >
            {t?.clearFilters || "Clear filters"}
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-400 px-1">
        {filtered.length} {t?.mandiResults || "results"}
        {state && ` · ${state}`}
        {commodity && ` · ${ALL_COMMODITIES.find((c) => c.id === commodity)?.name || ""}`}
      </p>

      {/* Price cards */}
      <div className="space-y-2.5">
        <AnimatePresence>
          {filtered.length > 0 ? (
            filtered.slice(0, 50).map((p, i) => (
              <motion.div
                key={`${p.commodityId}-${p.market}-${p.state}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: commodity + market info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 text-base truncate">{cName(p)}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      📍 {p.market}, {p.state}
                    </p>
                  </div>

                  {/* Right: price + change */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-extrabold text-gray-900">
                      ₹{p.modal.toLocaleString("en-IN")}
                    </p>
                    <div className={`flex items-center justify-end gap-1 mt-0.5 ${
                      p.change > 0 ? "text-emerald-600" : p.change < 0 ? "text-red-500" : "text-gray-400"
                    }`}>
                      <span className="text-xs font-bold">
                        {p.change > 0 ? "▲" : p.change < 0 ? "▼" : "—"}
                        {Math.abs(p.change)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Min/Max bar */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="text-xs text-gray-400 w-16 text-right">
                    ₹{p.min.toLocaleString("en-IN")}
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
                    {/* Range fill */}
                    <div
                      className="absolute h-full bg-gradient-to-r from-amber-300 to-emerald-400 rounded-full"
                      style={{
                        left: "0%",
                        width: "100%",
                      }}
                    />
                    {/* Modal price marker */}
                    <div
                      className="absolute top-0 h-full w-0.5 bg-gray-800 rounded-full"
                      style={{
                        left: `${((p.modal - p.min) / (p.max - p.min)) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 w-16">
                    ₹{p.max.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>Min</span>
                  <span className="font-semibold text-gray-600">
                    Modal: ₹{p.modal.toLocaleString("en-IN")}
                  </span>
                  <span>Max</span>
                </div>
              </motion.div>
            ))
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
