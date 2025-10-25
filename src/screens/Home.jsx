import { useEffect, useRef, useState } from "react";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { fetchWeather } from "../utils/weather";
import MapPreview from "../components/MapPreview";
import { fetchOSMHealth, haversineKm, deriveType } from "../utils/osm";

const mockWeather = { temp: 32, summary: "Sunny", wind: 9, rainChance: 10 };

export default function Home({ t, setTab }) {
  const [live, setLive] = useState(null);
  const [wloading, setWloading] = useState(false);
  const [werror, setWerror] = useState(null);

  const [hLatlon, setHLatlon] = useState(null);
  const [hMarkers, setHMarkers] = useState([]);
  const [hLoading, setHLoading] = useState(false);
  const [hError, setHError] = useState(null);
  const hRadius = 7;

  async function getWeather() {
    try {
      setWerror(null); setWloading(true);
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const data = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
          setLive(data);
        } catch { setWerror("weather"); }
        finally { setWloading(false); }
      }, () => { setWerror("geo"); setWloading(false); });
    } catch { setWerror("unknown"); setWloading(false); }
  }

  async function getNearbyHealth() {
    setHError(null); setHLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        setHLatlon({ lat, lon, label: "GPS" });
        const elems = await fetchOSMHealth(lat, lon, hRadius);
        let items = (elems || []).map((e) => ({ id: `${e.type}/${e.id}`, name: e.tags?.name || "Unnamed", lat: e.lat, lon: e.lon, tags: e.tags || {} }))
          .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon))
          .map((x) => ({ ...x, distKm: haversineKm(lat, lon, x.lat, x.lon), type: deriveType(x.tags) }));
        items.sort((a, b) => (a.distKm || 0) - (b.distKm || 0));
        setHMarkers(items.slice(0, 20));
      } catch (e) { setHError("health"); }
      finally { setHLoading(false); }
    }, () => { setHError("geo"); setHLoading(false); });
  }

  const current = live?.current_weather;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t.home || "Home"}</h1>

      <Card className="overflow-hidden">
        <div className="font-semibold mb-2 flex items-center gap-2">
          <span>{t.weatherToday || "Today's Weather"}</span>
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        {!current ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm">{`${mockWeather.temp}°C, ${mockWeather.summary}`}</div>
              <div className="text-sm opacity-80">{`${mockWeather.rainChance}% rain • Wind ${mockWeather.wind} km/h`}</div>
              {werror && <div className="text-xs text-rose-600 mt-1">{t.weatherUnavailable || "Weather unavailable"}</div>}
            </div>
            <div className="text-right">
              <PrimaryButton onClick={getWeather}>{wloading ? "…" : (t.useMyLocation || "Use my location")}</PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-lg font-semibold">{current.temperature}°C</div>
              <div className="text-sm opacity-80">Wind {current.windspeed} km/h</div>
              <div className="text-xs opacity-70">Code {current.weathercode}</div>
            </div>
            <div className="md:col-span-2 text-emerald-600">
              {/* simple sparkline substitute */}
              <div className="w-full h-8 bg-emerald-100 rounded-md" />
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">{t.nearbyHealthMap || "Nearby Health Map"}</div>
          <PrimaryButton onClick={getNearbyHealth}>{hLoading ? "…" : (t.exploreMap || "Explore map")}</PrimaryButton>
        </div>
        {hError && <div className="text-xs text-rose-600 mb-2">{hError === 'geo' ? 'Location permission denied.' : 'Could not fetch health centres.'}</div>}
        {hLatlon ? (
          <MapPreview center={hLatlon} markers={hMarkers} radiusKm={hRadius} />
        ) : (
          <div className="text-sm text-gray-600">Tap “{t.exploreMap || "Explore map"}” to see hospitals/clinics around you.</div>
        )}
      </Card>

      <Card>
        <div className="font-semibold mb-2">{t.mandi || "Mandi"}</div>
        <div className="text-sm text-gray-600 mb-2">See quick prices then open full page.</div>
        <PrimaryButton onClick={() => setTab("mandi")}>Open Mandi →</PrimaryButton>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <div className="font-semibold mb-2">{t.finance || "Finance"}</div>
          <div className="text-gray-500 text-sm mb-2">{t.banksNear || "Banks near you"}</div>
          <PrimaryButton onClick={() => setTab("finance")}>Open finance tools →</PrimaryButton>
        </Card>
        <Card>
          <div className="font-semibold mb-2">{t.advisory || "Advisory"}</div>
          <div className="text-gray-500 text-sm mb-2">Crop rotation & tips.</div>
          <PrimaryButton onClick={() => setTab("advisory")}>Find rotation support →</PrimaryButton>
        </Card>
        <Card>
          <div className="font-semibold mb-2">{t.health || "Health"}</div>
          <div className="text-gray-500 text-sm mb-2">Locate PHC/CHC, hospitals, clinics and pharmacies.</div>
          <PrimaryButton onClick={() => setTab("health")}>Open health centres →</PrimaryButton>
        </Card>
      </div>

      <Card>
        <div className="font-semibold mb-2">{t.detect || "Detect"}</div>
        <div className="text-gray-500 text-sm mb-2">Use camera or upload a photo to check common issues.</div>
        <PrimaryButton onClick={() => setTab("detect")}>Open detector →</PrimaryButton>
      </Card>
    </div>
  );
}
