"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import ModeToggle from "@/components/ModeToggle";
import RadiusSelector from "@/components/RadiusSelector";
import SurpriseMeButton from "@/components/SurpriseMeButton";
import DestinationCard from "@/components/DestinationCard";
import LocationStatus from "@/components/LocationStatus";
import BikerOptions from "@/components/BikerOptions";
import TouristOptions from "@/components/TouristOptions";
import ExtremeOptions from "@/components/ExtremeOptions";
import ItineraryView from "@/components/ItineraryView";
import UserMenu from "@/components/UserMenu";
import SavedTripsList from "@/components/SavedTripsList";
import AchievementsView from "@/components/AchievementsView";
import AchievementToast from "@/components/AchievementToast";
import LeaderboardView from "@/components/LeaderboardView";
import { useAuth } from "@/components/AuthProvider";
import { Achievement, ACHIEVEMENTS } from "@/data/achievements";
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
  FullItinerary,
  SavedTrip,
} from "@/lib/types";
import {
  haversineDistance,
  estimateTravelTime,
  buildMapsUrl,
  selectDestination,
} from "@/lib/algorithm";
import staticDb from "@/data/destinations.json";

type LocationState = "idle" | "loading" | "success" | "error";

const QUICK_SUGGESTIONS = [
  { emoji: "🏖️", text: "Un weekend al mare" },
  { emoji: "🏔️", text: "Montagna e trekking" },
  { emoji: "🏰", text: "Un borgo medievale" },
  { emoji: "🍕", text: "Dove si mangia bene" },
  { emoji: "🌅", text: "Posto romantico" },
  { emoji: "🏍️", text: "Un giro in moto" },
  { emoji: "💰", text: "Gita economica" },
  { emoji: "🎨", text: "Città d'arte" },
  { emoji: "🌿", text: "Natura incontaminata" },
  { emoji: "🔥", text: "Qualcosa di folle!" },
];

type ViewStep = "hero" | "details" | "result";

