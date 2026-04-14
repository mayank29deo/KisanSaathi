/**
 * Google Maps + Places API (New) loader and search utilities.
 * Uses the new google.maps.places.Place.searchNearby() API
 * (replaces deprecated PlacesService).
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

/** Check if Google Maps key is configured */
export function isGoogleMapsAvailable() {
  return !!API_KEY;
}

/**
 * Nearby search using the NEW Places API (google.maps.places.Place.searchNearby).
 * @param {{ lat: number, lon: number }} center
 * @param {number} radiusMeters
 * @param {string[]} includedTypes — e.g. ["hospital", "pharmacy", "bank"]
 * @returns {Promise<Array>}
 */
export async function searchNearbyPlaces(center, radiusMeters, includedTypes) {
  const maps = await loadGoogleMaps();
  const { Place } = maps.places;

  if (!Place?.searchNearby) {
    throw new Error("Place.searchNearby not available — ensure Places API (New) is enabled");
  }

  const request = {
    fields: ["displayName", "location", "formattedAddress", "rating", "types", "id"],
    locationRestriction: {
      center: { lat: center.lat, lng: center.lon },
      radius: Math.min(radiusMeters, 50000), // max 50km
    },
    includedPrimaryTypes: includedTypes,
    maxResultCount: 20,
  };

  const { places } = await Place.searchNearby(request);

  if (!places || places.length === 0) return [];

  return places.map((p) => {
    const lat = p.location?.lat() ?? 0;
    const lon = p.location?.lng() ?? 0;
    // Derive type from the first matching included type
    const pTypes = p.types || [];
    const type = includedTypes.find((t) => pTypes.includes(t)) || includedTypes[0];

    return {
      id:      p.id || `g_${lat}_${lon}`,
      name:    p.displayName || "Unknown",
      lat,
      lon,
      type,
      address: p.formattedAddress || "",
      rating:  p.rating || null,
      tags:    {},
      distKm:  haversine(center.lat, center.lon, lat, lon),
      source:  "google",
    };
  }).sort((a, b) => a.distKm - b.distKm);
}

/**
 * Search multiple place types and merge results.
 */
export async function searchMultipleTypes(_, center, radiusMeters, types) {
  // The new API accepts multiple types in one call
  try {
    return await searchNearbyPlaces(center, radiusMeters, types);
  } catch {
    // If single call with multiple types fails, try one by one
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
