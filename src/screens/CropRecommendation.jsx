import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStates, getDistricts, getSoilParams } from "../data/soilData";
import { getTopCrops } from "../utils/cropScoring";

const API_URL = "https://crop-recommendation-backend-production-d236.up.railway.app";
const SEASONS  = ["Kharif", "Rabi", "Zaid"];

const PARAM_META = [
  { key: "N",             icon: "🌿", label: "Nitrogen",      unit: "kg/ha", color: "bg-green-50  border-green-200  text-green-800"  },
  { key: "P",             icon: "🔵", label: "Phosphorus",    unit: "kg/ha", color: "bg-blue-50   border-blue-200   text-blue-800"   },
  { key: "K",             icon: "🟠", label: "Potassium",     unit: "kg/ha", color: "bg-orange-50 border-orange-200 text-orange-800" },
  { key: "pH",            icon: "⚗️", label: "Soil pH",       unit: "",      color: "bg-purple-50 border-purple-200 text-purple-800" },
  { key: "rainfall",      icon: "🌧️", label: "Rainfall",      unit: "mm",    color: "bg-sky-50    border-sky-200    text-sky-800"    },
  { key: "soil_moisture", icon: "💧", label: "Soil Moisture", unit: "%",     color: "bg-teal-50   border-teal-200   text-teal-800"   },
  { key: "min_temp",      icon: "🌡️", label: "Min Temp",      unit: "°C",    color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
  { key: "max_temp",      icon: "☀️", label: "Max Temp",      unit: "°C",    color: "bg-red-50    border-red-200    text-red-800"    },
];

// Colour gradient for success % bar
function barColor(pct) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 68) return "bg-green-400";
  if (pct >= 58) return "bg-yellow-400";
  return "bg-orange-400";
}

const STATES = getStates();