export default function Home() {
  const { user } = useAuth();
  const [mode, setMode] = useState<TravelMode>("tourist");
  const [minRadius, setMinRadius] = useState(50);
  const [maxRadius, setMaxRadius] = useState(250);
  const [allowAbroad, setAllowAbroad] = useState(false);
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

  // Conversational UX
  const [userQuery, setUserQuery] = useState("");
  const [viewStep, setViewStep] = useState<ViewStep>("hero");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Itinerary state
  const [itinerary, setItinerary] = useState<FullItinerary | null>(null);
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);

  // Saved trips state
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [showSavedTrips, setShowSavedTrips] = useState(false);
  const [isLoadingSavedTrips, setIsLoadingSavedTrips] = useState(false);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [tripSaved, setTripSaved] = useState(false);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);

  // Achievements state
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [showAchievements, setShowAchievements] = useState(false);
  const [toastQueue, setToastQueue] = useState<Achievement[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Extreme-specific preferences
  const [extremePrefs, setExtremePrefs] = useState<ExtremePreferences>({
    transport: "auto",
    budget: "100",
  });

  const today = new Date().toISOString().split("T")[0];
  const [bikerPrefs, setBikerPrefs] = useState<BikerPreferences>({
    intent: "curve",
    experience: "intermedio",
    roadTypes: [],
    targetDate: today,
    targetTime: "10:00",
    preferScenic: true,
    avoidHighways: true,
    groupSize: "solo",
    freeText: "",
  });

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [touristPrefs, setTouristPrefs] = useState<TouristPreferences>({
    transport: "auto",
    accommodation: "bnb",
    budget: "medio",
    interests: [],
    pace: "moderato",
    tripDays: 1,
    targetDate: today,
    travelMonth: currentMonth,
    departurePoint: "",
    groupSize: "coppia",
    freeText: "",
  });

  // Auto geolocation
  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setUserPos({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus("success");
      },
      (error) => {
        setLocationStatus("error");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Permesso negato. Abilita la geolocalizzazione per continuare.");
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

  // Auto-detect mode from text
  const detectModeFromQuery = useCallback((query: string) => {
    const q = query.toLowerCase();
    if (q.match(/\b(moto|biker|curve|tornanti|passo|passi|ride|motocicletta|due ruote)\b/)) {
      setMode("biker");
    } else {
      setMode("tourist");
    }
    if (q.match(/\b(folle|estremo|pazzo|assurdo|avventura estrema|follia|crazy|wild)\b/)) {
      setIsExtremeMode(true);
    }
  }, []);

  const handleQuickSuggestion = useCallback((text: string) => {
    setUserQuery(text);
    detectModeFromQuery(text);
    if (text.toLowerCase().match(/\b(moto|biker|giro in moto)\b/)) {
      setBikerPrefs(prev => ({ ...prev, freeText: text }));
    } else {
      setTouristPrefs(prev => ({ ...prev, freeText: text }));
    }
    setViewStep("details");
  }, [detectModeFromQuery]);

  const handleQuerySubmit = useCallback(() => {
    if (!userQuery.trim()) return;
    detectModeFromQuery(userQuery);
    if (mode === "biker") {
      setBikerPrefs(prev => ({ ...prev, freeText: userQuery }));
    } else {
      setTouristPrefs(prev => ({ ...prev, freeText: userQuery }));
    }
    setViewStep("details");
  }, [userQuery, mode, detectModeFromQuery]);

  const handleSurprise = useCallback(async () => {
    if (!userPos) {
      requestLocation();
      return;
    }

    setIsLoading(true);
    setResult(null);
    setNoResultMessage("");
    setAiUsed(null);
    setTripSaved(false);
    setShowSavedTrips(false);
    setViewStep("result");

    try {
      let destination: Destination | null = null;
      let usedAi = false;

      try {
        const aiRes = await fetch("/api/ai-suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: userPos.lat,
            lng: userPos.lng,
            minRadius,
            maxRadius,
            allowAbroad,
            mode,
            excludeNames: seenNames,
            extreme: isExtremeMode,
            ...(isExtremeMode
              ? { extremePrefs: { ...extremePrefs, freeText: userQuery || extremePrefs.freeText } }
              : mode === "biker"
              ? { bikerPrefs: { ...bikerPrefs, freeText: userQuery || bikerPrefs.freeText } }
              : { touristPrefs: { ...touristPrefs, freeText: userQuery || touristPrefs.freeText } }),
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

      if (!destination) {
        const db = staticDb as DestinationDatabase;
        const pool = mode === "tourist" ? db.tourist : db.biker;

        const weatherMap = new Map<string, WeatherData>();
        try {
          const locations = pool
            .filter((d) => !seenStaticIds.includes(d.id))
            .slice(0, 15)
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
        } catch { /* Weather not critical */ }

        const picked = selectDestination(
          pool as Destination[],
          userPos,
          minRadius,
          maxRadius,
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
        setNoResultMessage("Non ho trovato nulla per la tua richiesta 😕 Prova a cambiare qualcosa o ad allargare il raggio!");
        setIsLoading(false);
        return;
      }

      setAiUsed(usedAi);
      if (usedAi) {
        setSeenNames((prev) => [...prev, destination!.name]);
      }

      let weather: WeatherData | null = null;
      try {
        const weatherRes = await fetch("/api/weather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locations: [{ id: destination.id, lat: destination.lat, lng: destination.lng }],
          }),
        });
        const weatherData = await weatherRes.json();
        const weatherMap = weatherData.weather || {};
        weather = weatherMap[destination.id] || null;
      } catch { /* Weather not critical */ }

      const distance = haversineDistance(userPos, { lat: destination.lat, lng: destination.lng });

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

      trackAction("spin", {
        mode,
        distance,
        extreme: isExtremeMode,
        allowAbroad,
        transport: mode === "tourist" ? touristPrefs.transport : "moto",
        budget: mode === "tourist" ? touristPrefs.budget : undefined,
        interests: mode === "tourist" ? touristPrefs.interests : [],
        tripDays: mode === "tourist" ? touristPrefs.tripDays : 1,
        groupSize: mode === "tourist" ? touristPrefs.groupSize : mode === "biker" ? bikerPrefs.groupSize : "solo",
      });
    } catch (error) {
      console.error("Error:", error);
      setNoResultMessage("Ops, qualcosa è andato storto 😅 Riprova tra un attimo!");
    } finally {
      setIsLoading(false);
    }
  }, [userPos, mode, minRadius, maxRadius, allowAbroad, requestLocation, seenNames, seenStaticIds, bikerPrefs, touristPrefs, isExtremeMode, extremePrefs, userQuery]);

  const handleReset = useCallback(() => {
    setResult(null);
    setNoResultMessage("");
    setItinerary(null);
    setShowItinerary(false);
    setTripSaved(false);
    setSavedTripId(null);
    setShowSavedTrips(false);
    setShowAchievements(false);
    setShowLeaderboard(false);
    setViewStep("hero");
  }, []);

  const handleBackToDetails = useCallback(() => {
    setResult(null);
    setNoResultMessage("");
    setViewStep("details");
  }, []);

  const handleAccept = useCallback(async () => {
    if (!result || !userPos) return;
    setIsGeneratingItinerary(true);
    try {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: {
            name: result.destination.name,
            region: result.destination.region,
            lat: result.destination.lat,
            lng: result.destination.lng,
            description: result.destination.description,
            aiPlan: result.destination.aiPlan,
            transportInfo: result.destination.transportInfo,
            costBreakdown: result.destination.costBreakdown,
            nearbyPlaces: result.destination.nearbyPlaces,
          },
          mode,
          userLat: userPos.lat,
          userLng: userPos.lng,
          distance: result.distance,
          travelTime: result.travelTime,
          ...(mode === "biker" ? { bikerPrefs } : { touristPrefs }),
        }),
      });
      const data = await res.json();
      if (res.ok && data.itinerary) {
        setItinerary(data.itinerary);
        setShowItinerary(true);
        trackAction("itinerary", { tripDays: data.itinerary.giorni?.length || 1 });
      } else {
        console.error("Itinerary error:", data.error);
        alert("Impossibile generare l'itinerario. Riprova tra poco.");
      }
    } catch (err) {
      console.error("Itinerary fetch error:", err);
      alert("Errore di rete. Riprova tra poco.");
    } finally {
      setIsGeneratingItinerary(false);
    }
  }, [result, userPos, mode, bikerPrefs, touristPrefs]);

  const fetchSavedTrips = useCallback(async () => {
    if (!user) return;
    setIsLoadingSavedTrips(true);
    try {
      const res = await fetch("/api/trips");
      const data = await res.json();
      if (res.ok) setSavedTrips(data.trips || []);
    } catch (err) {
      console.error("Error fetching saved trips:", err);
    } finally {
      setIsLoadingSavedTrips(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchSavedTrips();
    else setSavedTrips([]);
  }, [user, fetchSavedTrips]);

  const handleSaveTrip = useCallback(async () => {
    if (!user || !result || !itinerary) return;
    setIsSavingTrip(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_name: result.destination.name,
          destination_region: result.destination.region,
          destination_image: result.destination.image || "",
          destination_lat: result.destination.lat,
          destination_lng: result.destination.lng,
          mode,
          distance: result.distance,
          trip_days: itinerary.giorni.length,
          destination_data: result.destination,
          itinerary_data: itinerary,
          result_data: { travelTime: result.travelTime, mapsUrl: result.mapsUrl },
        }),
      });
      if (res.ok) {
        setTripSaved(true);
        try {
          const resData = await res.json();
          if (resData.trip?.id) setSavedTripId(resData.trip.id);
        } catch { /* ok */ }
        fetchSavedTrips();
        trackAction("save");
      } else {
        let errorMsg = "Errore nel salvataggio";
        try { const data = await res.json(); errorMsg = data.error || errorMsg; } catch { /* ok */ }
        alert(errorMsg);
      }
    } catch (err) {
      console.error("Error saving trip:", err);
      alert("Errore di rete nel salvataggio");
    } finally {
      setIsSavingTrip(false);
    }
  }, [user, result, itinerary, mode, fetchSavedTrips]);

  const handleDeleteTrip = useCallback(async (tripId: string) => {
    try {
      const res = await fetch(`/api/trips?id=${tripId}`, { method: "DELETE" });
      if (res.ok) setSavedTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch (err) {
      console.error("Error deleting trip:", err);
    }
  }, []);

  const handleLoadTrip = useCallback((trip: SavedTrip) => {
    const dest = trip.destination_data as Destination;
    const itin = trip.itinerary_data as FullItinerary;
    const rData = trip.result_data as { travelTime: string; mapsUrl: string };
    setResult({
      destination: dest, distance: trip.distance, weather: null,
      travelTime: rData?.travelTime || "", mapsUrl: rData?.mapsUrl || "",
    });
    setItinerary(itin);
    setShowItinerary(true);
    setShowSavedTrips(false);
    setTripSaved(true);
    setSavedTripId(trip.id);
    setViewStep("result");
  }, []);

  const handleShowSavedTrips = useCallback(() => {
    setShowSavedTrips(true);
    setShowAchievements(false);
    setResult(null);
    setItinerary(null);
    setShowItinerary(false);
    fetchSavedTrips();
  }, [fetchSavedTrips]);

  const fetchAchievements = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/achievements");
      const data = await res.json();
      if (res.ok && data.unlocked) {
        setUnlockedAchievements(new Set(data.unlocked.map((a: { achievement_id: string }) => a.achievement_id)));
      }
    } catch (err) { console.error("Error fetching achievements:", err); }
  }, [user]);

  useEffect(() => {
    if (user) fetchAchievements();
    else setUnlockedAchievements(new Set());
  }, [user, fetchAchievements]);

  const trackAction = useCallback(
    async (action: string, data?: Record<string, unknown>) => {
      if (!user) return;
      try {
        const res = await fetch("/api/achievements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, data }),
        });
        const result = await res.json();
        if (res.ok && result.newlyUnlocked?.length > 0) {
          setUnlockedAchievements((prev) => {
            const next = new Set(prev);
            result.newlyUnlocked.forEach((a: Achievement) => next.add(a.id));
            return next;
          });
          setToastQueue((prev) => [...prev, ...result.newlyUnlocked]);
        }
      } catch (err) { console.error("Error tracking achievement:", err); }
    },
    [user]
  );

  useEffect(() => {
    if (user) trackAction("account_created");
  }, [user, trackAction]);

  const handleShowAchievements = useCallback(() => {
    setShowAchievements(true); setShowSavedTrips(false); setShowLeaderboard(false);
    setResult(null); setItinerary(null); setShowItinerary(false);
  }, []);

  const handleShowLeaderboard = useCallback(() => {
    setShowLeaderboard(true); setShowAchievements(false); setShowSavedTrips(false);
    setResult(null); setItinerary(null); setShowItinerary(false);
  }, []);

  const handleItineraryChange = useCallback((updated: FullItinerary) => { setItinerary(updated); }, []);
  const handleUpdateSavedTrip = useCallback(() => { fetchSavedTrips(); }, [fetchSavedTrips]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return "Notte fonda... voglia di avventura? 🌙";
    if (hour < 12) return "Buongiorno! Dove andiamo oggi? ☀️";
    if (hour < 18) return "Buon pomeriggio! Pronti a partire? 🌤️";
    return "Buonasera! Un viaggio ti aspetta 🌅";
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center overflow-hidden animated-gradient-bg px-4 py-6">
      {/* User Menu */}
      <div className="fixed top-4 right-4 z-50">
        <UserMenu
          onShowSavedTrips={handleShowSavedTrips}
          savedTripsCount={savedTrips.length}
          onShowAchievements={handleShowAchievements}
          achievementsCount={unlockedAchievements.size}
          totalAchievements={ACHIEVEMENTS.length}
          onShowLeaderboard={handleShowLeaderboard}
        />
      </div>

      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.06)_0%,transparent_50%)] transition-all duration-1000" />
        <div className="absolute top-0 left-1/4 h-80 w-80 rounded-full bg-emerald-500/[0.04] blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-indigo-500/[0.04] blur-[100px]" />
      </div>

      {/* Achievement Toast */}
      {toastQueue.length > 0 && (
        <AchievementToast
          achievement={toastQueue[0]}
          onDone={() => setToastQueue((prev) => prev.slice(1))}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6">
        {showLeaderboard ? (
          <LeaderboardView onBack={handleReset} />
        ) : showAchievements ? (
          <AchievementsView unlockedIds={unlockedAchievements} onBack={handleReset} />
        ) : showSavedTrips ? (
          <SavedTripsList
            trips={savedTrips} isLoading={isLoadingSavedTrips}
            onLoad={handleLoadTrip} onDelete={handleDeleteTrip} onBack={handleReset}
          />
        ) : viewStep === "hero" && !result ? (
          /* ═══ STEP 1: HERO ═══ */
          <>
            {/* Logo & Tagline */}
            <div className="flex flex-col items-center gap-3 text-center mt-10 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl animate-float">📍</span>
                <span className="text-3xl font-black text-gradient tracking-tight">
                  WayPoint
                </span>
              </div>
              <p className="text-sm text-white/40 font-medium max-w-xs">
                La tua prossima avventura inizia da qui
              </p>
            </div>

            {/* Greeting */}
            <p className="text-center text-base text-white/60 font-medium animate-fade-in" style={{ animationDelay: "0.08s" }}>
              {getGreeting()}
            </p>

            {/* Main Input */}
            <div className="w-full animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleQuerySubmit();
                    }
                  }}
                  placeholder={"Dimmi cosa ti piacerebbe fare... ✨\nes: \"Weekend in un borgo con buon cibo\"\nes: \"Giro in moto con belle curve\""}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-base text-white placeholder-white/25 outline-none transition-all duration-300 focus:border-emerald-500/30 focus:bg-white/[0.06] focus:shadow-lg focus:shadow-emerald-500/[0.05]"
                />
                {userQuery.trim() && (
                  <button
                    onClick={handleQuerySubmit}
                    className="absolute bottom-3 right-3 rounded-xl bg-emerald-500 p-2.5 text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="w-full animate-fade-in" style={{ animationDelay: "0.22s" }}>
              <p className="text-[11px] text-white/25 text-center mb-3 uppercase tracking-wider font-medium">
                Idee veloci
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {QUICK_SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickSuggestion(s.text)}
                    className="group flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[13px] text-white/50 transition-all duration-200 hover:border-emerald-500/25 hover:bg-emerald-500/[0.08] hover:text-white/80 active:scale-95"
                  >
                    <span className="text-sm">{s.emoji}</span>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Separator */}
            <div className="w-full flex items-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
              <span className="text-[11px] text-white/15 uppercase tracking-wider">oppure</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            </div>

            {/* Random button */}
            <div className="animate-fade-in" style={{ animationDelay: "0.35s" }}>
              <SurpriseMeButton
                onClick={() => { if (isExtremeMode) setIsExtremeMode(false); handleSurprise(); }}
                isLoading={isLoading && !isExtremeMode}
                mode={mode}
              />
            </div>

            {/* Quick links */}
            <div className="flex flex-wrap justify-center gap-2 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <a href="/plan" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/40 text-xs font-medium hover:bg-indigo-500/[0.08] hover:border-indigo-500/15 hover:text-indigo-300/80 transition-all">
                🗺️ Pianifica un viaggio
              </a>
              <a href="/my-trips-map" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/40 text-xs font-medium hover:bg-emerald-500/[0.08] hover:border-emerald-500/15 hover:text-emerald-300/80 transition-all">
                🌍 I miei viaggi
              </a>
              <a href="/friends" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/40 text-xs font-medium hover:bg-purple-500/[0.08] hover:border-purple-500/15 hover:text-purple-300/80 transition-all">
                👥 Amici
              </a>
            </div>

            {/* Location Status */}
            <LocationStatus status={locationStatus} errorMessage={locationError} />
            {locationStatus === "error" && (
              <button onClick={requestLocation} className="text-[11px] text-white/25 underline hover:text-white/50 transition-colors">
                Riprova geolocalizzazione
              </button>
            )}
          </>
        ) : viewStep === "details" && !result ? (
          /* ═══ STEP 2: DETAILS ═══ */
          <>
            <button
              onClick={() => setViewStep("hero")}
              className="self-start flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors mt-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Indietro
            </button>

            {userQuery && (
              <div className="w-full rounded-2xl glass-subtle px-5 py-4 animate-fade-in">
                <p className="text-[11px] text-emerald-400/50 font-medium mb-1 uppercase tracking-wider">La tua richiesta</p>
                <p className="text-base text-white/80 font-medium">&ldquo;{userQuery}&rdquo;</p>
              </div>
            )}

            <div className="text-center animate-fade-in" style={{ animationDelay: "0.05s" }}>
              <p className="text-base text-white/60 font-medium">
                Personalizza il tuo viaggio 🎯
              </p>
              <p className="text-[11px] text-white/25 mt-1">
                Scegli le opzioni o cerca subito
              </p>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <ModeToggle mode={mode} onChange={setMode} />
            </div>

            <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <RadiusSelector
                minRadius={minRadius} maxRadius={maxRadius} allowAbroad={allowAbroad}
                onChangeMin={setMinRadius} onChangeMax={setMaxRadius} onChangeAbroad={setAllowAbroad}
              />
            </div>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-[13px] text-white/30 hover:text-white/50 transition-all animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-300 ${showAdvanced ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {showAdvanced ? "Nascondi opzioni avanzate" : "Opzioni avanzate"}
            </button>

            {showAdvanced && (
              <div className="w-full animate-fade-in-fast">
                {mode === "tourist" && <TouristOptions preferences={touristPrefs} onChange={setTouristPrefs} />}
                {mode === "biker" && <BikerOptions preferences={bikerPrefs} onChange={setBikerPrefs} />}
              </div>
            )}

            <div className="flex flex-col items-center gap-3 w-full mt-2 animate-fade-in" style={{ animationDelay: "0.25s" }}>
              <SurpriseMeButton
                onClick={() => { if (isExtremeMode) setIsExtremeMode(false); handleSurprise(); }}
                isLoading={isLoading && !isExtremeMode}
                mode={mode}
              />

              {/* Extreme mode — cleaner toggle */}
              <button
                onClick={() => setShowExtremePanel((prev) => !prev)}
                disabled={isLoading}
                className={`flex items-center gap-2 text-[13px] font-medium transition-all duration-300 ${
                  showExtremePanel
                    ? "text-red-400/80"
                    : "text-white/25 hover:text-red-400/60"
                }`}
              >
                <span className="text-sm">🔥</span>
                {showExtremePanel ? "Chiudi Modalità Estrema" : "Modalità Estrema"}
              </button>

              {showExtremePanel && (
                <div className="w-full flex flex-col items-center gap-3 animate-fade-in-fast">
                  <ExtremeOptions preferences={extremePrefs} onChange={setExtremePrefs} />
                  <button
                    onClick={() => { setIsExtremeMode(true); setExtremePending(true); }}
                    disabled={isLoading}
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 px-8 py-3.5 text-sm font-bold text-white uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-wait disabled:hover:scale-100"
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
                        💥 Lancia l&apos;avventura estrema 🚀
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {noResultMessage && (
              <div className="animate-fade-in-fast rounded-2xl bg-red-500/[0.08] border border-red-500/15 px-6 py-4 text-center">
                <p className="text-sm text-red-300/80">{noResultMessage}</p>
              </div>
            )}
          </>
        ) : (
          /* ═══ STEP 3: RESULT ═══ */
          <div className="w-full animate-fade-in">
            {isLoading && !result && (
              <div className="flex flex-col items-center gap-6 py-12 animate-fade-in">
                {/* Skeleton card */}
                <div className="w-full max-w-md mx-auto rounded-3xl glass-card overflow-hidden">
                  <div className="h-52 skeleton" />
                  <div className="p-5 space-y-4">
                    <div className="skeleton-text w-3/4 h-5" />
                    <div className="skeleton-text w-full h-16 rounded-2xl" />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="skeleton h-20 rounded-xl" />
                      <div className="skeleton h-20 rounded-xl" />
                      <div className="skeleton h-20 rounded-xl" />
                    </div>
                    <div className="skeleton-text w-full h-12 rounded-2xl" />
                    <div className="skeleton-text w-2/3 h-4" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-white/50 font-medium">
                    {isExtremeMode ? "Genero un'avventura folle..." : "Cerco il posto perfetto..."}
                  </p>
                  <p className="text-[11px] text-white/25 mt-1">L&apos;IA sta esplorando migliaia di posti</p>
                </div>
              </div>
            )}

            {noResultMessage && !isLoading && (
              <div className="flex flex-col items-center gap-4 py-12 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
                  <span className="text-3xl">😕</span>
                </div>
                <p className="text-center text-sm text-white/50 max-w-xs">{noResultMessage}</p>
                <button
                  onClick={handleBackToDetails}
                  className="rounded-full glass px-6 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all"
                >
                  ← Prova con altre opzioni
                </button>
              </div>
            )}

            {result && (
              <>
                <button
                  onClick={showItinerary ? () => setShowItinerary(false) : handleBackToDetails}
                  className="mb-4 flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  {showItinerary ? "Torna alla destinazione" : "Indietro"}
                </button>

                {showItinerary && itinerary ? (
                  <ItineraryView
                    itinerary={itinerary}
                    destinationName={result.destination.name}
                    destinationRegion={result.destination.region || ""}
                    destinationLat={result.destination.lat}
                    destinationLng={result.destination.lng}
                    onBack={() => setShowItinerary(false)}
                    onSave={user ? handleSaveTrip : undefined}
                    onItineraryChange={handleItineraryChange}
                    onUpdateSavedTrip={handleUpdateSavedTrip}
                    isSaving={isSavingTrip}
                    isSaved={tripSaved}
                    savedTripId={savedTripId}
                  />
                ) : (
                  <>
                    {aiUsed !== null && (
                      <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium animate-fade-in-fast ${
                        isExtremeMode
                          ? "glass-subtle text-red-300/70"
                          : aiUsed
                          ? "glass-subtle text-indigo-300/70"
                          : "glass-subtle text-amber-300/70"
                      }`}>
                        <span className="text-sm">{isExtremeMode ? "🔥" : aiUsed ? "✨" : "📦"}</span>
                        <span>
                          {isExtremeMode
                            ? "Avventura estrema generata dall'IA"
                            : aiUsed
                            ? "Trovato dall'IA in base alla tua richiesta"
                            : "Destinazione dal database locale"}
                        </span>
                      </div>
                    )}
                    <DestinationCard
                      result={result} mode={mode}
                      onReset={handleSurprise} onAccept={handleAccept}
                      isGeneratingItinerary={isGeneratingItinerary}
                    />
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center">
          <div className="h-px w-16 mx-auto bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-4" />
          <p className="text-[11px] text-white/[0.12] tracking-wider">WayPoint</p>
        </footer>
      </div>
    </div>
  );
}
