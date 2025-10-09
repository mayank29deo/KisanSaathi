import { useState } from "react";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import MapPreview from "../components/MapPreview";
import { geocodePlace, fetchOSMHealth, matchGovernment, haversineKm, deriveType, saveCache, loadCache } from "../utils/osm";

export default function Health({ t }) {
  const [place, setPlace] = useState("");
  const [radius, setRadius] = useState(10);
  const [types, setTypes] = useState({ hospital: true, clinic: true, pharmacy: false, doctors: false });
  const [govOnly, setGovOnly] = useState(false);
  const [service, setService] = useState({ heatstroke: false, poisoning: false, trauma: false });
  const [latlon, setLatlon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useCacheBanner, setUseCacheBanner] = useState(false);
  const [results, setResults] = useState([]);

  async function useGeo() {
    setError(null); setLoading(true); setUseCacheBanner(false);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      setLatlon({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "GPS" });
      setLoading(false);
    }, () => { setError("geo"); setLoading(false); });
  }

  async function geocode() {
    try { setError(null); setLoading(true); setUseCacheBanner(false); const g = await geocodePlace(place); setLatlon({ lat: g.lat, lon: g.lon, label: g.display }); }
    catch { setError("geocode"); }
    finally { setLoading(false); }
  }

  function matchesServices(x) {
    const { heatstroke, poisoning, trauma } = service;
    const any = heatstroke || poisoning || trauma;
    if (!any) return true;
    const text = `${x.name || ''} ${Object.values(x.tags || {}).join(' ')}`.toLowerCase();
    const hits = [];
    if (heatstroke) hits.push(/\bheat(stroke)?\b|emergency|icu/.test(text));
    if (poisoning) hits.push(/poison|toxicolog/.test(text));
    if (trauma) hits.push(/trauma|burn|casualty|er\b|emergency/.test(text));
    return hits.some(Boolean);
  }

  async function search() {
    if (!latlon) { setError("noloc"); return; }
    try {
      setError(null); setLoading(true); setResults([]); setUseCacheBanner(false);
      const elems = await fetchOSMHealth(latlon.lat, latlon.lon, radius);
      let items = (elems || []).map((e) => ({ id: `${e.type}/${e.id}`, name: e.tags?.name || "Unnamed", lat: e.lat, lon: e.lon, tags: e.tags || {} }))
        .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon))
        .map((x) => ({ ...x, distKm: haversineKm(latlon.lat, latlon.lon, x.lat, x.lon), type: deriveType(x.tags) }));
      items = items.filter((x) => (x.type ? types[x.type] : true));
      if (govOnly) items = items.filter((x) => matchGovernment(x.tags));
      items = items.filter(matchesServices);
      items.sort((a, b) => (a.distKm || 0) - (b.distKm || 0));
      items = items.slice(0, 50);
      setResults(items);
      saveCache("health_cache_last", { lat: latlon.lat, lon: latlon.lon, radius, items });
    } catch {
      const cached = loadCache("health_cache_last");
      if (cached) { setResults(cached.items || []); setUseCacheBanner(true); setError(null); }
      else { setError("overpass"); }
    } finally { setLoading(false); }
  }

  function toggleType(k) { setTypes((s) => ({ ...s, [k]: !s[k] })); }
  function toggleService(k) { setService((s) => ({ ...s, [k]: !s[k] })); }
  function clearFilters() { setTypes({ hospital: true, clinic: true, pharmacy: false, doctors: false }); setGovOnly(false); setService({ heatstroke: false, poisoning: false, trauma: false }); }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">{t.health || "Health"}</h1>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <div className="text-sm font-semibold mb-1">{t.location || "Location (city or PIN)"}</div>
            <input className="border rounded-xl px-3 py-2 w-full" placeholder="e.g., 110001 or Hisar" value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
          <div>
            <div className="text-sm font-semibold mb-1">{t.radiusKm || "Radius (km)"}</div>
            <input type="number" min={1} max={50} className="border rounded-xl px-3 py-2 w-full" value={radius} onChange={(e) => setRadius(parseFloat(e.target.value || "10"))} />
          </div>
          <div className="flex gap-2">
            <PrimaryButton onClick={geocode}>{t.search || "Search"}</PrimaryButton>
            <PrimaryButton onClick={useGeo}>{t.useMyLocation || "Use my location"}</PrimaryButton>
          </div>
          <div className="text-right">
            <PrimaryButton onClick={search}>{t.findCenters || "Find centres"}</PrimaryButton>
          </div>
        </div>
        {latlon && (<div className="text-xs text-gray-600 mt-2">📍 {latlon.label || `${latlon.lat.toFixed(4)}, ${latlon.lon.toFixed(4)}`}</div>)}
        {useCacheBanner && <div className="text-xs text-amber-700 mt-2 bg-amber-50 rounded-lg px-2 py-1 inline-block">{t.cachedBanner || "Showing cached results (offline). May be outdated."}</div>}
        {error && <div className="text-xs text-rose-600 mt-2">
          {error === 'geo' ? 'Location permission denied.' : error === 'geocode' ? 'Could not find that place.' : error === 'overpass' ? 'Health data currently unavailable.' : 'Please set a location first.'}
        </div>}
      </Card>

      {latlon && (
        <Card>
          <div className="font-semibold mb-2">Map</div>
          <MapPreview center={latlon} markers={results} radiusKm={radius} />
        </Card>
      )}

      <Card>
        <div className="text-sm font-semibold mb-2">{t.types || "Types"}</div>
        <div className="flex flex-wrap gap-2 items-center">
          {["hospital","clinic","pharmacy","doctors"].map((k) => (
            <label key={k} className={`px-3 py-1.5 rounded-xl border cursor-pointer ${types[k] ? "bg-emerald-50 text-emerald-700" : ""}`}>
              <input type="checkbox" className="mr-2" checked={!!types[k]} onChange={() => toggleType(k)} />
              {k[0].toUpperCase()+k.slice(1)}
            </label>
          ))}
          <label className={`px-3 py-1.5 rounded-xl border cursor-pointer ${govOnly ? "bg-emerald-50 text-emerald-700" : ""}`}>
            <input type="checkbox" className="mr-2" checked={govOnly} onChange={() => setGovOnly(!govOnly)} />
            {t.govtOnly || "Govt only (PHC/CHC)"}
          </label>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold mb-2">{t.services || "Services"}</div>
        <div className="flex flex-wrap gap-2 items-center">
          {[
            ["heatstroke","Heatstroke"],
            ["poisoning","Poisoning/Toxicology"],
            ["trauma","Trauma/Burns"],
          ].map(([k, label]) => (
            <label key={k} className={`px-3 py-1.5 rounded-xl border cursor-pointer ${service[k] ? "bg-emerald-50 text-emerald-700" : ""}`}>
              <input type="checkbox" className="mr-2" checked={!!service[k]} onChange={() => toggleService(k)} />{label}
            </label>
          ))}
          <button className="px-3 py-1.5 rounded-xl border" onClick={clearFilters}>{t.clearFilters || "Clear filters"}</button>
        </div>
      </Card>

      <Card>
        <div className="font-semibold mb-2">{t.hospitalsNear || "Hospitals & clinics near you"}</div>
        {loading && <div className="text-sm text-gray-600">Loading…</div>}
        {!loading && results.length === 0 && <div className="text-sm text-gray-600">{t.noneFound || "No centres found in this area."}</div>}
        <div className="space-y-3">
          {results.map((p) => (
            <div key={p.id} className="flex items-start justify-between border-b last:border-none border-gray-100 py-2">
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-sm">{p.name}</div>
                  {p.type && <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${p.type === 'hospital' ? 'bg-rose-50 text-rose-700' : p.type === 'clinic' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{p.type}</span>}
                  {matchGovernment(p.tags) && <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700">Govt</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{p.tags?.addr_full || p.tags?.['addr:full'] || p.tags?.['addr:street'] || ''}</div>
                {p.tags?.opening_hours && <div className="text-xs text-gray-600 mt-0.5">Hours: {p.tags.opening_hours}</div>}
              </div>
              <div className="flex gap-2 mt-1">
                {p.tags?.phone && <a className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100" href={`tel:${p.tags.phone}`}>Call</a>}
                <a className="px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query=${p.lat},${p.lon}`} target="_blank" rel="noreferrer">Directions</a>
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700">{(p.distKm || 0).toFixed(1)} km</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-emerald-50/60"><div className="text-xs text-gray-600">⚠️ Data via OpenStreetMap contributors. Call emergency services for urgent care.</div></Card>
    </div>
  );
}
