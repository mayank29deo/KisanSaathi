/**
 * Smart Mandi Price Engine
 *
 * Base prices sourced from Agmarknet historical averages (₹ per quintal).
 * Daily variation via date-hash to simulate real market fluctuations.
 * Seasonal multipliers for Kharif/Rabi harvest periods.
 *
 * Each commodity has multiple market entries across states with
 * region-specific price differences.
 */

// ── Commodity base data ───────────────────────────────────────────
// { id, name, name_hi, name_bn, unit, base: ₹/quintal modal price,
//   spread: ±% variation between min/max, seasonal: {month: multiplier} }
const COMMODITIES = [
  { id: "wheat",      name: "Wheat",           name_hi: "गेहूं",        name_bn: "গম",         base: 2275, spread: 0.12, season: { 3: 0.92, 4: 0.90, 5: 0.93, 11: 1.06, 12: 1.05 } },
  { id: "rice",       name: "Rice (Paddy)",    name_hi: "धान",          name_bn: "ধান",         base: 2200, spread: 0.10, season: { 10: 0.88, 11: 0.90, 12: 0.92, 5: 1.08, 6: 1.10 } },
  { id: "maize",      name: "Maize",           name_hi: "मक्का",       name_bn: "ভুট্টা",       base: 1975, spread: 0.14, season: { 9: 0.90, 10: 0.92, 3: 1.06 } },
  { id: "cotton",     name: "Cotton",          name_hi: "कपास",        name_bn: "তুলা",        base: 6500, spread: 0.10, season: { 11: 0.92, 12: 0.94, 4: 1.05, 5: 1.08 } },
  { id: "sugarcane",  name: "Sugarcane",       name_hi: "गन्ना",       name_bn: "আখ",          base: 355,  spread: 0.06, season: { 1: 0.96, 2: 0.97, 10: 1.04 } },
  { id: "soybean",    name: "Soybean",         name_hi: "सोयाबीन",     name_bn: "সয়াবিন",      base: 4850, spread: 0.12, season: { 10: 0.88, 11: 0.90, 4: 1.06, 5: 1.08 } },
  { id: "mustard",    name: "Mustard",         name_hi: "सरसों",       name_bn: "সরিষা",       base: 5400, spread: 0.10, season: { 3: 0.90, 4: 0.92, 9: 1.06, 10: 1.08 } },
  { id: "chana",      name: "Chana (Gram)",    name_hi: "चना",          name_bn: "ছোলা",        base: 5500, spread: 0.12, season: { 3: 0.88, 4: 0.90, 9: 1.06 } },
  { id: "tur",        name: "Tur (Arhar)",     name_hi: "अरहर (तूर)",   name_bn: "অড়হর",        base: 6800, spread: 0.10, season: { 12: 0.92, 1: 0.90, 6: 1.08, 7: 1.10 } },
  { id: "moong",      name: "Moong",           name_hi: "मूंग",         name_bn: "মুগ",          base: 7500, spread: 0.10, season: { 9: 0.90, 10: 0.88, 4: 1.06 } },
  { id: "urad",       name: "Urad",            name_hi: "उड़द",         name_bn: "মাষকলাই",     base: 7400, spread: 0.10, season: { 10: 0.90, 11: 0.92, 5: 1.06 } },
  { id: "masoor",     name: "Masoor (Lentil)", name_hi: "मसूर",         name_bn: "মসুর",         base: 6900, spread: 0.10, season: { 3: 0.90, 4: 0.92, 9: 1.06 } },
  { id: "groundnut",  name: "Groundnut",       name_hi: "मूंगफली",      name_bn: "বাদাম",        base: 6200, spread: 0.12, season: { 11: 0.90, 12: 0.92, 5: 1.08 } },
  { id: "barley",     name: "Barley",          name_hi: "जौ",           name_bn: "যব",           base: 1950, spread: 0.12, season: { 3: 0.90, 4: 0.88, 10: 1.06 } },
  { id: "jowar",      name: "Jowar (Sorghum)", name_hi: "ज्वार",        name_bn: "জোয়ার",       base: 3200, spread: 0.12, season: { 10: 0.92, 11: 0.90, 5: 1.06 } },
  { id: "bajra",      name: "Bajra (Millet)",  name_hi: "बाजरा",       name_bn: "বাজরা",        base: 2500, spread: 0.14, season: { 9: 0.88, 10: 0.90, 4: 1.06 } },
  { id: "potato",     name: "Potato",          name_hi: "आलू",          name_bn: "আলু",          base: 1400, spread: 0.20, season: { 2: 0.80, 3: 0.82, 8: 1.15, 9: 1.20 } },
  { id: "onion",      name: "Onion",           name_hi: "प्याज",        name_bn: "পেঁয়াজ",       base: 1800, spread: 0.25, season: { 1: 0.80, 2: 0.78, 9: 1.25, 10: 1.30 } },
  { id: "tomato",     name: "Tomato",          name_hi: "टमाटर",        name_bn: "টমেটো",        base: 1600, spread: 0.30, season: { 12: 0.75, 1: 0.80, 6: 1.30, 7: 1.35 } },
  { id: "banana",     name: "Banana",          name_hi: "केला",         name_bn: "কলা",          base: 1650, spread: 0.12, season: {} },
  { id: "coconut",    name: "Coconut",         name_hi: "नारियल",       name_bn: "নারকেল",       base: 9800, spread: 0.10, season: { 6: 0.94, 7: 0.92, 1: 1.06 } },
  { id: "turmeric",   name: "Turmeric",        name_hi: "हल्दी",        name_bn: "হলুদ",         base: 12500, spread: 0.10, season: { 3: 0.90, 4: 0.88, 9: 1.08 } },
  { id: "chilli",     name: "Chilli (Dry)",    name_hi: "मिर्च (सूखी)", name_bn: "শুকনো মরিচ",   base: 14000, spread: 0.12, season: { 3: 0.92, 4: 0.90, 8: 1.08 } },
  { id: "sunflower",  name: "Sunflower",       name_hi: "सूरजमुखी",     name_bn: "সূর্যমুখী",     base: 6000, spread: 0.10, season: { 3: 0.94, 9: 1.06 } },
  { id: "jute",       name: "Jute",            name_hi: "जूट / पटसन",  name_bn: "পাট",          base: 5200, spread: 0.10, season: { 8: 0.88, 9: 0.90, 3: 1.08 } },
];

