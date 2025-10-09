// generic helpers for OSM geocoding & Overpass queries

export async function geocodePlace(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&countrycodes=in&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("geocode");
  const arr = await res.json();
  if (!arr || !arr[0]) throw new Error("no_results");
  return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon), display: arr[0].display_name };
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; const dLat = ((lat2 - lat1) * Math.PI) / 180; const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function deriveType(tags = {}) {
  const a = (tags.amenity || "").toLowerCase();
  const h = (tags.healthcare || "").toLowerCase();
  if (a.includes("hospital") || h.includes("hospital")) return "hospital";
  if (a.includes("clinic") || h.includes("clinic")) return "clinic";
  if (a.includes("pharmacy") || h.includes("pharmacy")) return "pharmacy";
  if (a.includes("doctors") || h.includes("doctor")) return "doctors";
  if (a.includes("atm")) return "atm";
  if (a.includes("bank")) return "bank";
  return undefined;
}

export function matchGovernment(tags = {}) {
  const name = (tags.name || "").toLowerCase();
  const ownership = String(tags.ownership || "").toLowerCase();
  const optype = String(tags["operator:type"] || "").toLowerCase();
  return ownership === "government" || optype === "government" || /\b(phc|chc|primary health centre|community health centre|govt|government)\b/.test(name);
}

async function overpass(query) {
  const endpoints = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
  ];
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep, { method: "POST", body: query });
      if (!r.ok) continue;
      const j = await r.json();
      return j.elements || [];
    } catch {}
  }
  throw new Error("overpass");
}

export async function fetchOSMHealth(lat, lon, radiusKm) {
  const m = Math.min(Math.max(radiusKm, 1), 50) * 1000;
  const query = `[out:json][timeout:25];
   ( node["amenity"~"hospital|clinic|doctors|pharmacy"](around:${m},${lat},${lon});
     node["healthcare"](around:${m},${lat},${lon}); );
   out;`;
  return overpass(query);
}

export async function fetchOSMBanks(lat, lon, radiusKm) {
  const m = Math.min(Math.max(radiusKm, 1), 50) * 1000;
  const query = `[out:json][timeout:25];
   ( node["amenity"~"bank|atm"](around:${m},${lat},${lon}); );
   out;`;
  return overpass(query);
}

// small cache for offline fallback
export function saveCache(key, payload) {
  try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), ...payload })); } catch {}
}
export function loadCache(key, maxAgeDays = 7) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const j = JSON.parse(raw);
    const age = (Date.now() - (j.t || 0)) / (1000*60*60*24);
    if (age > maxAgeDays) return null;
    return j;
  } catch { return null; }
}
