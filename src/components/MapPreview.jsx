import { useEffect, useRef } from "react";

let loader;
function ensureLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
      const s = document.createElement("script");
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.async = true;
      s.onload = () => {
        const L = window.L;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        resolve(L);
      };
      s.onerror = () => reject(new Error("leaflet"));
      document.body.appendChild(s);
    });
  }
  return loader;
}

export default function MapPreview({ center, markers = [], radiusKm = 0, className = "" }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    ensureLeaflet().then((L) => {
      if (!mounted || !divRef.current) return;
      if (!mapRef.current) {
        const m = L.map(divRef.current, { zoomControl: true, attributionControl: true });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19, attribution: "&copy; OpenStreetMap contributors",
        }).addTo(m);
        mapRef.current = m;
      }
      const map = mapRef.current;
      map.setView([center.lat, center.lon], 13);
      if (layerRef.current) layerRef.current.remove();
      const grp = L.layerGroup();

      markers.forEach(mk => {
        const marker = L.marker([mk.lat, mk.lon]).bindPopup(
          `<b>${(mk.name || "Place").replace(/</g, "&lt;")}</b><br/>${mk.type || ""}${mk.distKm ? `<br/>${mk.distKm.toFixed(1)} km` : ""}`
        );
        marker.addTo(grp);
      });
      if (radiusKm > 0) {
        L.circle([center.lat, center.lon], { radius: radiusKm*1000, color: "#10b981", fillOpacity: 0.05 }).addTo(grp);
      }
      grp.addTo(map);
      layerRef.current = grp;
    }).catch(()=>{});
    return () => { mounted = false; };
  }, [center?.lat, center?.lon, radiusKm, JSON.stringify(markers.map(m => [m.lat, m.lon]))]);

  return <div ref={divRef} className={`w-full h-72 rounded-xl border ${className}`} />;
}
