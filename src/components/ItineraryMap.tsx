"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FullItinerary, ItineraryActivity } from "@/lib/types";

// Fix per i marker icons di Leaflet in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface ItineraryMapProps {
  itinerary: FullItinerary;
  destinationName: string;
  destinationLat?: number;
  destinationLng?: number;
}

interface ActivityMarker {
  lat: number;
  lng: number;
  activity: ItineraryActivity;
  dayNumber: number;
  activityIndex: number;
}

// Componente per centrare la mappa
function MapCenterUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Cache geocoding in localStorage
const GEOCODE_CACHE_KEY = 'waypoint_geocode_cache';
const CACHE_EXPIRY_DAYS = 30;

function getCachedCoords(location: string, city: string): { lat: number; lng: number } | null {
  try {
    const cache = localStorage.getItem(GEOCODE_CACHE_KEY);
    if (!cache) return null;
    
    const cacheData = JSON.parse(cache);
    const key = `${location}-${city}`.toLowerCase();
    const cached = cacheData[key];
    
    if (cached && cached.timestamp) {
      const age = Date.now() - cached.timestamp;
      const maxAge = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      
      if (age < maxAge) {
        return { lat: cached.lat, lng: cached.lng };
      }
    }
  } catch (error) {
    console.error("Errore lettura cache:", error);
  }
  return null;
}

function setCachedCoords(location: string, city: string, coords: { lat: number; lng: number }) {
  try {
    const cache = localStorage.getItem(GEOCODE_CACHE_KEY);
    const cacheData = cache ? JSON.parse(cache) : {};
    const key = `${location}-${city}`.toLowerCase();
    
    cacheData[key] = {
      lat: coords.lat,
      lng: coords.lng,
      timestamp: Date.now(),
    };
    
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Errore scrittura cache:", error);
  }
}

// Funzione per geocodare un indirizzo/luogo usando Nominatim (gratuito)
async function geocodeLocation(locationName: string, cityName: string): Promise<{ lat: number; lng: number } | null> {
  // Controlla cache prima
  const cached = getCachedCoords(locationName, cityName);
  if (cached) {
    return cached;
  }

  try {
    // Pulisci il nome del luogo per geocoding migliore
    const cleanLocation = locationName
      .replace(/^📍\s*/, '') // Rimuovi emoji
      .replace(/,\s*\d+.*$/, '') // Rimuovi numeri civici che possono confondere
      .trim();
    
    const query = encodeURIComponent(`${cleanLocation}, ${cityName}, Italy`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'WayPointRoulette/1.0' // Required by Nominatim
        }
      }
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      // Salva in cache
      setCachedCoords(locationName, cityName, coords);
      return coords;
    }
    
    // Fallback: prova solo con il nome della città
    if (cleanLocation !== cityName) {
      const fallbackQuery = encodeURIComponent(`${cityName}, Italy`);
      const fallbackResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${fallbackQuery}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'WayPointRoulette/1.0'
          }
        }
      );
      const fallbackData = await fallbackResponse.json();
      
      if (fallbackData && fallbackData.length > 0) {
        // Aggiungi un piccolo offset casuale per non sovrapporre tutti i marker
        const offsetLat = (Math.random() - 0.5) * 0.01;
        const offsetLng = (Math.random() - 0.5) * 0.01;
        const coords = {
          lat: parseFloat(fallbackData[0].lat) + offsetLat,
          lng: parseFloat(fallbackData[0].lon) + offsetLng,
        };
        // Salva in cache
        setCachedCoords(locationName, cityName, coords);
        return coords;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Errore geocoding:", error);
    return null;
  }
}

