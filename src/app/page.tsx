"use client";

import { useState, useCallback, useEffect } from "react";
import ModeToggle from "@/components/ModeToggle";
import RadiusSelector from "@/components/RadiusSelector";
import SurpriseMeButton from "@/components/SurpriseMeButton";
import DestinationCard from "@/components/DestinationCard";
import LocationStatus from "@/components/LocationStatus";
import {
  TravelMode,
  GeoPosition,
  DestinationResult,
  WeatherData,
  Destination,
  DestinationDatabase,
} from "@/lib/types";
import {
  haversineDistance,
  estimateTravelTime,
  buildMapsUrl,
  selectDestination,
} from "@/lib/algorithm";
import staticDb from "@/data/destinations.json";

type LocationState = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [mode, setMode] = useState<TravelMode>("tourist");
  const [radius, setRadius] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DestinationResult | null>(null);
  const [userPos, setUserPos] = useState<GeoPosition | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationState>("idle");
  const [locationError, setLocationError] = useState<string>("");
  const [noResultMessage, setNoResultMessage] = useState("");
  const [seenNames, setSeenNames] = useState<string[]>([]);
  const [seenStaticIds, setSeenStaticIds] = useState<string[]>([]);
  const [aiUsed, setAiUsed] = useState<boolean | null>(null);

  // Auto-request geolocation on mount
  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Geolocalizzazione non supportata dal browser");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPos({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("success");
      },
      (error) => {
        setLocationStatus("error");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError(
              "Permesso negato. Abilita la geolocalizzazione per continuare."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Posizione non disponibile.");
            break;
          case error.TIMEOUT:
            setLocationError("Timeout della richiesta.");
            break;
          default:
            setLocationError("Errore sconosciuto.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const handleSurprise = useCallback(async () => {
    if (!userPos) {
      requestLocation();
      return;
    }

    setIsLoading(true);
    setResult(null);
    setNoResultMessage("");
    setAiUsed(null);

    try {
      // === TRY AI FIRST ===
      let destination: Destination | null = null;
      let usedAi = false;

      try {
        const aiRes = await fetch("/api/ai-suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: userPos.lat,
            lng: userPos.lng,
            radius,
            mode,
            excludeNames: seenNames,
          }),
        });

        const aiData = await aiRes.json();

        if (aiRes.ok && aiData.destination) {
          destination = aiData.destination;
          usedAi = true;
        } else {
          console.warn("AI non disponibile, uso fallback statico:", aiData.error);
        }
      } catch (aiErr) {
        console.warn("AI request failed, uso fallback statico:", aiErr);
      }

      // === FALLBACK: STATIC DATASET + WEIGHTED RANDOM ===
      if (!destination) {
        const db = staticDb as DestinationDatabase;
        const pool = mode === "tourist" ? db.tourist : db.biker;

        // Quick weather fetch for all candidates
        const weatherMap = new Map<string, WeatherData>();
        try {
          const locations = pool
            .filter((d) => !seenStaticIds.includes(d.id))
            .slice(0, 15) // limit to avoid huge requests
            .map((d) => ({ id: d.id, lat: d.lat, lng: d.lng }));

          if (locations.length > 0) {
            const wRes = await fetch("/api/weather", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ locations }),
            });
            const wData = await wRes.json();
            if (wData.weather) {
              for (const [id, w] of Object.entries(wData.weather)) {
                weatherMap.set(id, w as WeatherData);
              }
            }
          }
        } catch {
          // Weather not critical
        }

        const picked = selectDestination(
          pool as Destination[],
          userPos,
          radius,
          mode,
          weatherMap,
          seenStaticIds
        );

        if (picked) {
          destination = { ...picked.destination, source: "static" as const };
          setSeenStaticIds((prev) => [...prev, destination!.id]);
        }
      }

      if (!destination) {
        setNoResultMessage(
          "Nessuna destinazione trovata per il raggio selezionato. Prova ad aumentare la distanza!"
        );
        setIsLoading(false);
        return;
      }

      // Track source and AI name
      setAiUsed(usedAi);
      if (usedAi) {
        setSeenNames((prev) => [...prev, destination!.name]);
      }

      // Fetch weather for the final destination
      let weather: WeatherData | null = null;
      try {
        const weatherRes = await fetch("/api/weather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locations: [
              { id: destination.id, lat: destination.lat, lng: destination.lng },
            ],
          }),
        });
        const weatherData = await weatherRes.json();
        const weatherMap = weatherData.weather || {};
        weather = weatherMap[destination.id] || null;
      } catch {
        // Weather not critical
      }

      const distance = haversineDistance(userPos, {
        lat: destination.lat,
        lng: destination.lng,
      });

      const destinationResult: DestinationResult = {
        destination,
        distance,
        weather,
        travelTime: estimateTravelTime(distance, mode),
        mapsUrl: buildMapsUrl(userPos, destination, mode),
      };

      setResult(destinationResult);
    } catch (error) {
      console.error("Error:", error);
      setNoResultMessage("Si è verificato un errore. Riprova!");
    } finally {
      setIsLoading(false);
    }
  }, [userPos, mode, radius, requestLocation, seenNames, seenStaticIds]);

  const handleReset = useCallback(() => {
    setResult(null);
    setNoResultMessage("");
  }, []);

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-8">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute -top-1/2 -left-1/2 h-[200%] w-[200%] transition-all duration-1000 ${
            mode === "tourist"
              ? "bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15)_0%,transparent_60%)]"
              : "bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.15)_0%,transparent_60%)]"
          }`}
        />
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-8">
        {!result ? (
          <>
            {/* Logo / Title */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex items-center gap-2 text-4xl font-black text-white">
                <span className="text-5xl">📍</span>
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-orange-400 bg-clip-text text-transparent">
                  WayPoint
                </span>
              </div>
              <h1 className="text-5xl font-black text-white tracking-tight">
                Roulette
              </h1>
              <p className="mt-2 max-w-sm text-base text-white/50 leading-relaxed">
                Basta indecisione. Scegli il tuo stile, premi il tasto e scopri
                dove andare oggi.
              </p>
            </div>

            {/* Location Status */}
            <LocationStatus
              status={locationStatus}
              errorMessage={locationError}
            />

            {/* Mode Toggle */}
            <ModeToggle mode={mode} onChange={setMode} />

            {/* Radius Selector */}
            <RadiusSelector radius={radius} onChange={setRadius} />

            {/* Surprise Button */}
            <div className="mt-4">
              <SurpriseMeButton
                onClick={handleSurprise}
                isLoading={isLoading}
                mode={mode}
              />
            </div>

            {/* No Result Message */}
            {noResultMessage && (
              <div className="animate-fade-in rounded-2xl bg-red-500/10 border border-red-500/20 px-6 py-4 text-center">
                <p className="text-sm text-red-300">{noResultMessage}</p>
              </div>
            )}

            {/* Location retry */}
            {locationStatus === "error" && (
              <button
                onClick={requestLocation}
                className="text-sm text-white/40 underline hover:text-white/60 transition-colors"
              >
                Riprova geolocalizzazione
              </button>
            )}
          </>
        ) : (
          /* Result Card */
          <div className="w-full animate-fade-in">
            <button
              onClick={handleReset}
              className="mb-4 flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              ← Torna indietro
            </button>

            {/* AI / Fallback source banner */}
            {aiUsed !== null && (
              <div
                className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium animate-fade-in ${
                  aiUsed
                    ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-300"
                    : "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                }`}
              >
                <span className="text-base">{aiUsed ? "🤖" : "📦"}</span>
                <span>
                  {aiUsed
                    ? "Destinazione scelta dall'Intelligenza Artificiale"
                    : "IA non disponibile — destinazione dal database locale"}
                </span>
              </div>
            )}

            <DestinationCard
              result={result}
              mode={mode}
              onReset={handleSurprise}
            />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-white/20">
          <p>WayPoint Roulette — La tua prossima avventura a un clic</p>
        </footer>
      </div>
    </div>
  );
}
