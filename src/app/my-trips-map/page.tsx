"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";

// Fix per i marker icons di Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface SavedTrip {
  id: string;
  destination_name: string;
  destination_region: string;
  destination_lat: number;
  destination_lng: number;
  created_at: string;
  itinerary_data: any;
}

// Custom pin icon colorato
const createTripIcon = (index: number) => {
  const colors = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
    "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
    "#a855f7", "#d946ef", "#ec4899", "#f43f5e"
  ];
  
  const color = colors[index % colors.length];
  
  return L.divIcon({
    className: "custom-trip-marker",
    html: `
      <div style="
        background: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 16px;
        ">📍</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

function MapCenterUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function MyTripsMapPage() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.9028, 12.4964]); // Italia centro
  const [mapZoom, setMapZoom] = useState(6);

  useEffect(() => {
    async function loadTrips() {
      try {
        const res = await fetch("/api/trips");
        if (res.ok) {
          const data = await res.json();
          setTrips(data);

          // Calcola centro mappa in base ai viaggi
          if (data.length > 0) {
            const validTrips = data.filter((t: SavedTrip) => t.destination_lat && t.destination_lng);
            if (validTrips.length > 0) {
              const lats = validTrips.map((t: SavedTrip) => t.destination_lat);
              const lngs = validTrips.map((t: SavedTrip) => t.destination_lng);
              const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
              const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
              setMapCenter([centerLat, centerLng]);

              // Calcola zoom
              const latDiff = Math.max(...lats) - Math.min(...lats);
              const lngDiff = Math.max(...lngs) - Math.min(...lngs);
              const maxDiff = Math.max(latDiff, lngDiff);

              if (maxDiff < 1) setMapZoom(8);
              else if (maxDiff < 3) setMapZoom(7);
              else if (maxDiff < 6) setMapZoom(6);
              else setMapZoom(5);
            }
          }
        }
      } catch (error) {
        console.error("Errore caricamento viaggi:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadTrips();
  }, []);

  const validTrips = trips.filter(t => t.destination_lat && t.destination_lng);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">🗺️ I Miei Viaggi</h1>
            <p className="text-sm text-white/60">
              {trips.length} {trips.length === 1 ? "viaggio salvato" : "viaggi salvati"}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-all"
          >
            ← Torna alla home
          </Link>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center">
              <p className="text-4xl mb-3 animate-bounce">🗺️</p>
              <p className="text-white/60">Caricamento viaggi...</p>
            </div>
          </div>
        ) : validTrips.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center max-w-md">
              <p className="text-6xl mb-4">🧳</p>
              <p className="text-xl font-bold text-white mb-2">Nessun viaggio salvato</p>
              <p className="text-white/60 mb-6">
                Genera il tuo primo itinerario e salvalo per vederlo sulla mappa!
              </p>
              <Link
                href="/"
                className="inline-block rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-600 transition-all"
              >
                Genera un viaggio
              </Link>
            </div>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            style={{ background: "#0f172a" }}
          >
            <MapCenterUpdater center={mapCenter} zoom={mapZoom} />
            
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {validTrips.map((trip, idx) => (
              <Marker
                key={trip.id}
                position={[trip.destination_lat, trip.destination_lng]}
                icon={createTripIcon(idx)}
              >
                <Popup className="custom-popup">
                  <div className="p-3 min-w-[250px]">
                    <h3 className="font-bold text-lg mb-1">{trip.destination_name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{trip.destination_region}</p>
                    
                    {trip.itinerary_data && (
                      <>
                        <p className="text-sm text-gray-700 italic mb-3">
                          &quot;{trip.itinerary_data.riepilogo}&quot;
                        </p>
                        <p className="text-xs text-gray-600 mb-3">
                          📅 {trip.itinerary_data.giorni?.length || 0} giorni • 
                          Salvato il {new Date(trip.created_at).toLocaleDateString('it-IT')}
                        </p>
                      </>
                    )}
                    
                    <Link
                      href="/"
                      className="inline-block w-full text-center rounded-lg bg-indigo-500 text-white text-sm font-semibold py-2 hover:bg-indigo-600 transition-all"
                    >
                      Visualizza itinerario
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Stats Footer */}
      {!isLoading && validTrips.length > 0 && (
        <div className="p-4 border-t border-white/10 bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex justify-center gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-indigo-400">{validTrips.length}</p>
              <p className="text-xs text-white/50">Destinazioni</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">
                {validTrips.reduce((sum, t) => sum + (t.itinerary_data?.giorni?.length || 0), 0)}
              </p>
              <p className="text-xs text-white/50">Giorni totali</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">
                {new Set(validTrips.map(t => t.destination_region)).size}
              </p>
              <p className="text-xs text-white/50">Regioni visitate</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
