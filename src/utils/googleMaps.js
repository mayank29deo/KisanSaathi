/**
 * Google Maps loader + Places search via server-side proxy.
 *
 * The map rendering still uses the client-side Maps JS API,
 * but place searches go through /api/nearby-places to avoid
 * client-side API key restriction issues.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

let loadPromise = null;

/** Load Google Maps JS API for map rendering (once) */
export function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!API_KEY) return Promise.reject(new Error("No Google Maps key"));
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&loading=async`;
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

/**
 * Search nearby places via the server-side proxy (/api/nearby-places).
 * @param {{ lat: number, lon: number }} center
 * @param {number} radiusMeters
 * @param {string[]} includedTypes — e.g. ["hospital", "pharmacy", "bank"]
 * @returns {Promise<Array>}
 */
export async function searchNearbyPlaces(center, radiusMeters, includedTypes) {
  const params = new URLSearchParams({
    lat: center.lat,
    lon: center.lon,
    radius: Math.min(radiusMeters, 50000),
    types: includedTypes.join(","),
  });

  const resp = await fetch(`/api/nearby-places?${params}`);
  if (!resp.ok) throw new Error(`Places proxy ${resp.status}`);

  const data = await resp.json();
  return data.places || [];
}

/**
 * Search multiple place types and merge results.
 */
export async function searchMultipleTypes(_, center, radiusMeters, types) {
  return searchNearbyPlaces(center, radiusMeters, types);
}

/** Haversine distance in km */
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
