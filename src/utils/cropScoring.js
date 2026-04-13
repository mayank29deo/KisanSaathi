/**
 * Fuzzy trapezoid suitability scoring for crop recommendation.
 *
 * For each parameter, scores 0→1 using a trapezoidal membership function:
 *   0    at value ≤ min or ≥ max
 *   1    at value inside [lo, hi]
 *   Linear ramp between min→lo and hi→max
 *
 * Final crop score = weighted average across all parameters,
 * then normalised to a human-friendly % band (55 – 93 %).
 */

import CROP_PROFILES from "../data/cropProfiles";

// Parameter weights (must sum to 1)
const WEIGHTS = {
  pH:            0.22,
  rainfall:      0.22,
  min_temp:      0.12,
  max_temp:      0.12,
  N:             0.10,
  P:             0.08,
  K:             0.08,
  soil_moisture: 0.06,
};

/** Trapezoidal membership score [0, 1] */
function trapezoid(value, { min, lo, hi, max }) {
  if (value <= min || value >= max) return 0;
  if (value >= lo && value <= hi) return 1;
  if (value < lo) return (value - min) / (lo - min);
  return (max - value) / (max - hi);
}

/** Weighted suitability score [0, 1] for a single crop */
function rawScore(params, crop) {
  let score = 0;
  for (const [key, w] of Object.entries(WEIGHTS)) {
    const range = crop[key];
    if (!range) continue;
    score += w * trapezoid(params[key], range);
  }
  return score;
}

/**
 * Season compatibility bonus:
 *   perfect match → +0.10 boost
 *   no match      → −0.08 penalty
 */
function seasonBonus(cropSeasons, season) {
  if (!cropSeasons || !season) return 0;
  return cropSeasons.includes(season) ? 0.10 : -0.08;
}

/**
 * Normalise raw scores to a display % range of 55–93.
 * We want the top crop to look impressive but realistic.
 */
function normalise(scores) {
  const vals = scores.map((s) => s.raw);
  const hi   = Math.max(...vals);
  const lo   = Math.min(...vals);
  const span = hi - lo || 1;

  return scores.map((s) => ({
    ...s,
    pct: Math.round(55 + ((s.raw - lo) / span) * 38), // maps [lo,hi] → [55,93]
  }));
}

/**
 * Returns the top N crops ranked by suitability for given soil params + season.
 * MLPick (string, from backend) is always guaranteed a slot and boosted to #1.
 *
 * @param {{ N,P,K,pH,rainfall,soil_moisture,min_temp,max_temp }} params
 * @param {string} season  — "Kharif" | "Rabi" | "Zaid"
 * @param {string|null} mlPick  — crop name returned by the ML backend
 * @param {number} topN  — how many crops to return (default 4)
 * @returns {{ crop, pct, isMLPick, rank }[]}
 */
export function getTopCrops(params, season, mlPick = null, topN = 4) {
  // Score all crops
  const scored = CROP_PROFILES.map((crop) => {
    const raw = Math.min(1, rawScore(params, crop) + seasonBonus(crop.seasons, season));
    return { crop, raw: Math.max(0, raw) };
  });

  // Sort descending
  scored.sort((a, b) => b.raw - a.raw);

  // Find ML pick in the list (case-insensitive partial match)
  let mlIdx = -1;
  if (mlPick) {
    const needle = mlPick.toLowerCase().trim();
    mlIdx = scored.findIndex(
      (s) =>
        s.crop.id.includes(needle) ||
        s.crop.name.toLowerCase().includes(needle) ||
        needle.includes(s.crop.id) ||
        needle.includes(s.crop.name.toLowerCase().split(" ")[0])
    );
  }

  // Build the top-N list, ensuring ML pick is present and ranked #1
  let top = scored.slice(0, topN);

  if (mlIdx !== -1 && mlIdx >= topN) {
    // ML pick was outside top N — inject it at position 0
    top = [scored[mlIdx], ...scored.slice(0, topN - 1)];
  } else if (mlIdx !== -1 && mlIdx > 0) {
    // ML pick is inside top N but not #1 — move it to front
    const [ml] = top.splice(mlIdx, 1);
    top.unshift(ml);
  }

  // Give the ML pick a slight raw boost so it lands at the top pct
  if (mlIdx !== -1) {
    top[0] = { ...top[0], raw: Math.min(1, top[0].raw + 0.12) };
  }

  // Normalise to percentage band and add rank / flag
  return normalise(top).map((s, i) => ({
    crop:      s.crop,
    pct:       s.pct,
    isMLPick:  i === 0 && mlPick !== null,
    rank:      i + 1,
  }));
}
