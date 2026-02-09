"use client";

import { useState, useCallback, useEffect } from "react";
import ModeToggle from "@/components/ModeToggle";
import RadiusSelector from "@/components/RadiusSelector";
import SurpriseMeButton from "@/components/SurpriseMeButton";
import DestinationCard from "@/components/DestinationCard";
import LocationStatus from "@/components/LocationStatus";
import BikerOptions from "@/components/BikerOptions";
import TouristOptions from "@/components/TouristOptions";
import ExtremeOptions from "@/components/ExtremeOptions";
import {
  TravelMode,
  GeoPosition,
  DestinationResult,
  WeatherData,
  Destination,
  DestinationDatabase,
  BikerPreferences,
  TouristPreferences,
  ExtremePreferences,
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
  const [isExtremeMode, setIsExtremeMode] = useState(false);
  const [showExtremePanel, setShowExtremePanel] = useState(false);

  // Extreme-specific preferences
  const [extremePrefs, setExtremePrefs] = useState<ExtremePreferences>({
    transport: "auto",
    budget: "100",
  });

  // Biker-specific preferences
  const today = new Date().toISOString().split("T")[0];
  const [bikerPrefs, setBikerPrefs] = useState<BikerPreferences>({
    intent: "curve",
    targetDate: today,
    targetTime: "10:00",
    preferScenic: true,
    avoidHighways: true,
    groupSize: "solo",
  });

  // Tourist-specific preferences
  const [touristPrefs, setTouristPrefs] = useState<TouristPreferences>({
    transport: "auto",
    accommodation: "bnb",
    allowAbroad: false,
    tripDays: 1,
    targetDate: today,
    groupSize: "coppia",
  });

  // Auto-request geolocation on mount
  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger extreme search when isExtremeMode is set to true
  const [extremePending, setExtremePending] = useState(false);
  useEffect(() => {
    if (extremePending && isExtremeMode) {
      setExtremePending(false);
      handleSurprise();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extremePending, isExtremeMode]);

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
            extreme: isExtremeMode,
            ...(isExtremeMode
              ? { extremePrefs }
              : mode === "biker"
              ? { bikerPrefs }
              : { touristPrefs }),
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
        sunsetTime: destination.sunsetTime || undefined,
        sunriseTime: destination.sunriseTime || undefined,
      };

      setResult(destinationResult);
    } catch (error) {
      console.error("Error:", error);
      setNoResultMessage("Si è verificato un errore. Riprova!");
    } finally {
      setIsLoading(false);
    }
  }, [userPos, mode, radius, requestLocation, seenNames, seenStaticIds, bikerPrefs, touristPrefs, isExtremeMode, extremePrefs]);

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

            {/* Tourist Options (shown only in tourist mode) */}
            {mode === "tourist" && (
              <TouristOptions
                preferences={touristPrefs}
                onChange={setTouristPrefs}
              />
            )}

            {/* Biker Options (shown only in biker mode) */}
            {mode === "biker" && (
              <BikerOptions
                preferences={bikerPrefs}
                onChange={setBikerPrefs}
              />
            )}

            {/* Surprise Button */}
            <div className="mt-4 flex flex-col items-center gap-3">
              <SurpriseMeButton
                onClick={() => {
                  if (isExtremeMode) setIsExtremeMode(false);
                  handleSurprise();
                }}
                isLoading={isLoading && !isExtremeMode}
                mode={mode}
              />

              {/* Extreme Button */}
              <button
                onClick={() => {
                  setShowExtremePanel((prev) => !prev);
                }}
                disabled={isLoading}
                className={`
                  group relative overflow-hidden rounded-full
                  bg-gradient-to-br from-red-500 via-pink-600 to-purple-700
                  px-8 py-3 text-sm font-bold text-white
                  shadow-lg shadow-red-500/30
                  transition-all duration-500 ease-out
                  hover:scale-105 hover:shadow-xl hover:shadow-red-500/40
                  active:scale-95
                  disabled:opacity-70 disabled:cursor-wait disabled:hover:scale-100
                  ${showExtremePanel ? "ring-2 ring-red-400/60" : ""}
                `}
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg transition-transform duration-300 group-hover:animate-bounce">🔥</span>
                  {showExtremePanel ? "Chiudi Opzioni Estrema" : "Modalità Estrema"}
                </span>
              </button>

              {/* Extreme Options Panel */}
              {showExtremePanel && (
                <div className="w-full flex flex-col items-center gap-3">
                  <ExtremeOptions
                    preferences={extremePrefs}
                    onChange={setExtremePrefs}
                  />
                  <button
                    onClick={() => {
                      setIsExtremeMode(true);
                      setExtremePending(true);
                    }}
                    disabled={isLoading}
                    className={`
                      group relative overflow-hidden rounded-full
                      bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500
                      px-10 py-3.5 text-sm font-black text-white uppercase tracking-wider
                      shadow-lg shadow-orange-500/30
                      transition-all duration-500 ease-out
                      hover:scale-110 hover:shadow-xl hover:shadow-orange-500/40
                      active:scale-95
                      disabled:opacity-70 disabled:cursor-wait disabled:hover:scale-100
                    `}
                  >
                    {isLoading && isExtremeMode ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Genero follia...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="text-lg animate-bounce">�</span>
                        LANCIA L&apos;AVVENTURA ESTREMA
                        <span className="text-lg animate-bounce">🚀</span>
                      </span>
                    )}
                  </button>
                </div>
              )}
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
                  isExtremeMode
                    ? "bg-red-500/15 border border-red-500/30 text-red-300"
                    : aiUsed
                    ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-300"
                    : "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                }`}
              >
                <span className="text-base">{isExtremeMode ? "🔥" : aiUsed ? "🤖" : "📦"}</span>
                <span>
                  {isExtremeMode
                    ? "Modalità Estrema — Avventura folle generata dall'IA"
                    : aiUsed
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
