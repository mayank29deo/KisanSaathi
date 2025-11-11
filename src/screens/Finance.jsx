import { useState } from "react";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import MapPreview from "../components/MapPreview";
import { geocodePlace, fetchOSMBanks, haversineKm } from "../utils/osm";

export default function Finance({ t }) {
  const [place, setPlace] = useState("");
  const [radius, setRadius] = useState(10);
  const [latlon, setLatlon] = useState(null);
  const [types, setTypes] = useState({ bank: true, atm: true });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function useGeo() {
    setError(null);
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLatlon({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: "GPS",
        });
        setLoading(false);
      },
      () => {
        setError("geo");
        setLoading(false);
      }
    );
  }

  async function geocode() {
    try {
      setError(null);
      setLoading(true);
      const g = await geocodePlace(place);
      setLatlon({ lat: g.lat, lon: g.lon, label: g.display });
    } catch {
      setError("geocode");
    } finally {
      setLoading(false);
    }
  }

  async function search() {
    if (!latlon) {
      setError("noloc");
      return;
    }
    try {
      setError(null);
      setLoading(true);
      setResults([]);
      const elems = await fetchOSMBanks(latlon.lat, latlon.lon, radius);
      let items = (elems || [])
        .map((e) => ({
          id: `${e.type}/${e.id}`,
          name:
            e.tags?.name ||
            e.tags?.amenity?.toUpperCase() ||
            "Bank/ATM",
          lat: e.lat,
          lon: e.lon,
          tags: e.tags || {},
        }))
        .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon))
        .map((x) => ({
          ...x,
          distKm: haversineKm(latlon.lat, latlon.lon, x.lat, x.lon),
          type:
            (x.tags.amenity || "").toLowerCase() === "atm"
              ? "atm"
              : "bank",
        }));
      items = items.filter((x) => types[x.type]);
      items.sort((a, b) => (a.distKm || 0) - (b.distKm || 0));
      setResults(items.slice(0, 50));
    } catch {
      setError("overpass");
    } finally {
      setLoading(false);
    }
  }

  function toggleType(k) {
    setTypes((s) => ({ ...s, [k]: !s[k] }));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">
        {t.finance || "Finance"}
      </h1>

      {/* Search and Filter Section */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <div className="text-sm font-semibold mb-1">
              {t.location || "Location (city or PIN)"}
            </div>
            <input
              className="border rounded-xl px-3 py-2 w-full"
              placeholder="e.g., 110001 or Hisar"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </div>
          <div>
            <div className="text-sm font-semibold mb-1">
              {t.radiusKm || "Radius (km)"}
            </div>
            <input
              type="number"
              min={1}
              max={50}
              className="border rounded-xl px-3 py-2 w-full"
              value={radius}
              onChange={(e) =>
                setRadius(parseFloat(e.target.value || "10"))
              }
            />
          </div>
          <div className="flex gap-2">
            <PrimaryButton onClick={geocode}>
              {t.search || "Search"}
            </PrimaryButton>
            <PrimaryButton onClick={useGeo}>
              {t.useMyLocation || "Use my location"}
            </PrimaryButton>
          </div>
          <div className="text-right">
            <PrimaryButton onClick={search}>
              {t.findBanks || "Find banks"}
            </PrimaryButton>
          </div>
        </div>

        {latlon && (
          <div className="text-xs text-gray-600 mt-2">
            📍 {latlon.label ||
              `${latlon.lat.toFixed(4)}, ${latlon.lon.toFixed(4)}`}
          </div>
        )}
        {error && (
          <div className="text-xs text-rose-600 mt-2">
            {error === "geo"
              ? "Location permission denied."
              : error === "geocode"
              ? "Could not find that place."
              : error === "overpass"
              ? "Bank/ATM data currently unavailable."
              : "Please set a location first."}
          </div>
        )}
      </Card>

      {/* Map Section */}
      {latlon && (
        <Card>
          <div className="font-semibold mb-2">Map</div>
          <MapPreview center={latlon} markers={results} radiusKm={radius} />
        </Card>
      )}

      {/* Bank/ATM Type Filters */}
      <Card>
        <div className="text-sm font-semibold mb-2">Types</div>
        <div className="flex flex-wrap gap-2 items-center">
          {["bank", "atm"].map((k) => (
            <label
              key={k}
              className={`px-3 py-1.5 rounded-xl border cursor-pointer ${
                types[k] ? "bg-emerald-50 text-emerald-700" : ""
              }`}
            >
              <input
                type="checkbox"
                className="mr-2"
                checked={!!types[k]}
                onChange={() => toggleType(k)}
              />
              {k.toUpperCase()}
            </label>
          ))}
        </div>
      </Card>

      {/* Banks & ATMs Result List */}
      <Card>
        <div className="font-semibold mb-2">Banks & ATMs near you</div>
        {loading && <div className="text-sm text-gray-600">Loading…</div>}
        {!loading && results.length === 0 && (
          <div className="text-sm text-gray-600">
            {t.noneFound || "No centres found in this area."}
          </div>
        )}
        <div className="space-y-3">
          {results.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between border-b last:border-none border-gray-100 py-2"
            >
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-sm">{p.name}</div>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                      p.type === "atm"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {p.type.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {p.tags?.addr_full ||
                    p.tags?.["addr:full"] ||
                    p.tags?.["addr:street"] ||
                    ""}
                </div>
                {p.tags?.opening_hours && (
                  <div className="text-xs text-gray-600 mt-0.5">
                    Hours: {p.tags.opening_hours}
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-1">
                {(p.tags?.phone || p.tags?.["contact:phone"]) && (
                  <a
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100"
                    href={`tel:${p.tags["contact:phone"] || p.tags.phone}`}
                  >
                    Call
                  </a>
                )}
                <a
                  className="px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    p.name
                  )}&query=${p.lat},${p.lon}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions
                </a>
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                  {(p.distKm || 0).toFixed(1)} km
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 🌿 Government Schemes Poster Section */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-2xl shadow-md p-6 space-y-6">
        <div className="text-xl font-extrabold text-green-900 text-center mb-3">
          Government Schemes & Subsidies (सरकारी योजनाएँ)
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              title: "प्रधानमंत्री किसान सम्मान निधि (PM-KISAN)",
              desc: "₹6,000 annual income support credited directly to eligible farmer accounts.",
              link: "https://pmkisan.gov.in",
              logo: "https://upload.wikimedia.org/wikipedia/en/8/8f/PM-Kisan_logo.png",
            },
            {
              title: "किसान क्रेडिट कार्ड (Kisan Credit Card)",
              desc: "Quick access to credit for seeds, fertilizers & machinery at low interest.",
              link: "https://www.mygov.in/kcc",
              logo: "https://upload.wikimedia.org/wikipedia/en/2/2d/Indian_Bank_logo.png",
            },
            {
              title: "प्रधानमंत्री फसल बीमा योजना (PMFBY)",
              desc: "Crop insurance against natural calamities with simple claims & low premiums.",
              link: "https://pmfby.gov.in",
              logo: "https://pmfby.gov.in/images/pmfby_logo.png",
            },
            {
              title: "मृदा स्वास्थ्य कार्ड योजना (Soil Health Card)",
              desc: "Free soil testing & reports for improving productivity & yield quality.",
              link: "https://soilhealth.dac.gov.in",
              logo: "https://soilhealth.dac.gov.in/assets/images/logo.png",
            },
          ].map((scheme) => (
            <div
              key={scheme.title}
              className="bg-white rounded-xl p-4 border border-green-200 shadow-sm hover:shadow-lg transition relative overflow-hidden"
            >
              <img
                src={scheme.logo}
                alt={scheme.title}
                className="absolute opacity-10 right-3 top-3 w-20"
              />
              <div className="text-green-800 font-bold mb-1">
                {scheme.title}
              </div>
              <p className="text-sm text-gray-700 mb-3">{scheme.desc}</p>
              <PrimaryButton
                onClick={() => window.open(scheme.link, "_blank")}
              >
                Learn More →
              </PrimaryButton>
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-700 text-center italic border-t border-green-300 pt-3">
          For latest updates, visit{" "}
          <a
            href="https://agricoop.gov.in"
            target="_blank"
            rel="noreferrer"
            className="text-green-700 underline font-semibold"
          >
            agricoop.gov.in
          </a>{" "}
          | Ministry of Agriculture & Farmers Welfare
        </div>
      </Card>
    </div>
  );
}
