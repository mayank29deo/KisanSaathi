import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStates, getDistricts, getSoilParams } from "../data/soilData";

const API_URL = "https://crop-recommendation-backend-production-d236.up.railway.app";

const SEASONS = ["Kharif", "Rabi", "Zaid"];

// Soil param display config
const PARAM_META = [
  { key: "N",             icon: "🌿", label: "Nitrogen",     unit: "kg/ha", color: "bg-green-50  border-green-200  text-green-800"  },
  { key: "P",             icon: "🔵", label: "Phosphorus",   unit: "kg/ha", color: "bg-blue-50   border-blue-200   text-blue-800"   },
  { key: "K",             icon: "🟠", label: "Potassium",    unit: "kg/ha", color: "bg-orange-50 border-orange-200 text-orange-800" },
  { key: "pH",            icon: "⚗️", label: "Soil pH",      unit: "",      color: "bg-purple-50 border-purple-200 text-purple-800" },
  { key: "rainfall",      icon: "🌧️", label: "Rainfall",     unit: "mm",    color: "bg-sky-50    border-sky-200    text-sky-800"    },
  { key: "soil_moisture", icon: "💧", label: "Soil Moisture", unit: "%",    color: "bg-teal-50   border-teal-200   text-teal-800"   },
  { key: "min_temp",      icon: "🌡️", label: "Min Temp",     unit: "°C",    color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
  { key: "max_temp",      icon: "☀️", label: "Max Temp",     unit: "°C",    color: "bg-red-50    border-red-200    text-red-800"    },
];

const STATES = getStates();

export default function CropRecommendation({ t }) {
  const [state,    setState]    = useState("");
  const [district, setDistrict] = useState("");
  const [season,   setSeason]   = useState("");
  const [params,   setParams]   = useState(null);   // auto-filled soil data
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const districts = state ? getDistricts(state) : [];

  // Auto-fill whenever all three selectors are set
  useEffect(() => {
    if (state && district && season) {
      const data = getSoilParams(state, district, season);
      setParams(data);
      setResult(null);
      setError(null);
    } else {
      setParams(null);
    }
  }, [state, district, season]);

  // Reset district when state changes
  function handleStateChange(s) {
    setState(s);
    setDistrict("");
    setParams(null);
  }

  async function handleSubmit() {
    if (!state || !district || !season || !params) {
      setError(t?.authErrorGeneric || "Please select State, District & Season first.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const payload = {
        state:         state.toLowerCase().trim(),
        season,
        N:             params.N,
        P:             params.P,
        K:             params.K,
        pH:            params.pH,
        rainfall:      params.rainfall,
        soil_moisture: params.soil_moisture,
        min_temp:      params.min_temp,
        max_temp:      params.max_temp,
      };

      const res = await fetch(`${API_URL}/predict`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      setResult(json.recommended_crop);
    } catch (err) {
      setError("Could not get recommendation. Please try again.");
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

      {/* Step 1 – Selectors */}
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
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* District — only shown once state is selected */}
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
                {districts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Season */}
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
                 s === "Rabi"   ? (t?.rabi   || "Rabi")   :
                                  (t?.zaid   || "Zaid")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step 2 – Auto-filled soil data */}
      <AnimatePresence>
        {params && (
          <motion.div
            key="soil-params"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {/* Badge */}
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
                Based on ICAR soil data for <span className="font-semibold text-gray-700">{district}, {state}</span> during <span className="font-semibold text-gray-700">{season}</span> season.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {PARAM_META.map(({ key, icon, label, unit, color }) => (
                  <div
                    key={key}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${color}`}
                  >
                    <span className="text-base">{icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs opacity-70 truncate">{label}</div>
                      <div className="text-sm font-bold">
                        {params[key]}{unit}
                      </div>
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

      {/* Submit Button */}
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
            {t?.predicting || "Getting recommendation…"}
          </span>
        ) : (
          t?.predict || "Recommend Crop"
        )}
      </button>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            key="result"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200 rounded-2xl p-6 text-center shadow-sm"
          >
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">
              {t?.result || "Recommended Crop"}
            </p>
            <p className="text-2xl font-extrabold text-emerald-800 capitalize">{result}</p>
            <p className="text-xs text-gray-500 mt-2">
              for {district}, {state} · {season} season
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
