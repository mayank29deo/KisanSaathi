import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, isGoogleMapsAvailable } from "../utils/googleMaps";
import MapPreview from "./MapPreview"; // Leaflet fallback

/**
 * Google Maps component with automatic Leaflet fallback.
 * Same API as MapPreview: { center, markers, radiusKm }
 * If Google Maps key is missing or fails to load → falls back to Leaflet.
 */
export default function GoogleMapPreview({ center, markers = [], radiusKm = 0, className = "" }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const circleRef = useRef(null);
  const [fallback, setFallback] = useState(!isGoogleMapsAvailable());

  // Expose map instance for Places API usage
  const getMap = () => mapRef.current;

  useEffect(() => {
    if (fallback || !center) return;
    let mounted = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!mounted || !divRef.current) return;

        // Init map once
        if (!mapRef.current) {
          mapRef.current = new maps.Map(divRef.current, {
            center: { lat: center.lat, lng: center.lon },
            zoom: 13,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            styles: [
              { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
            ],
          });
        }

        const map = mapRef.current;
        map.setCenter({ lat: center.lat, lng: center.lon });
        map.setZoom(13);

        // Clear old markers
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
        if (circleRef.current) { circleRef.current.setMap(null); circleRef.current = null; }

        // Add markers
        const infoWindow = new maps.InfoWindow();
        markers.forEach((mk) => {
          const marker = new maps.Marker({
            position: { lat: mk.lat, lng: mk.lon },
            map,
            title: mk.name || "Place",
            icon: getMarkerIcon(maps, mk.type),
          });

          marker.addListener("click", () => {
            infoWindow.setContent(
              `<div style="font-family:sans-serif;max-width:200px">
                <b>${(mk.name || "Place").replace(/</g, "&lt;")}</b>
                ${mk.type ? `<br/><span style="color:#666;font-size:12px">${mk.type}</span>` : ""}
                ${mk.distKm ? `<br/><span style="color:#888;font-size:11px">${mk.distKm.toFixed(1)} km away</span>` : ""}
                ${mk.address ? `<br/><span style="color:#888;font-size:11px">${mk.address}</span>` : ""}
                ${mk.rating ? `<br/><span style="color:#f59e0b;font-size:11px">★ ${mk.rating}</span>` : ""}
              </div>`
            );
            infoWindow.open(map, marker);
          });

          markersRef.current.push(marker);
        });

        // Radius circle
        if (radiusKm > 0) {
          circleRef.current = new maps.Circle({
            center: { lat: center.lat, lng: center.lon },
            radius: radiusKm * 1000,
            map,
            strokeColor: "#10b981",
            strokeOpacity: 0.6,
            strokeWeight: 2,
            fillColor: "#10b981",
            fillOpacity: 0.05,
          });
        }

        // Fit bounds to show all markers
        if (markers.length > 0) {
          const bounds = new maps.LatLngBounds();
          bounds.extend({ lat: center.lat, lng: center.lon });
          markers.forEach((mk) => bounds.extend({ lat: mk.lat, lng: mk.lon }));
          map.fitBounds(bounds, { padding: 40 });
        }
      })
      .catch(() => {
        if (mounted) setFallback(true);
      });

    return () => { mounted = false; };
  }, [center?.lat, center?.lon, radiusKm, JSON.stringify(markers.map((m) => [m.lat, m.lon, m.type]))]);

  // Fallback to Leaflet
  if (fallback) {
    return <MapPreview center={center} markers={markers} radiusKm={radiusKm} className={className} />;
  }

  return <div ref={divRef} className={`w-full h-72 rounded-xl border ${className}`} />;
}

// Expose a way to get the raw map for Places API
GoogleMapPreview.getMapInstance = null; // set by parent if needed

function getMarkerIcon(maps, type) {
  const colors = {
    hospital: "#ef4444",
    clinic:   "#f59e0b",
    pharmacy: "#3b82f6",
    doctors:  "#8b5cf6",
    bank:     "#10b981",
    atm:      "#06b6d4",
    health:   "#ef4444",
    doctor:   "#8b5cf6",
  };
  const color = colors[type] || "#6b7280";
  return {
    path: maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 0.9,
    strokeColor: "#fff",
    strokeWeight: 2,
    scale: 8,
  };
}
