/**
 * Vercel Serverless Function: GET /api/nearby-places
 *
 * Proxies Google Places API (New) Nearby Search via REST.
 * Runs server-side so the API key doesn't need browser restrictions.
 *
 * Query params:
 *   ?lat=28.6139&lon=77.2090   (required)
 *   ?radius=10000               (meters, default 10000, max 50000)
 *   ?types=hospital,bank,atm    (comma-separated, required)
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { lat, lon, radius = "10000", types } = req.query;

  if (!lat || !lon || !types) {
    return res.status(400).json({ error: "Missing lat, lon, or types" });
  }

  const apiKey = process.env.GOOGLE_MAPS_KEY || process.env.VITE_GOOGLE_MAPS_KEY || "";
  if (!apiKey) {
    return res.status(500).json({ error: "Google Maps key not configured. Set GOOGLE_MAPS_KEY in Vercel env." });
  }

  const includedTypes = types.split(",").map((t) => t.trim()).filter(Boolean);
  const radiusMeters = Math.min(Number(radius) || 10000, 50000);

  let v1Error = null;
  let legacyError = null;

  // Try the new Places API (v1) REST endpoint first
  try {
    const result = await searchNewAPI(apiKey, lat, lon, radiusMeters, includedTypes);
    if (result.length > 0) {
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      return res.status(200).json({ places: result, source: "places_v1" });
    }
  } catch (err) {
    v1Error = err.message;
  }

  // Fallback: legacy Places API (nearbySearch via HTTP)
  try {
    const result = await searchLegacyAPI(apiKey, lat, lon, radiusMeters, includedTypes);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ places: result, source: "places_legacy" });
  } catch (err) {
    legacyError = err.message;
    return res.status(502).json({
      error: "Both Places APIs failed",
      v1Error,
      legacyError,
      keyPresent: !!apiKey,
      keyPrefix: apiKey.substring(0, 8) + "...",
    });
  }
}

// ─── New Places API v1 (REST) ───────────────────────────────────

async function searchNewAPI(apiKey, lat, lon, radiusMeters, includedTypes) {
  const body = {
    includedTypes,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: Number(lat), longitude: Number(lon) },
        radius: radiusMeters,
      },
    },
  };

  const resp = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.formattedAddress,places.rating,places.types",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`v1 API ${resp.status}: ${errBody.substring(0, 200)}`);
  }

  const data = await resp.json();
  if (!data.places?.length) return [];

  return data.places.map((p) => {
    const plat = p.location?.latitude ?? 0;
    const plon = p.location?.longitude ?? 0;
    const pTypes = p.types || [];
    const type = includedTypes.find((t) => pTypes.includes(t)) || includedTypes[0];
    return {
      id: p.id || `g_${plat}_${plon}`,
      name: p.displayName?.text || "Unknown",
      lat: plat,
      lon: plon,
      type,
      address: p.formattedAddress || "",
      rating: p.rating || null,
      tags: {},
      distKm: haversine(Number(lat), Number(lon), plat, plon),
      source: "google",
    };
  }).sort((a, b) => a.distKm - b.distKm);
}

// ─── Legacy Places API (HTTP) ───────────────────────────────────

async function searchLegacyAPI(apiKey, lat, lon, radiusMeters, includedTypes) {
  const results = await Promise.allSettled(
    includedTypes.map((type) => searchLegacySingle(apiKey, lat, lon, radiusMeters, type))
  );

  const merged = [];
  const seen = new Set();
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const p of r.value) {
        if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
      }
    }
  }
  return merged.sort((a, b) => a.distKm - b.distKm);
}

async function searchLegacySingle(apiKey, lat, lon, radiusMeters, type) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radiusMeters}&type=${type}&key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Legacy API ${resp.status}`);

  const data = await resp.json();
  if (data.status !== "OK") {
    throw new Error(`Legacy status: ${data.status} — ${data.error_message || "no detail"}`);
  }
  if (!data.results?.length) return [];

  return data.results.map((p) => {
    const plat = p.geometry?.location?.lat ?? 0;
    const plon = p.geometry?.location?.lng ?? 0;
    return {
      id: p.place_id || `g_${plat}_${plon}`,
      name: p.name || "Unknown",
      lat: plat,
      lon: plon,
      type,
      address: p.vicinity || "",
      rating: p.rating || null,
      tags: {},
      distKm: haversine(Number(lat), Number(lon), plat, plon),
      source: "google",
    };
  });
}

// ─── Util ───────────────────────────────────────────────────────

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
