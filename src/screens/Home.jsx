import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  HandCoins,
  Brain,
  HeartPulse,
  Scan,
  CloudSun,
  MapPin,
  Loader2,
} from "lucide-react";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import MapPreview from "../components/MapPreview";
import { fetchWeather } from "../utils/weather";
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
        } catch {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-lime-50 p-6 space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-green-800"
      >
        🌾 किसान साथी (Kisan Saathi)
      </motion.h1>

      {/* Weather Section */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-semibold text-green-800">
            <CloudSun className="w-5 h-5 text-emerald-600" />
            <span>{t.weatherToday || "Today's Weather (आज का मौसम)"}</span>
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <PrimaryButton onClick={getWeather}>
            {wloading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </span>
            ) : (
              t.useMyLocation || "Use my location"
            )}
          </PrimaryButton>
        </div>

        {!current ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm">{`${mockWeather.temp}°C, ${mockWeather.summary}`}</div>
              <div className="text-sm opacity-80">{`${mockWeather.rainChance}% rain • Wind ${mockWeather.wind} km/h`}</div>
              {werror && (
                <div className="text-xs text-rose-600 mt-1">
                  {t.weatherUnavailable || "Weather unavailable"}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-lg font-semibold text-green-800">
                {current.temperature}°C
              </div>
              <div className="text-sm opacity-80">
                Wind {current.windspeed} km/h
              </div>
            </div>
            <div className="md:col-span-2 text-emerald-600">
              <div className="w-full h-8 bg-emerald-100 rounded-md" />
            </div>
          </div>
        )}
      </Card>

      {/* Health Map */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-semibold text-green-800">
            <MapPin className="w-5 h-5 text-green-700" />
            <span>{t.nearbyHealthMap || "Nearby Health Map (स्वास्थ्य केंद्र मानचित्र)"}</span>
          </div>
          <PrimaryButton onClick={getNearbyHealth}>
            {hLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </span>
            ) : (
              t.exploreMap || "Explore map"
            )}
          </PrimaryButton>
        </div>

        {hError && (
          <div className="text-xs text-rose-600 mb-2">
            {hError === "geo"
              ? "Location permission denied."
              : "Could not fetch health centres."}
          </div>
        )}
        {hLatlon ? (
          <MapPreview center={hLatlon} markers={hMarkers} radiusKm={hRadius} />
        ) : (
          <div className="text-sm text-gray-600">
            Tap “{t.exploreMap || "Explore map"}” to see hospitals/clinics around you.
          </div>
        )}
      </Card>

      {/* Quick Access Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <motion.div whileHover={{ scale: 1.03 }}>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-green-700" />
              <span className="font-semibold">{t.mandi || "Mandi (मंडी भाव)"}</span>
            </div>
            <div className="text-sm text-gray-600 mb-2">
              See quick prices then open full page.
            </div>
            <PrimaryButton onClick={() => setTab("mandi")}>
              Open Mandi →
            </PrimaryButton>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03 }}>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <HandCoins className="w-5 h-5 text-green-700" />
              <span className="font-semibold">{t.finance || "Finance (वित्त)"}</span>
            </div>
            <div className="text-gray-500 text-sm mb-2">
              {t.banksNear || "Banks & subsidy info"}
            </div>
            <PrimaryButton onClick={() => setTab("finance")}>
              Open finance tools →
            </PrimaryButton>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03 }}>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-green-700" />
              <span className="font-semibold">
                {t.advisory || "Advisory (सलाह)"}
              </span>
            </div>
            <div className="text-gray-500 text-sm mb-2">
              Crop rotation & expert tips.
            </div>
            <PrimaryButton onClick={() => setTab("advisory")}>
              Find rotation support →
            </PrimaryButton>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03 }}>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <HeartPulse className="w-5 h-5 text-green-700" />
              <span className="font-semibold">
                {t.health || "Health (स्वास्थ्य)"}
              </span>
            </div>
            <div className="text-gray-500 text-sm mb-2">
              Locate hospitals, CHCs & KVKs.
            </div>
            <PrimaryButton onClick={() => setTab("health")}>
              Open health centres →
            </PrimaryButton>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03 }}>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Scan className="w-5 h-5 text-green-700" />
              <span className="font-semibold">
                {t.detect || "Detector (फसल पहचान)"}
              </span>
            </div>
            <div className="text-gray-500 text-sm mb-2">
              Use camera or upload a photo to detect issues.
            </div>
            <PrimaryButton onClick={() => setTab("detect")}>
              Open detector →
            </PrimaryButton>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
