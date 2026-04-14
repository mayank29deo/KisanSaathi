/**
 * Google Maps + Places API loader and search utilities.
 * Loads Maps JavaScript API with Places library.
 * Falls back gracefully — callers should catch errors.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

let loadPromise = null;

/** Load Google Maps JS API (once) */
export function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!API_KEY) return Promise.reject(new Error("No Google Maps key"));
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => { loadPromise = null; reject(new Error("Google Maps failed to load")); };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Check if Google Maps is available */
export function isGoogleMapsAvailable() {
  return !!API_KEY;
}

/**
 * Nearby Places search using Google Places API.
 * @param {google.maps.Map} map — an initialized map instance (needed by PlacesService)
 * @param {{ lat: number, lon: number }} center
 * @param {number} radiusMeters
 * @param {string} type — Google place type: 'hospital', 'pharmacy', 'bank', 'atm', 'doctor', 'health'
 * @returns {Promise<Array>} — normalized results
 */
export function searchNearbyPlaces(map, center, radiusMeters, type) {
  return new Promise((resolve, reject) => {
    const service = new window.google.maps.places.PlacesService(map);
    service.nearbySearch(
      {
        location: { lat: center.lat, lng: center.lon },
        radius: radiusMeters,
        type,
      },
      (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const normalized = results.map((p) => ({
            id:   p.place_id,
            name: p.name,
            lat:  p.geometry.location.lat(),
            lon:  p.geometry.location.lng(),
            type,
            address: p.vicinity || "",
            rating:  p.rating || null,
            open:    p.opening_hours?.isOpen?.() ?? null,
            tags:    {},
            distKm:  haversine(center.lat, center.lon, p.geometry.location.lat(), p.geometry.location.lng()),
            source:  "google",
          }));
          normalized.sort((a, b) => a.distKm - b.distKm);
          resolve(normalized);
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error(`Places API: ${status}`));
        }
      }
    );
  });
}

/**
 * Search multiple place types and merge results.
 */
export async function searchMultipleTypes(map, center, radiusMeters, types) {
  const results = await Promise.allSettled(
    types.map((t) => searchNearbyPlaces(map, center, radiusMeters, t))
  );
  const merged = [];
  const seen = new Set();
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const p of r.value) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          merged.push(p);
        }
      }
    }
  }
  merged.sort((a, b) => a.distKm - b.distKm);
  return merged;
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