export default function CropRecommendation({ t }) {
  const [state,    setState]    = useState("");
  const [district, setDistrict] = useState("");
  const [season,   setSeason]   = useState("");
  const [params,   setParams]   = useState(null);
  const [results,  setResults]  = useState([]);   // array of { crop, pct, isMLPick, rank }
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [expanded, setExpanded] = useState(null);  // expanded crop id

  const districts = state ? getDistricts(state) : [];

  useEffect(() => {
    if (state && district && season) {
      setParams(getSoilParams(state, district, season));
      setResults([]);
      setError(null);
      setExpanded(null);
    } else {
      setParams(null);
    }
  }, [state, district, season]);

  function handleStateChange(s) {
    setState(s);
    setDistrict("");
    setParams(null);
    setResults([]);
  }

  async function handleSubmit() {
    if (!state || !district || !season || !params) {
      setError(t?.authErrorGeneric || "Please select State, District & Season first.");
      return;
    }
    setError(null);
    setLoading(true);
    setResults([]);

    // Run local scoring immediately (so UI is responsive even if API is slow)
    const localTop = getTopCrops(params, season, null, 4);
    setResults(localTop);

    // Then call ML backend — its pick becomes the confirmed #1
    try {
      const payload = {
        state:         state.toLowerCase().trim(),
        season,
        N:             params.N,   P: params.P,   K: params.K,
        pH:            params.pH,
        rainfall:      params.rainfall,
        soil_moisture: params.soil_moisture,
        min_temp:      params.min_temp,
        max_temp:      params.max_temp,
      };
      const res  = await fetch(`${API_URL}/predict`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        const mlPick = json.recommended_crop;
        if (mlPick) {
          // Re-rank with ML pick guaranteed at top
          setResults(getTopCrops(params, season, mlPick, 4));
        }
      }
    } catch {
      // Backend failed — local scoring results are still shown, no extra error needed
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !!(state && district && season && params);

  return (
    <motion.div
      key="crop"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="pb-24 space-y-5"
    >
      {/* Header */}
      <div className="pt-2 px-1">
        <h1 className="text-2xl font-extrabold text-gray-900">
          🌾 {t?.crop_title || "Crop Recommendation"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {t?.cropSubtitle || "Select your location & season — soil data is filled automatically."}
        </p>
      </div>

      {/* Step 1 — Location & Season */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Step 1 — Location & Season
        </p>

        {/* State */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {t?.state || "State"}
          </label>
          <select
            value={state}
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">{t?.select_state || "Select State"}</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* District */}
        <AnimatePresence>
          {state && (
            <motion.div
              key="district"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t?.district || "District"}
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">{t?.select_district || "Select District"}</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Season pills */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {t?.season || "Season"}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SEASONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeason(s)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  season === s
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-300"
                }`}
              >
                {s === "Kharif" ? (t?.kharif || "Kharif") :
                 s === "Rabi"   ? (t?.rabi   || "Rabi")   : (t?.zaid || "Zaid")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step 2 — Auto-filled soil data */}
      <AnimatePresence>
        {params && (
          <motion.div
            key="soil-params"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 px-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Step 2 — Soil & Climate Data
              </p>
              <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                Auto-filled
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-3">
                ICAR data for{" "}
                <span className="font-semibold text-gray-700">{district}, {state}</span>{" "}
                · <span className="font-semibold text-gray-700">{season}</span> season
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PARAM_META.map(({ key, icon, label, unit, color }) => (
                  <div key={key} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${color}`}>
                    <span className="text-base">{icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs opacity-70 truncate">{label}</div>
                      <div className="text-sm font-bold">{params[key]}{unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className={`w-full py-4 rounded-2xl text-white font-bold text-sm shadow-md transition-all ${
          canSubmit && !loading
            ? "bg-gradient-to-r from-emerald-500 to-green-600 active:scale-95"
            : "bg-gray-300 cursor-not-allowed"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {t?.predicting || "Getting recommendations…"}
          </span>
        ) : (
          t?.predict || "Recommend Crops"
        )}
      </button>

      {/* Results — 4 crop cards */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Section header */}
            <div className="flex items-center justify-between px-1 pt-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t?.result || "Recommended Crops"} · {district}
              </p>
              {loading && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 border border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  Verifying…
                </span>
              )}
            </div>

            {results.map(({ crop, pct, isMLPick, rank }, i) => (
              <CropCard
                key={crop.id}
                crop={crop}
                pct={pct}
                isMLPick={isMLPick}
                rank={rank}
                expanded={expanded === crop.id}
                onToggle={() => setExpanded(expanded === crop.id ? null : crop.id)}
                delay={i * 0.07}
                lang={t?._lang}
              />
            ))}

            <p className="text-xs text-gray-400 text-center pt-1 px-2">
              Success rates are estimated from soil & climate suitability.
              Consult your local KVK for final advice.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Crop Result Card ──────────────────────────────────────────────── */
function CropCard({ crop, pct, isMLPick, rank, expanded, onToggle, delay, lang }) {
  const rankColors = [
    "from-emerald-500 to-green-600",   // #1
    "from-blue-500 to-blue-600",       // #2
    "from-violet-500 to-purple-600",   // #3
    "from-orange-400 to-amber-500",    // #4
  ];
  const gradient = rankColors[(rank - 1) % rankColors.length];

  const cropName = lang === "hi" ? (crop.name_hi || crop.name)
                 : lang === "bn" ? (crop.name_bn || crop.name)
                 : crop.name;
  const tip = lang === "hi" ? (crop.tip_hi || crop.tip) : crop.tip;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-4"
      >
        <div className="flex items-center gap-3">
          {/* Rank badge */}
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>
            {rank}
          </div>

          {/* Emoji + name */}
          <div className="text-2xl flex-shrink-0">{crop.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900 text-base capitalize">{cropName}</span>
              {isMLPick && (
                <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                  ⭐ Top Pick
                </span>
              )}
            </div>
            {/* Progress bar */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, delay: delay + 0.1, ease: "easeOut" }}
                  className={`h-full rounded-full ${barColor(pct)}`}
                />
              </div>
              <span className={`text-sm font-extrabold flex-shrink-0 ${
                pct >= 80 ? "text-emerald-600" :
                pct >= 68 ? "text-green-500" :
                pct >= 58 ? "text-yellow-500" : "text-orange-500"
              }`}>
                {pct}%
              </span>
            </div>
          </div>

          {/* Expand chevron */}
          <div className={`text-gray-400 text-sm transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`}>
            ▼
          </div>
        </div>
      </button>

      {/* Expandable detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-3 border-t border-gray-50">
              {/* Season tags */}
              <div className="flex gap-1.5 flex-wrap pt-3">
                {(crop.seasons || []).map((s) => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                    {s}
                  </span>
                ))}
              </div>

              {/* Tip */}
              {tip && (
                <div className="flex gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <span className="text-base flex-shrink-0">💡</span>
                  <p className="text-xs text-amber-800 leading-relaxed">{tip}</p>
                </div>
              )}

              {/* Success rate breakdown */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">Suitability Score</p>
                <div className="flex items-center gap-3">
                  <div className={`text-2xl font-black ${
                    pct >= 80 ? "text-emerald-600" :
                    pct >= 68 ? "text-green-500" :
                    pct >= 58 ? "text-yellow-500" : "text-orange-500"
                  }`}>
                    {pct}%
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {pct >= 80 ? "Excellent fit for your soil & climate conditions." :
                     pct >= 68 ? "Good match. Minor adjustments may improve yield." :
                     pct >= 58 ? "Moderate fit. Consider soil amendments." :
                                 "Lower suitability. Consult your KVK before planting."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