// ── Markets per state ──────────────────────────────────────────────
// Each market has a price_factor (relative to base)
const MARKETS = {
  "Punjab":           [{ m: "Ludhiana", f: 1.02 }, { m: "Amritsar", f: 1.00 }, { m: "Bathinda", f: 0.98 }, { m: "Jalandhar", f: 1.01 }],
  "Haryana":          [{ m: "Karnal", f: 1.03 }, { m: "Hisar", f: 1.00 }, { m: "Sirsa", f: 0.97 }, { m: "Rohtak", f: 0.99 }],
  "Uttar Pradesh":    [{ m: "Lucknow", f: 1.01 }, { m: "Agra", f: 0.98 }, { m: "Kanpur", f: 0.99 }, { m: "Meerut", f: 1.02 }, { m: "Varanasi", f: 0.97 }],
  "Madhya Pradesh":   [{ m: "Indore", f: 1.02 }, { m: "Bhopal", f: 1.00 }, { m: "Gwalior", f: 0.97 }, { m: "Jabalpur", f: 0.98 }],
  "Rajasthan":        [{ m: "Jaipur", f: 1.01 }, { m: "Jodhpur", f: 0.97 }, { m: "Kota", f: 1.00 }, { m: "Ajmer", f: 0.98 }],
  "Maharashtra":      [{ m: "Pune", f: 1.03 }, { m: "Nashik", f: 1.01 }, { m: "Nagpur", f: 0.98 }, { m: "Aurangabad", f: 0.97 }, { m: "Kolhapur", f: 1.00 }],
  "Gujarat":          [{ m: "Ahmedabad", f: 1.02 }, { m: "Rajkot", f: 1.00 }, { m: "Surat", f: 1.01 }, { m: "Junagadh", f: 0.97 }],
  "Karnataka":        [{ m: "Bengaluru", f: 1.04 }, { m: "Mysore", f: 1.00 }, { m: "Belgaum", f: 0.97 }, { m: "Dharwad", f: 0.98 }],
  "Tamil Nadu":       [{ m: "Chennai", f: 1.03 }, { m: "Coimbatore", f: 1.01 }, { m: "Madurai", f: 0.98 }, { m: "Salem", f: 0.97 }],
  "Andhra Pradesh":   [{ m: "Guntur", f: 1.02 }, { m: "Kurnool", f: 0.98 }, { m: "Visakhapatnam", f: 1.00 }],
  "Telangana":        [{ m: "Hyderabad", f: 1.03 }, { m: "Warangal", f: 0.98 }, { m: "Nizamabad", f: 0.97 }],
  "West Bengal":      [{ m: "Kolkata", f: 1.04 }, { m: "Burdwan", f: 0.98 }, { m: "Malda", f: 0.96 }],
  "Bihar":            [{ m: "Patna", f: 1.01 }, { m: "Muzaffarpur", f: 0.97 }, { m: "Gaya", f: 0.96 }],
  "Odisha":           [{ m: "Bhubaneswar", f: 1.00 }, { m: "Cuttack", f: 0.98 }, { m: "Sambalpur", f: 0.96 }],
  "Kerala":           [{ m: "Ernakulam", f: 1.05 }, { m: "Thrissur", f: 1.02 }, { m: "Kozhikode", f: 1.00 }],
  "Assam":            [{ m: "Guwahati", f: 1.02 }, { m: "Nagaon", f: 0.97 }],
  "Chhattisgarh":     [{ m: "Raipur", f: 1.00 }, { m: "Bilaspur", f: 0.97 }],
  "Jharkhand":        [{ m: "Ranchi", f: 1.00 }, { m: "Dhanbad", f: 0.97 }],
};