// Custom icon per attività
const createCustomIcon = (tipo: ItineraryActivity["tipo"], emoji: string) => {
  const colors: Record<string, string> = {
    viaggio: "#3b82f6",
    visita: "#a855f7",
    cibo: "#f59e0b",
    relax: "#10b981",
    avventura: "#ef4444",
    shopping: "#ec4899",
    trasporto: "#0ea5e9",
    "check-in": "#14b8a6",
    "check-out": "#f97316",
    tempo_libero: "#84cc16",
  };

  const color = colors[tipo] || "#6b7280";

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 18px;
        ">${emoji}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

const activityEmojis: Record<ItineraryActivity["tipo"], string> = {
  viaggio: "🚗",
  visita: "🏛️",
  cibo: "🍽️",
  relax: "☕",
  avventura: "🏔️",
  shopping: "🛍️",
  trasporto: "🚆",
  "check-in": "🏨",
  "check-out": "🧳",
  tempo_libero: "🌿",
};

export default function ItineraryMap({
  itinerary,
  destinationName,
  destinationLat,
  destinationLng,
}: ItineraryMapProps) {
  const [markers, setMarkers] = useState<ActivityMarker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [selectedDay, setSelectedDay] = useState<number | "all">("all");
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.9028, 12.4964]); // Roma default
  const [mapZoom, setMapZoom] = useState(6);

  useEffect(() => {
    async function loadMarkers() {
      setIsLoading(true);
      const newMarkers: ActivityMarker[] = [];

      // Se abbiamo coordinate della destinazione, usale come centro
      if (destinationLat && destinationLng) {
        setMapCenter([destinationLat, destinationLng]);
        setMapZoom(12);
      }

      // Raccoglie tutte le attività da geocodare
      const activitiesToGeocode: Array<{
        activity: ItineraryActivity;
        dayNumber: number;
        activityIndex: number;
      }> = [];

      for (const day of itinerary.giorni) {
        for (let i = 0; i < day.attivita.length; i++) {
          const activity = day.attivita[i];
          if (activity.luogo) {
            activitiesToGeocode.push({
              activity,
              dayNumber: day.giorno,
              activityIndex: i,
            });
          }
        }
      }

      // Geocode in parallelo con batch per rispettare rate limits
      const BATCH_SIZE = 5; // Processa 5 alla volta
      const BATCH_DELAY = 1000; // 1 secondo tra batch
      
      setLoadingProgress({ current: 0, total: activitiesToGeocode.length });
      
      for (let i = 0; i < activitiesToGeocode.length; i += BATCH_SIZE) {
        const batch = activitiesToGeocode.slice(i, i + BATCH_SIZE);
        
        // Geocode questo batch in parallelo
        const batchResults = await Promise.all(
          batch.map(async (item) => {
            const coords = await geocodeLocation(item.activity.luogo!, destinationName);
            if (coords) {
              return {
                lat: coords.lat,
                lng: coords.lng,
                activity: item.activity,
                dayNumber: item.dayNumber,
                activityIndex: item.activityIndex,
              };
            }
            return null;
          })
        );

        // Aggiungi i risultati validi
        batchResults.forEach(result => {
          if (result) {
            newMarkers.push(result);
          }
        });

        // Update progressivo della mappa e del progresso
        if (newMarkers.length > 0) {
          setMarkers([...newMarkers]);
          setLoadingProgress({ 
            current: Math.min(i + BATCH_SIZE, activitiesToGeocode.length), 
            total: activitiesToGeocode.length 
          });
        }

        // Delay prima del prossimo batch (tranne l'ultimo)
        if (i + BATCH_SIZE < activitiesToGeocode.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }

      setMarkers(newMarkers);
      
      // Calcola centro e zoom in base ai marker
      if (newMarkers.length > 0) {
        const lats = newMarkers.map(m => m.lat);
        const lngs = newMarkers.map(m => m.lng);
        const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
        const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
        setMapCenter([centerLat, centerLng]);
        
        // Calcola zoom appropriato
        const latDiff = Math.max(...lats) - Math.min(...lats);
        const lngDiff = Math.max(...lngs) - Math.min(...lngs);
        const maxDiff = Math.max(latDiff, lngDiff);
        
        if (maxDiff < 0.01) setMapZoom(15);
        else if (maxDiff < 0.05) setMapZoom(13);
        else if (maxDiff < 0.1) setMapZoom(12);
        else if (maxDiff < 0.5) setMapZoom(10);
        else setMapZoom(8);
      }

      setIsLoading(false);
    }

    loadMarkers();
  }, [itinerary, destinationName, destinationLat, destinationLng]);

  // Filtra marker per giorno selezionato
  const filteredMarkers = selectedDay === "all" 
    ? markers 
    : markers.filter(m => m.dayNumber === selectedDay);

  // Crea polyline per collegare i marker dello stesso giorno
  const dayRoutes: { [key: number]: [number, number][] } = {};
  markers.forEach(marker => {
    if (!dayRoutes[marker.dayNumber]) {
      dayRoutes[marker.dayNumber] = [];
    }
    dayRoutes[marker.dayNumber].push([marker.lat, marker.lng]);
  });

  const routeToShow = selectedDay === "all" 
    ? Object.values(dayRoutes).flat()
    : dayRoutes[selectedDay] || [];

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header con filtri */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">🗺️ Mappa Itinerario</h3>
          {isLoading && loadingProgress.total > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">
                Caricamento {loadingProgress.current}/{loadingProgress.total}
              </span>
              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Filtro giorni */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedDay("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              selectedDay === "all"
                ? "bg-indigo-500 text-white"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
          >
            Tutti i giorni ({markers.length})
          </button>
          {itinerary.giorni.map((day) => {
            const dayMarkers = markers.filter(m => m.dayNumber === day.giorno);
            return (
              <button
                key={day.giorno}
                onClick={() => setSelectedDay(day.giorno)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedDay === day.giorno
                    ? "bg-emerald-500 text-white"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                Giorno {day.giorno} ({dayMarkers.length})
              </button>
            );
          })}
        </div>
      </div>

      {/* Mappa */}
      <div className="flex-1 relative">
        {markers.length === 0 && !isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10">
            <div className="text-center">
              <p className="text-2xl mb-2">🗺️</p>
              <p className="text-white/60 text-sm">
                Nessuna posizione disponibile per questo itinerario
              </p>
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

            {/* Polyline per il percorso */}
            {selectedDay !== "all" && routeToShow.length > 1 && (
              <Polyline
                positions={routeToShow}
                color="#10b981"
                weight={3}
                opacity={0.7}
                dashArray="10, 10"
              />
            )}

            {/* Marker per ogni attività */}
            {filteredMarkers.map((marker) => (
              <Marker
                key={`${marker.dayNumber}-${marker.activityIndex}`}
                position={[marker.lat, marker.lng]}
                icon={createCustomIcon(marker.activity.tipo, activityEmojis[marker.activity.tipo])}
              >
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{activityEmojis[marker.activity.tipo]}</span>
                      <span className="text-xs font-bold text-indigo-600 uppercase">
                        Giorno {marker.dayNumber} - #{marker.activityIndex + 1}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm mb-1">{marker.activity.attivita}</h4>
                    <p className="text-xs text-gray-600 mb-2">{marker.activity.orario}</p>
                    <p className="text-xs text-gray-700 leading-relaxed mb-2">
                      {marker.activity.descrizione}
                    </p>
                    {marker.activity.luogo && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <span>📍</span> {marker.activity.luogo}
                      </p>
                    )}
                    {marker.activity.costo && (
                      <p className="text-xs font-semibold text-emerald-600 mt-1">
                        💰 {marker.activity.costo}
                      </p>
                    )}
                    {marker.activity.link && (
                      <a
                        href={marker.activity.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                      >
                        🔗 {marker.activity.linkLabel || "Apri link"}
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Legenda */}
      <div className="p-3 border-t border-white/10 bg-slate-900/50">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-white/40">Legenda:</span>
          {Object.entries(activityEmojis).slice(0, 6).map(([tipo, emoji]) => (
            <span key={tipo} className="text-white/60 flex items-center gap-1">
              <span>{emoji}</span>
              <span className="capitalize">{tipo}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
