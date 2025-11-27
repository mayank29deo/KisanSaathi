import { useEffect, useState } from "react";
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

  // --- LOGIC (UNTOUCHED) ---
  async function getWeather() {
    try {
      setWerror(null);
      setWloading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const data = await fetchWeather(
              pos.coords.latitude,
              pos.coords.longitude
            );
            setLive(data);
          } catch {
            setWerror("weather");
          } finally {
            setWloading(false);
          }
        },
        () => {
          setWerror("geo");
          setWloading(false);
        }
      );
    } catch {
      setWerror("unknown");
      setWloading(false);
    }
  }

  async function getNearbyHealth() {
    setHError(null);
    setHLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude,
            lon = pos.coords.longitude;
          setHLatlon({ lat, lon, label: "GPS" });
          const elems = await fetchOSMHealth(lat, lon, hRadius);
          let items = (elems || [])
            .map((e) => ({
              id: `${e.type}/${e.id}`,
              name: e.tags?.name || "Unnamed",
              lat: e.lat,
              lon: e.lon,
              tags: e.tags || {},
            }))
            .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon))
            .map((x) => ({
              ...x,
              distKm: haversineKm(lat, lon, x.lat, x.lon),
              type: deriveType(x.tags),
            }));
          items.sort((a, b) => (a.distKm || 0) - (b.distKm || 0));
          setHMarkers(items.slice(0, 20));
        } catch (e) {
          setHError("health");
        } finally {
          setHLoading(false);
        }
      },
      () => {
        setHError("geo");
        setHLoading(false);
      }
    );
  }

  const current = live?.current_weather;

  function getWeatherIcon(code) {
    if (!code) return "☀️";
    if ([0, 1].includes(code)) return "☀️";
    if ([2, 3].includes(code)) return "🌤️";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 61, 63, 65].includes(code)) return "🌧️";
    if ([71, 73, 75].includes(code)) return "❄️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "☁️";
  }

  // --- UI RENDER (ENHANCED) ---
  return (
    <div className="space-y-6 pb-24">
      {/* Header with improved spacing */}
      <div className="pt-2 px-1">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          {t.home || "Home"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back. Here is your summary.
        </p>
      </div>

      {/* Weather Section - Redesigned as a Gradient Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-green-500 shadow-lg text-white">
        {/* Decorative background circle */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="font-semibold flex items-center gap-2 text-emerald-50 text-sm uppercase tracking-wider bg-black/10 px-3 py-1 rounded-full">
              <span>{t.weatherToday || "Today"}</span>
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
            </div>
          </div>

          {!current ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="text-5xl filter drop-shadow-md">☀️</div>
                <div>
                  <div className="text-4xl font-bold">{mockWeather.temp}°</div>
                  <div className="text-emerald-100 font-medium">{mockWeather.summary}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm text-emerald-50 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                <div>☔ Rain: {mockWeather.rainChance}%</div>
                <div>💨 Wind: {mockWeather.wind} km/h</div>
              </div>

              {werror && (
                <div className="text-xs text-red-200 bg-red-900/20 p-2 rounded">
                  {t.weatherUnavailable || "Weather unavailable"}
                </div>
              )}
              
              <button 
                onClick={getWeather}
                className="w-full mt-2 bg-white text-emerald-700 font-bold py-3 rounded-xl shadow-sm active:scale-95 transition-transform"
              >
                 {wloading ? "Updating..." : t.useMyLocation || "Use my location"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                 <div className="text-6xl mb-2 filter drop-shadow-md">
                   {getWeatherIcon(current.weathercode)}
                 </div>
                 <div className="text-sm text-emerald-100 opacity-90">
                   Code: {current.weathercode || "Sunny"}
                 </div>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold">{current.temperature}°</div>
                <div className="text-emerald-100 mt-1">
                   Wind {current.windspeed} km/h
                </div>
              </div>
              {/* Decorative line */}
              <div className="col-span-2 mt-2 h-1 bg-gradient-to-r from-emerald-400 to-transparent rounded-full opacity-50" />
            </div>
          )}
        </div>
      </div>

      {/* Services Grid Title */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 px-1">Quick Actions</h2>
        
        <div className="space-y-4">
          {/* Mandi Card - Full Width Highlight */}
          <div 
            onClick={() => setTab("mandi")}
            className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-2xl">
                📈
              </div>
              <div>
                <div className="font-bold text-gray-900 text-lg">{t.mandi || "Mandi Prices"}</div>
                <div className="text-sm text-gray-500">Check live market rates</div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
               →
            </div>
          </div>

          {/* 2x2 Grid for other services */}
          <div className="grid grid-cols-2 gap-3">
            {/* Finance */}
            <ServiceCard 
              icon="🏦" 
              color="bg-blue-100" 
              title={t.finance || "Finance"}
              desc={t.banksNear || "Loans & Banks"}
              onClick={() => setTab("finance")}
            />
            
            {/* Advisory */}
            <ServiceCard 
              icon="🌱" 
              color="bg-emerald-100" 
              title={t.advisory || "Advisory"}
              desc="Expert Tips"
              onClick={() => setTab("advisory")}
            />

            {/* Health */}
            <ServiceCard 
              icon="🏥" 
              color="bg-rose-100" 
              title={t.health || "Health"}
              desc="Hospitals"
              onClick={() => setTab("health")}
            />

            {/* Detect */}
            <ServiceCard 
              icon="📸" 
              color="bg-purple-100" 
              title={t.detect || "Detect"}
              desc="Scan Crops"
              onClick={() => setTab("detect")}
            />
          </div>
        </div>
      </div>

      {/* Health Map Section */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 px-1 mt-6">{t.nearbyHealthMap || "Local Map"}</h2>
        <Card className="overflow-hidden border border-gray-200 shadow-md rounded-2xl p-0">
          <div className="flex items-center justify-between p-4 bg-gray-50/50 border-b border-gray-100">
            <div className="font-semibold flex items-center gap-2 text-gray-700">
              <span>🏥 Health Centres</span>
            </div>
            <button 
                onClick={getNearbyHealth} 
                className="text-sm font-bold text-emerald-600 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 transition"
            >
              {hLoading ? "…" : t.exploreMap || "Update"}
            </button>
          </div>

          {hError && (
            <div className="text-xs text-rose-600 bg-rose-50 p-2 text-center">
              {hError === "geo" ? "Location denied." : "Could not fetch map data."}
            </div>
          )}

          {hLatlon ? (
            <div className="w-full h-56">
                <MapPreview center={hLatlon} markers={hMarkers} radiusKm={hRadius} />
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-100/50">
               <div className="text-3xl mb-2 opacity-50">🗺️</div>
               <div className="text-sm">Tap "Update" to view map</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// Helper component for cleaner Grid code
function ServiceCard({ icon, color, title, desc, onClick }) {
    return (
        <button 
            onClick={onClick}
            className="flex flex-col items-start p-4 bg-white rounded-2xl border border-gray-200 shadow-sm active:scale-95 transition-all hover:shadow-md text-left h-full"
        >
            <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-xl mb-3`}>
                {icon}
            </div>
            <div className="font-bold text-gray-900">{title}</div>
            <div className="text-xs text-gray-500 mt-1">{desc}</div>
        </button>
    )
}