// ── Deterministic daily variation ──────────────────────────────────
// Simple hash of (date + commodity + market) → consistent ±% for the day
function dayHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}

function dailyFactor(commodityId, market, date) {
  const key = `${commodityId}-${market}-${date.toISOString().slice(0, 10)}`;
  const h = Math.abs(dayHash(key));
  // ±3% daily swing
  return 0.97 + (h % 600) / 10000;
}

/**
 * Generate today's mandi prices for all commodities × all markets.
 * @param {Date} [date] — defaults to today
 * @returns {{ commodity, market, state, modal, min, max, change, date }[]}
 */
export function getMandiPrices(date = new Date()) {
  const month = date.getMonth() + 1; // 1-12
  const results = [];

  for (const c of COMMODITIES) {
    const seasonMul = c.season[month] || 1.0;

    for (const [state, markets] of Object.entries(MARKETS)) {
      for (const { m: market, f: priceFactor } of markets) {
        const df = dailyFactor(c.id, market, date);
        const modal = Math.round(c.base * seasonMul * priceFactor * df);
        const halfSpread = Math.round(modal * c.spread * 0.5);
        const min = modal - halfSpread;
        const max = modal + halfSpread;

        // Yesterday's price for change %
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const ydf = dailyFactor(c.id, market, yesterday);
        const yModal = Math.round(c.base * seasonMul * priceFactor * ydf);
        const change = ((modal - yModal) / yModal) * 100;

        results.push({
          commodityId: c.id,
          commodity:   c.name,
          commodity_hi: c.name_hi,
          commodity_bn: c.name_bn,
          market,
          state,
          modal,
          min,
          max,
          change: parseFloat(change.toFixed(1)),
          date: date.toISOString().slice(0, 10),
        });
      }
    }
  }

  return results;
}

/**
 * Get unique states
 */
export function getMandiStates() {
  return Object.keys(MARKETS);
}

/**
 * Get unique commodity list
 */
export function getMandiCommodities() {
  return COMMODITIES.map((c) => ({
    id: c.id, name: c.name, name_hi: c.name_hi, name_bn: c.name_bn,
  }));
}
