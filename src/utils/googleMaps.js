/**
 * Google Maps + Places API loader and search utilities.
 * Tries the NEW Place.searchNearby() first, then falls back
 * to the legacy PlacesService.nearbySearch() if it 403s.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

let loadPromise = null;
let _dummyMap = null; // lazy-created for legacy PlacesService

/** Load Google Maps JS API (once) */
export function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!API_KEY) return Promise.reject(new Error("No Google Maps key"));
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => { loadPromise = null; reject(new Error("Google Maps failed to load")); };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Check if Google Maps key is configured */
export function isGoogleMapsAvailable() {
  return !!API_KEY;
}

/** Get or create a hidden map div for legacy PlacesService */
function getDummyMap(maps) {
  if (_dummyMap) return _dummyMap;
  const div = document.createElement("div");
  div.style.display = "none";
  document.body.appendChild(div);
  _dummyMap = new maps.Map(div, { center: { lat: 0, lng: 0 }, zoom: 1 });
  return _dummyMap;
}

// ─── NEW Places API (Place.searchNearby) ────────────────────────

async function searchNewAPI(maps, center, radiusMeters, includedTypes) {
  const { Place } = maps.places;
  if (!Place?.searchNearby) throw new Error("New API unavailable");

  const { places } = await Place.searchNearby({
    fields: ["displayName", "location", "formattedAddress", "rating", "types", "id"],
    locationRestriction: {
      center: { lat: center.lat, lng: center.lon },
      radius: Math.min(radiusMeters, 50000),
    },
    includedPrimaryTypes: includedTypes,
    maxResultCount: 20,
  });

  if (!places?.length) return [];

  return places.map((p) => {
    const lat = p.location?.lat() ?? 0;
    const lon = p.location?.lng() ?? 0;
    const pTypes = p.types || [];
    const type = includedTypes.find((t) => pTypes.includes(t)) || includedTypes[0];
    return {
      id: p.id || `g_${lat}_${lon}`,
      name: p.displayName || "Unknown",
      lat, lon, type,
      address: p.formattedAddress || "",
      rating: p.rating || null,
      tags: {},
      distKm: haversine(center.lat, center.lon, lat, lon),
      source: "google",
    };
  }).sort((a, b) => a.distKm - b.distKm);
}

// ─── LEGACY Places API (PlacesService.nearbySearch) ─────────────

/** Map our type names to legacy PlacesService type names */
const LEGACY_TYPE_MAP = {
  hospital: "hospital",
  doctor: "doctor",
  pharmacy: "pharmacy",
  bank: "bank",
  atm: "atm",
};

function searchLegacySingle(service, center, radiusMeters, type) {
  return new Promise((resolve, reject) => {
    const legacyType = LEGACY_TYPE_MAP[type] || type;
    service.nearbySearch(
      {
        location: { lat: center.lat, lng: center.lon },
        radius: Math.min(radiusMeters, 50000),
        type: legacyType,
      },
      (results, status) => {
        if (status === "OK" && results?.length) {
          resolve(
            results.map((p) => {
              const lat = p.geometry?.location?.lat() ?? 0;
              const lon = p.geometry?.location?.lng() ?? 0;
              return {
                id: p.place_id || `g_${lat}_${lon}`,
                name: p.name || "Unknown",
                lat, lon,
                type,
                address: p.vicinity || "",
                rating: p.rating || null,
                tags: {},
                distKm: haversine(center.lat, center.lon, lat, lon),
                source: "google",
              };
            })
          );
        } else if (status === "ZERO_RESULTS") {
          resolve([]);
        } else {
          reject(new Error(`PlacesService: ${status}`));
        }
      }
    );
  });
}

async function searchLegacyAPI(maps, center, radiusMeters, types) {
  const map = getDummyMap(maps);
  const service = new maps.places.PlacesService(map);

  const results = await Promise.allSettled(
    types.map((t) => searchLegacySingle(service, center, radiusMeters, t))
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

// ─── Public API ─────────────────────────────────────────────────

/**
 * Search nearby places — tries new API, falls back to legacy PlacesService.
 */
export async function searchNearbyPlaces(center, radiusMeters, includedTypes) {
  const maps = await loadGoogleMaps();

  // Try new API first
  try {
    return await searchNewAPI(maps, center, radiusMeters, includedTypes);
  } catch {
    // Fall through to legacy
  }

  // Fallback: legacy PlacesService
  return await searchLegacyAPI(maps, center, radiusMeters, includedTypes);
}

/**
 * Search multiple place types and merge results.
 */
export async function searchMultipleTypes(_, center, radiusMeters, types) {
  try {
    return await searchNearbyPlaces(center, radiusMeters, types);
  } catch {
    // If combined call fails, try types individually
    const results = await Promise.allSettled(
      types.map((t) => searchNearbyPlaces(center, radiusMeters, [t]))
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
}

/** Haversine distance in km */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
