"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  FullItinerary,
  ItineraryActivity,
  ExpandedActivity,
  LocalEvent,
} from "@/lib/types";

// Import dinamico della mappa (solo client-side)
const ItineraryMap = dynamic(() => import("./ItineraryMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <p className="text-2xl mb-2 animate-spin">🗺️</p>
        <p className="text-white/60 text-sm">Caricamento mappa...</p>
      </div>
    </div>
  ),
});

interface ItineraryViewProps {
  itinerary: FullItinerary;
  destinationName: string;
  destinationRegion: string;
  destinationLat: number;
  destinationLng: number;
  onBack: () => void;
  onSave?: () => void;
  onUpdateSavedTrip?: () => void;
  onItineraryChange?: (updated: FullItinerary) => void;
  isSaving?: boolean;
  isSaved?: boolean;
  savedTripId?: string | null;
  // Optional props for replan feature
  budget?: "economico" | "medio" | "comfort" | "lusso";
  groupSize?: "solo" | "coppia" | "famiglia" | "gruppo";
  interests?: string[];
}

// ── Helpers ──

function ActivityIcon({ tipo }: { tipo: ItineraryActivity["tipo"] }) {
  const icons: Record<string, string> = {
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
  return <span className="text-lg">{icons[tipo] || "📍"}</span>;
}

function ActivityColor(tipo: ItineraryActivity["tipo"]): string {
  const colors: Record<string, string> = {
    viaggio: "border-blue-500/30 bg-blue-500/10",
    visita: "border-purple-500/30 bg-purple-500/10",
    cibo: "border-amber-500/30 bg-amber-500/10",
    relax: "border-emerald-500/30 bg-emerald-500/10",
    avventura: "border-red-500/30 bg-red-500/10",
    shopping: "border-pink-500/30 bg-pink-500/10",
    trasporto: "border-sky-500/30 bg-sky-500/10",
    "check-in": "border-teal-500/30 bg-teal-500/10",
    "check-out": "border-orange-500/30 bg-orange-500/10",
    tempo_libero: "border-lime-500/30 bg-lime-500/10",
  };
  return colors[tipo] || "border-white/20 bg-white/5";
}

function TimelineDot({ tipo }: { tipo: ItineraryActivity["tipo"] }) {
  const colors: Record<string, string> = {
    viaggio: "bg-blue-400",
    visita: "bg-purple-400",
    cibo: "bg-amber-400",
    relax: "bg-emerald-400",
    avventura: "bg-red-400",
    shopping: "bg-pink-400",
    trasporto: "bg-sky-400",
    "check-in": "bg-teal-400",
    "check-out": "bg-orange-400",
    tempo_libero: "bg-lime-400",
  };
  return (
    <div
      className={`w-3 h-3 rounded-full shrink-0 ${colors[tipo] || "bg-white/40"} ring-2 ring-black/20 shadow-sm`}
    />
  );
}

function EventIcon(tipo: string): string {
  const icons: Record<string, string> = {
    festival: "🎪",
    mercato: "🛒",
    concerto: "🎵",
    sagra: "🍝",
    mostra: "🎨",
    sport: "⚽",
    teatro: "🎭",
    fiera: "🎡",
    altro: "📌",
  };
  return icons[tipo] || "📌";
}

/** Detect if an activity is vague/generic (e.g. "esplora la zona", "passeggiata") */
function isVagueActivity(act: ItineraryActivity): boolean {
  const vaguePatterns = [
    "esplora", "passeggia", "giro per", "scopri", "visita il centro",
    "tempo libero", "a piacere", "mattinata libera", "pomeriggio libero",
    "serata libera", "relax in zona", "dintorni", "walk around",
    "zona", "in giro", "giretto", "camminata", "a spasso",
  ];
  const text = `${act.attivita} ${act.descrizione}`.toLowerCase();
  return vaguePatterns.some(p => text.includes(p));
}

export default function ItineraryView({
  itinerary: initialItinerary,
  destinationName,
  destinationRegion,
  destinationLat,
  destinationLng,
  onBack,
  onSave,
  onUpdateSavedTrip,
  onItineraryChange,
  isSaving,
  isSaved,
  savedTripId,
  budget = "medio",
  groupSize = "coppia",
  interests = [],
}: ItineraryViewProps) {
  // Local editable copy of the itinerary
  const [localItinerary, setLocalItinerary] = useState<FullItinerary>(
    JSON.parse(JSON.stringify(initialItinerary))
  );
  const [isModified, setIsModified] = useState(false);

  // Editing state
  const [editingActivity, setEditingActivity] = useState<{
    dayIdx: number;
    actIdx: number;
  } | null>(null);
  const [editForm, setEditForm] = useState<{
    attivita: string;
    descrizione: string;
    orario: string;
    luogo: string;
    costo: string;
    tipo: ItineraryActivity["tipo"];
  }>({ attivita: "", descrizione: "", orario: "", luogo: "", costo: "", tipo: "visita" });

  // Expand state
  const [expandingActivity, setExpandingActivity] = useState<{
    dayIdx: number;
    actIdx: number;
  } | null>(null);
  const [isLoadingExpand, setIsLoadingExpand] = useState(false);
  const [expandedOptions, setExpandedOptions] = useState<ExpandedActivity[]>(
    []
  );

  // Events state
  const [showEvents, setShowEvents] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [eventsNota, setEventsNota] = useState<string | null>(null);
  const [eventsDayIdx, setEventsDayIdx] = useState<number | null>(null);

  // Adding activity state
  const [addingAtDay, setAddingAtDay] = useState<number | null>(null);
  const [newActivityForm, setNewActivityForm] = useState({
    attivita: "",
    descrizione: "",
    orario: "",
    luogo: "",
    costo: "",
    tipo: "tempo_libero" as ItineraryActivity["tipo"],
  });

  // Saving update state
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSaved, setUpdateSaved] = useState(false);

  // Replan day state
  const [replanningDay, setReplanningDay] = useState<number | null>(null);
  const [replanRequest, setReplanRequest] = useState("");
  const [isReplanLoading, setIsReplanLoading] = useState(false);

  // View mode state (list or map)
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // ── Update helper ──
  const updateItinerary = useCallback(
    (updated: FullItinerary) => {
      setLocalItinerary(updated);
      setIsModified(true);
      setUpdateSaved(false);
      onItineraryChange?.(updated);
    },
    [onItineraryChange]
  );

  // ── Delete activity ──
  const handleDeleteActivity = useCallback(
    (dayIdx: number, actIdx: number) => {
      const updated = JSON.parse(JSON.stringify(localItinerary)) as FullItinerary;
      updated.giorni[dayIdx].attivita.splice(actIdx, 1);
      updateItinerary(updated);
    },
    [localItinerary, updateItinerary]
  );

  // ── Move activity ──
  const handleMoveActivity = useCallback(
    (dayIdx: number, actIdx: number, direction: "up" | "down") => {
      const updated = JSON.parse(JSON.stringify(localItinerary)) as FullItinerary;
      const acts = updated.giorni[dayIdx].attivita;
      const targetIdx = direction === "up" ? actIdx - 1 : actIdx + 1;
      if (targetIdx < 0 || targetIdx >= acts.length) return;
      [acts[actIdx], acts[targetIdx]] = [acts[targetIdx], acts[actIdx]];
      updateItinerary(updated);
    },
    [localItinerary, updateItinerary]
  );

  // ── Start editing ──
  const handleStartEdit = useCallback(
    (dayIdx: number, actIdx: number) => {
      const act = localItinerary.giorni[dayIdx].attivita[actIdx];
      setEditingActivity({ dayIdx, actIdx });
      setEditForm({
        attivita: act.attivita,
        descrizione: act.descrizione,
        orario: act.orario,
        luogo: act.luogo || "",
        costo: act.costo || "",
        tipo: act.tipo,
      });
      // Close expand if open
      setExpandingActivity(null);
      setExpandedOptions([]);
    },
    [localItinerary]
  );

  // ── Save edit ──
  const handleSaveEdit = useCallback(() => {
    if (!editingActivity) return;
    const { dayIdx, actIdx } = editingActivity;
    const updated = JSON.parse(JSON.stringify(localItinerary)) as FullItinerary;
    const act = updated.giorni[dayIdx].attivita[actIdx];
    act.attivita = editForm.attivita;
    act.descrizione = editForm.descrizione;
    act.orario = editForm.orario;
    act.luogo = editForm.luogo || undefined;
    act.costo = editForm.costo || undefined;
    act.tipo = editForm.tipo;
    updateItinerary(updated);
    setEditingActivity(null);
  }, [editingActivity, editForm, localItinerary, updateItinerary]);

  // ── Add new activity ──
  const handleAddActivity = useCallback(
    (dayIdx: number) => {
      if (!newActivityForm.attivita.trim()) return;
      const updated = JSON.parse(JSON.stringify(localItinerary)) as FullItinerary;
      const newAct: ItineraryActivity = {
        orario: newActivityForm.orario || "—",
        attivita: newActivityForm.attivita,
        descrizione: newActivityForm.descrizione || "",
        luogo: newActivityForm.luogo || undefined,
        costo: newActivityForm.costo || undefined,
        tipo: newActivityForm.tipo,
      };
      // Generate link
      const place = newAct.luogo || newAct.attivita;
      const mapsQuery = encodeURIComponent(`${place}, ${destinationName}`);
      newAct.link = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
      newAct.linkLabel = "📍 Vedi su Maps";

      updated.giorni[dayIdx].attivita.push(newAct);
      updateItinerary(updated);
      setAddingAtDay(null);
      setNewActivityForm({
        attivita: "",
        descrizione: "",
        orario: "",
        luogo: "",
        costo: "",
        tipo: "tempo_libero",
      });
    },
    [localItinerary, newActivityForm, updateItinerary, destinationName]
  );

  // ── Expand/explore activity (AI) ──
  const handleExpand = useCallback(
    async (dayIdx: number, actIdx: number) => {
      const act = localItinerary.giorni[dayIdx].attivita[actIdx];
      const day = localItinerary.giorni[dayIdx];

      setExpandingActivity({ dayIdx, actIdx });
      setExpandedOptions([]);
      setIsLoadingExpand(true);

      try {
        const res = await fetch("/api/itinerary/expand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activity: {
              attivita: act.attivita,
              descrizione: act.descrizione,
              luogo: act.luogo,
              orario: act.orario,
              tipo: act.tipo,
            },
            destinationName,
            destinationRegion,
            destinationLat,
            destinationLng,
            date: day.data,
          }),
        });

        const data = await res.json();
        if (res.ok && data.subActivities) {
          setExpandedOptions(data.subActivities);
        } else {
          alert("Impossibile espandere l'attività. Riprova.");
          setExpandingActivity(null);
        }
      } catch {
        alert("Errore di rete. Riprova.");
        setExpandingActivity(null);
      } finally {
        setIsLoadingExpand(false);
      }
    },
    [localItinerary, destinationName, destinationRegion, destinationLat, destinationLng]
  );

  // ── Accept expanded option (replace original) ──
  const handleAcceptExpanded = useCallback(
    (option: ExpandedActivity) => {
      if (!expandingActivity) return;
      const { dayIdx, actIdx } = expandingActivity;
      const updated = JSON.parse(JSON.stringify(localItinerary)) as FullItinerary;
      updated.giorni[dayIdx].attivita[actIdx] = {
        orario: option.orario,
        attivita: option.attivita,
        descrizione: option.descrizione,
        luogo: option.luogo,
        costo: option.costo,
        tipo: option.tipo,
        link: option.link,
        linkLabel: option.linkLabel,
      };
      updateItinerary(updated);
      setExpandingActivity(null);
      setExpandedOptions([]);
    },
    [expandingActivity, localItinerary, updateItinerary]
  );

  // ── Add expanded as new activity after original ──
  const handleAddExpanded = useCallback(
    (option: ExpandedActivity) => {
      if (!expandingActivity) return;
      const { dayIdx, actIdx } = expandingActivity;
      const updated = JSON.parse(JSON.stringify(localItinerary)) as FullItinerary;
      const newAct: ItineraryActivity = {
        orario: option.orario,
        attivita: option.attivita,
        descrizione: option.descrizione,
        luogo: option.luogo,
        costo: option.costo,
        tipo: option.tipo,
        link: option.link,
        linkLabel: option.linkLabel,
      };
      updated.giorni[dayIdx].attivita.splice(actIdx + 1, 0, newAct);
      updateItinerary(updated);
    },
    [expandingActivity, localItinerary, updateItinerary]
  );

  // ── Fetch events ──
  const handleFetchEvents = useCallback(
    async (dayIdx: number) => {
      const day = localItinerary.giorni[dayIdx];
      setEventsDayIdx(dayIdx);
      setShowEvents(true);
      setIsLoadingEvents(true);
      setEvents([]);

      try {
        const res = await fetch("/api/itinerary/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationName,
            destinationRegion,
            destinationLat,
            destinationLng,
            date: day.data || "",
            tripDays: localItinerary.giorni.length,
          }),
        });

        const data = await res.json();
        if (res.ok && data.events) {
          setEvents(data.events);
          setEventsNota(data.nota || null);
        } else {
          alert("Impossibile trovare eventi. Riprova.");
          setShowEvents(false);
        }
      } catch {
        alert("Errore di rete. Riprova.");
        setShowEvents(false);
      } finally {
        setIsLoadingEvents(false);
      }
    },
    [localItinerary, destinationName, destinationRegion, destinationLat, destinationLng]
  );

  // ── Add event to itinerary ──
  const handleAddEvent = useCallback(
    (event: LocalEvent) => {
      if (eventsDayIdx === null) return;
      const updated = JSON.parse(JSON.stringify(localItinerary)) as FullItinerary;
      const newAct: ItineraryActivity = {
        orario: event.orario || "—",
        attivita: `🎪 ${event.nome}`,
        descrizione: `${event.descrizione}${event.data ? ` | ${event.data}` : ""}`,
        luogo: event.luogo,
        costo: event.costo || "Da verificare",
        tipo: "tempo_libero",
        link: event.link,
        linkLabel: "🔎 Cerca info",
      };
      updated.giorni[eventsDayIdx].attivita.push(newAct);
      updateItinerary(updated);
    },
    [eventsDayIdx, localItinerary, updateItinerary]
  );

  // ── Update saved trip ──
  const handleUpdateSaved = useCallback(async () => {
    if (!savedTripId) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/trips", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: savedTripId,
          itinerary_data: localItinerary,
        }),
      });
      if (res.ok) {
        setIsModified(false);
        setUpdateSaved(true);
        onUpdateSavedTrip?.();
      } else {
        const data = await res.json();
        alert(data.error || "Errore nell'aggiornamento");
      }
    } catch {
      alert("Errore di rete nell'aggiornamento");
    } finally {
      setIsUpdating(false);
    }
  }, [savedTripId, localItinerary, onUpdateSavedTrip]);

  // ── Replan day (AI) ──
  const handleReplanDay = useCallback(
    async (dayIdx: number) => {
      if (!replanRequest.trim()) {
        alert("Descrivi come vuoi modificare il giorno!");
        return;
      }

      setIsReplanLoading(true);
      try {
        const day = localItinerary.giorni[dayIdx];
        
        const res = await fetch("/api/replan-day", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: destinationName,
            dayNumber: day.giorno,
            currentDate: day.data,
            currentActivities: day.attivita,
            userRequest: replanRequest,
            budget: budget,
            groupSize: groupSize,
            interests: interests,
          }),
        });

        if (!res.ok) {
          throw new Error("Errore nella rigenerazione del giorno");
        }

        const newDayData = await res.json();
        
        // Update the day in the itinerary
        const updated = JSON.parse(JSON.stringify(localItinerary)) as FullItinerary;
        updated.giorni[dayIdx] = {
          ...updated.giorni[dayIdx],
          titolo: newDayData.titolo || updated.giorni[dayIdx].titolo,
          attivita: newDayData.attivita || [],
          consiglioGiorno: newDayData.consiglioGiorno || updated.giorni[dayIdx].consiglioGiorno,
        };

        updateItinerary(updated);
        setReplanningDay(null);
        setReplanRequest("");
      } catch (error: any) {
        alert(error.message || "Errore nella rigenerazione del giorno");
      } finally {
        setIsReplanLoading(false);
      }
    },
    [replanRequest, localItinerary, destinationName, updateItinerary]
  );

  // Close handler
  const handleCloseReplan = useCallback(() => {
    setReplanningDay(null);
    setReplanRequest("");
  }, []);

  const tipoOptions: { value: ItineraryActivity["tipo"]; label: string }[] = [
    { value: "visita", label: "🏛️ Visita" },
    { value: "cibo", label: "🍽️ Cibo" },
    { value: "avventura", label: "🏔️ Avventura" },
    { value: "relax", label: "☕ Relax" },
    { value: "shopping", label: "🛍️ Shopping" },
    { value: "tempo_libero", label: "🌿 Tempo libero" },
    { value: "trasporto", label: "🚆 Trasporto" },
    { value: "viaggio", label: "🚗 Viaggio" },
    { value: "check-in", label: "🏨 Check-in" },
    { value: "check-out", label: "🧳 Check-out" },
  ];

  return (
    <div className="w-full max-w-md mx-auto animate-card-appear">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-pink-600/20 border border-indigo-500/30 backdrop-blur-xl shadow-2xl mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-pink-500/5" />
        <div className="relative p-6 text-center">
          <span className="text-4xl mb-3 block">📋</span>
          <h2 className="text-2xl font-black text-white mb-1">
            Il tuo itinerario
          </h2>
          <p className="text-sm text-white/60 mb-3">
            {destinationName} — {localItinerary.giorni.length} giorn
            {localItinerary.giorni.length === 1 ? "o" : "i"}
          </p>
          <p className="text-sm text-white/80 leading-relaxed italic">
            &ldquo;{localItinerary.riepilogo}&rdquo;
          </p>
          {isModified && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
              ✏️ Modificato
            </div>
          )}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="mb-4 flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 p-2">
        <button
          onClick={() => setViewMode("list")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            viewMode === "list"
              ? "bg-indigo-500 text-white shadow-lg"
              : "text-white/60 hover:text-white/80 hover:bg-white/5"
          }`}
        >
          <span className="text-base">📋</span>
          <span>Lista Attività</span>
        </button>
        <button
          onClick={() => setViewMode("map")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            viewMode === "map"
              ? "bg-emerald-500 text-white shadow-lg"
              : "text-white/60 hover:text-white/80 hover:bg-white/5"
          }`}
        >
          <span className="text-base">🗺️</span>
          <span>Vista Mappa</span>
        </button>
      </div>

      {/* Map View */}
      {viewMode === "map" && (
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ height: "600px" }}>
          <ItineraryMap
            itinerary={localItinerary}
            destinationName={destinationName}
            destinationLat={destinationLat}
            destinationLng={destinationLng}
          />
        </div>
      )}

      {/* List View - Viaggio Andata */}
      {viewMode === "list" && localItinerary.viaggioAndata && (
        <div className="mb-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-sky-500/10 border border-blue-500/20 p-4">
          <p className="text-xs font-bold text-blue-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <span className="text-base">🚀</span> Viaggio di andata
          </p>
          <div className="space-y-1.5">
            <p className="text-sm text-white/90 font-medium">
              {localItinerary.viaggioAndata.partenza}
            </p>
            <p className="text-sm text-white/70">
              {localItinerary.viaggioAndata.mezzo}
            </p>
            <p className="text-sm text-white/90 font-medium">
              {localItinerary.viaggioAndata.arrivo}
            </p>
            {localItinerary.viaggioAndata.note && (
              <p className="text-xs text-white/50 italic mt-1">
                💡 {localItinerary.viaggioAndata.note}
              </p>
            )}
          </div>
        </div>
      )}

      {/* List View - Days */}
      {viewMode === "list" && localItinerary.giorni.map((day, dayIdx) => (
        <div
          key={day.giorno}
          className="mb-6 rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
        >
          {/* Day Header */}
          <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-b border-white/10 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  Giorno {day.giorno}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {day.titolo}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {day.data && (
                  <span className="text-xs text-white/40 bg-white/10 rounded-full px-3 py-1">
                    {day.data}
                  </span>
                )}
                {/* Replan day button */}
                <button
                  onClick={() => setReplanningDay(dayIdx)}
                  className="text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full px-3 py-1 hover:bg-indigo-500/30 transition-all hover:scale-105 active:scale-95"
                  title="Rischedula questo giorno"
                >
                  🔄 Rischedula
                </button>
                {/* Events button */}
                <button
                  onClick={() => handleFetchEvents(dayIdx)}
                  className="text-xs bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full px-3 py-1 hover:bg-purple-500/30 transition-all hover:scale-105 active:scale-95"
                  title="Cerca eventi"
                >
                  🎪 Eventi
                </button>
              </div>
            </div>
          </div>

          {/* Activities Timeline */}
          <div className="p-4 space-y-0">
            {day.attivita.map((act, actIdx) => {
              const isExpanding =
                expandingActivity?.dayIdx === dayIdx &&
                expandingActivity?.actIdx === actIdx;

              return (
                <div key={actIdx}>
                  <div className="flex gap-3">
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center pt-3">
                      <TimelineDot tipo={act.tipo} />
                      {actIdx < day.attivita.length - 1 && (
                        <div className="w-px flex-1 bg-white/10 min-h-[24px]" />
                      )}
                    </div>

                    {/* Activity Card */}
                    <div
                      className={`flex-1 rounded-xl border p-3 mb-2 ${ActivityColor(act.tipo)} group relative`}
                    >
                      {/* ── VIEW MODE ── */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ActivityIcon tipo={act.tipo} />
                          <div>
                            <p className="text-sm font-bold text-white/90">
                                  {act.attivita}
                                </p>
                                <p className="text-[11px] text-white/50 font-mono">
                                  {act.orario}
                                </p>
                              </div>
                            </div>
                            {act.costo && (
                              <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/15 rounded-full px-2 py-0.5 shrink-0">
                                {act.costo}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/60 leading-relaxed mt-1.5">
                            {act.descrizione}
                          </p>
                          {act.luogo && (
                            <p className="text-[11px] text-white/40 mt-1 flex items-center gap-1">
                              <span>📍</span> {act.luogo}
                            </p>
                          )}
                          {act.link && (
                            <a
                              href={
                                act.link.startsWith("http")
                                  ? act.link
                                  : `https://${act.link}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-500/15 border border-sky-500/25 px-3 py-1.5 text-[11px] font-semibold text-sky-300 transition-all hover:bg-sky-500/25 hover:text-sky-200 hover:scale-[1.03] active:scale-95"
                            >
                              {act.linkLabel || "📍 Apri link"}
                            </a>
                          )}

                          {/* Action buttons */}
                          <div className="mt-2 flex flex-wrap gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStartEdit(dayIdx, actIdx)}
                              className="rounded-lg bg-white/10 px-2 py-1 text-[10px] text-white/70 hover:bg-white/20 hover:text-white transition-all"
                              title="Modifica"
                            >
                              ✏️ Modifica
                            </button>
                            <button
                              onClick={() => handleExpand(dayIdx, actIdx)}
                              className="rounded-lg bg-indigo-500/15 px-2 py-1 text-[10px] text-indigo-300 hover:bg-indigo-500/25 transition-all"
                              title={isVagueActivity(act) ? "Cosa fare qui?" : "Esplora alternative"}
                            >
                              {isVagueActivity(act) ? "💡 Cosa fare qui?" : "🔍 Alternative"}
                            </button>
                            <button
                              onClick={() =>
                                handleMoveActivity(dayIdx, actIdx, "up")
                              }
                              disabled={actIdx === 0}
                              className="rounded-lg bg-white/10 px-2 py-1 text-[10px] text-white/70 hover:bg-white/20 transition-all disabled:opacity-30"
                              title="Sposta su"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() =>
                                handleMoveActivity(dayIdx, actIdx, "down")
                              }
                              disabled={actIdx === day.attivita.length - 1}
                              className="rounded-lg bg-white/10 px-2 py-1 text-[10px] text-white/70 hover:bg-white/20 transition-all disabled:opacity-30"
                              title="Sposta giù"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteActivity(dayIdx, actIdx)
                              }
                              className="rounded-lg bg-red-500/15 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/25 transition-all"
                              title="Elimina"
                            >
                              🗑️
                            </button>
                          </div>
                    </div>
                  </div>

                  {/* ── Expanded options panel ── */}
                  {isExpanding && (
                    <div className="ml-6 mb-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/25 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                          {isVagueActivity(act)
                            ? `� Cosa fare a ${act.luogo || destinationName}`
                            : `�🔍 Alternative per "${act.attivita}"`}
                        </p>
                        <button
                          onClick={() => {
                            setExpandingActivity(null);
                            setExpandedOptions([]);
                          }}
                          className="text-xs text-white/40 hover:text-white/70"
                        >
                          ✕
                        </button>
                      </div>

                      {isLoadingExpand ? (
                        <div className="flex items-center justify-center gap-2 py-6">
                          <svg
                            className="animate-spin h-5 w-5 text-indigo-400"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          <span className="text-sm text-indigo-300">
                            {isVagueActivity(act) ? "Cerco cose da fare nella zona..." : "Cerco alternative simili..."}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {expandedOptions.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`rounded-xl border p-3 ${ActivityColor(opt.tipo)}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <ActivityIcon tipo={opt.tipo} />
                                  <div>
                                    <p className="text-sm font-bold text-white/90">
                                      {opt.attivita}
                                    </p>
                                    {opt.costo && (
                                      <span className="text-[10px] text-emerald-300">
                                        {opt.costo}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-white/60 leading-relaxed mt-1">
                                {opt.descrizione}
                              </p>
                              {opt.luogo && (
                                <p className="text-[11px] text-white/40 mt-1">
                                  📍 {opt.luogo}
                                </p>
                              )}
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleAcceptExpanded(opt)}
                                  className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-all"
                                >
                                  ✅ Sostituisci
                                </button>
                                <button
                                  onClick={() => handleAddExpanded(opt)}
                                  className="rounded-lg bg-blue-500/20 border border-blue-500/30 px-3 py-1 text-[10px] font-semibold text-blue-300 hover:bg-blue-500/30 transition-all"
                                >
                                  ➕ Aggiungi
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add activity button */}
            {addingAtDay === dayIdx ? (
              <div className="ml-6 mt-3 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border-2 border-emerald-500/30 p-5 space-y-3 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                    ➕ Nuova attività
                  </p>
                  <button
                    onClick={() => setAddingAtDay(null)}
                    className="rounded-full bg-white/10 hover:bg-white/20 w-6 h-6 flex items-center justify-center text-white/60 hover:text-white text-xs transition-all"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-3">
                  {/* Nome */}
                  <div>
                    <label className="block text-[10px] font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
                      Nome attività *
                    </label>
                    <input
                      value={newActivityForm.attivita}
                      onChange={(e) =>
                        setNewActivityForm((f) => ({
                          ...f,
                          attivita: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg bg-black/30 border border-white/20 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="Es: Visita al Colosseo"
                      autoFocus
                    />
                  </div>

                  {/* Tipo + Orario */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
                        Tipo
                      </label>
                      <select
                        value={newActivityForm.tipo}
                        onChange={(e) =>
                          setNewActivityForm((f) => ({
                            ...f,
                            tipo: e.target.value as ItineraryActivity["tipo"],
                          }))
                        }
                        className="w-full rounded-lg bg-black/30 border border-white/20 px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        {tipoOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
                        Orario
                      </label>
                      <input
                        value={newActivityForm.orario}
                        onChange={(e) =>
                          setNewActivityForm((f) => ({
                            ...f,
                            orario: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg bg-black/30 border border-white/20 px-3 py-2.5 text-xs text-white/70 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="09:00 - 11:00"
                      />
                    </div>
                  </div>

                  {/* Descrizione */}
                  <div>
                    <label className="block text-[10px] font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
                      Descrizione
                    </label>
                    <textarea
                      value={newActivityForm.descrizione}
                      onChange={(e) =>
                        setNewActivityForm((f) => ({
                          ...f,
                          descrizione: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg bg-black/30 border border-white/20 px-3 py-2.5 text-xs text-white/70 placeholder:text-white/30 min-h-[60px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="Dettagli dell'attività..."
                    />
                  </div>

                  {/* Luogo + Costo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
                        Luogo
                      </label>
                      <input
                        value={newActivityForm.luogo}
                        onChange={(e) =>
                          setNewActivityForm((f) => ({
                            ...f,
                            luogo: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg bg-black/30 border border-white/20 px-3 py-2.5 text-xs text-white/70 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="Indirizzo..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
                        Costo
                      </label>
                      <input
                        value={newActivityForm.costo}
                        onChange={(e) =>
                          setNewActivityForm((f) => ({
                            ...f,
                            costo: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg bg-black/30 border border-white/20 px-3 py-2.5 text-xs text-white/70 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="€15 o Gratis"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleAddActivity(dayIdx)}
                  disabled={!newActivityForm.attivita.trim()}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border border-emerald-500/40 text-emerald-200 py-3 text-sm font-bold hover:from-emerald-500/40 hover:to-teal-500/40 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ✅ Aggiungi attività
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingAtDay(dayIdx)}
                className="ml-6 mt-3 w-[calc(100%-24px)] rounded-xl border-2 border-dashed border-emerald-500/20 bg-emerald-500/5 py-3 text-sm font-semibold text-emerald-300/60 hover:text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2"
              >
                <span className="text-lg">➕</span> Aggiungi attività
              </button>
            )}
          </div>

          {/* Daily tip */}
          {day.consiglioGiorno && (
            <div className="mx-4 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
              <p className="text-xs text-amber-200/80">
                <span className="font-bold">💡 Tip:</span>{" "}
                {day.consiglioGiorno}
              </p>
            </div>
          )}
        </div>
      ))}

      {/* ── Events Modal ── */}
      {showEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-3xl bg-slate-900 border border-purple-500/30 shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-b border-purple-500/20 px-5 py-4 rounded-t-3xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                    🎪 Eventi e attività speciali
                  </p>
                  <p className="text-sm text-white/60 mt-0.5">
                    {destinationName}
                    {eventsDayIdx !== null &&
                      localItinerary.giorni[eventsDayIdx]?.data &&
                      ` — ${localItinerary.giorni[eventsDayIdx].data}`}
                  </p>
                </div>
                <button
                  onClick={() => setShowEvents(false)}
                  className="rounded-full bg-white/10 p-2 text-white/60 hover:bg-white/20 hover:text-white transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4">
              {isLoadingEvents ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <svg
                    className="animate-spin h-8 w-8 text-purple-400"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span className="text-sm text-purple-300">
                    Cerco eventi nella zona...
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((evt, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-white/5 border border-white/10 p-3"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xl mt-0.5">
                          {EventIcon(evt.tipo)}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white/90">
                            {evt.nome}
                          </p>
                          <p className="text-[11px] text-purple-300/80 mt-0.5">
                            {evt.data}
                            {evt.orario && ` • ${evt.orario}`}
                          </p>
                          <p className="text-xs text-white/60 leading-relaxed mt-1">
                            {evt.descrizione}
                          </p>
                          <p className="text-[11px] text-white/40 mt-1">
                            📍 {evt.luogo}
                          </p>
                          {evt.costo && (
                            <p className="text-[11px] text-emerald-300 mt-0.5">
                              💰 {evt.costo}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleAddEvent(evt)}
                              className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-all"
                            >
                              ➕ Aggiungi al piano
                            </button>
                            {evt.link && (
                              <a
                                href={evt.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg bg-sky-500/15 border border-sky-500/25 px-3 py-1 text-[10px] font-semibold text-sky-300 hover:bg-sky-500/25 transition-all"
                              >
                                🔎 Info
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {eventsNota && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 mt-3">
                      <p className="text-xs text-amber-200/80">
                        <span className="font-bold">💡</span> {eventsNota}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* List View - Viaggio Ritorno */}
      {viewMode === "list" && localItinerary.viaggioRitorno && (
        <div className="mb-4 rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 p-4">
          <p className="text-xs font-bold text-orange-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <span className="text-base">🏠</span> Viaggio di ritorno
          </p>
          <div className="space-y-1.5">
            <p className="text-sm text-white/90 font-medium">
              {localItinerary.viaggioRitorno.partenza}
            </p>
            <p className="text-sm text-white/70">
              {localItinerary.viaggioRitorno.mezzo}
            </p>
            <p className="text-sm text-white/90 font-medium">
              {localItinerary.viaggioRitorno.arrivo}
            </p>
            {localItinerary.viaggioRitorno.note && (
              <p className="text-xs text-white/50 italic mt-1">
                💡 {localItinerary.viaggioRitorno.note}
              </p>
            )}
          </div>
        </div>
      )}

      {/* List View - Cosa da portare */}
      {viewMode === "list" && localItinerary.cosaDaPortare && localItinerary.cosaDaPortare.length > 0 && (
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 p-4">
          <p className="text-xs font-bold text-teal-300 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <span className="text-base">🎒</span> Cosa portare
          </p>
          <div className="grid grid-cols-2 gap-2">
            {localItinerary.cosaDaPortare.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70"
              >
                <span className="text-emerald-400">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View - Consigli generali */}
      {viewMode === "list" && localItinerary.consigliGenerali && (
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 p-4">
          <p className="text-xs font-bold text-violet-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <span className="text-base">📝</span> Consigli utili
          </p>
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
            {localItinerary.consigliGenerali}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pb-4">
        {/* Save new trip button */}
        {onSave && !isSaved && !isModified && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 px-6 py-4 text-sm font-semibold text-indigo-200 transition-all hover:from-indigo-500/30 hover:to-purple-500/30 hover:text-white hover:scale-[1.02] active:scale-95 disabled:hover:scale-100"
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Salvo...
              </>
            ) : (
              <>💾 Salva viaggio</>
            )}
          </button>
        )}

        {/* Already saved indicator (no modifications) */}
        {isSaved && !isModified && !updateSaved && (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 px-6 py-4 text-sm font-semibold text-emerald-300">
            ✅ Viaggio salvato!
          </div>
        )}

        {/* Update saved indicator */}
        {updateSaved && !isModified && (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 px-6 py-4 text-sm font-semibold text-emerald-300">
            ✅ Modifiche salvate!
          </div>
        )}

        {/* Update saved trip button (when modified + has savedTripId) */}
        {isModified && savedTripId && (
          <button
            onClick={handleUpdateSaved}
            disabled={isUpdating}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 px-6 py-4 text-sm font-semibold text-amber-200 transition-all hover:from-amber-500/30 hover:to-orange-500/30 hover:text-white hover:scale-[1.02] active:scale-95 disabled:hover:scale-100"
          >
            {isUpdating ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Aggiorno...
              </>
            ) : (
              <>💾 Aggiorna viaggio salvato</>
            )}
          </button>
        )}

        {/* Save modified itinerary as new (modified + not saved yet) */}
        {isModified && onSave && !savedTripId && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 px-6 py-4 text-sm font-semibold text-amber-200 transition-all hover:from-amber-500/30 hover:to-orange-500/30 hover:text-white hover:scale-[1.02] active:scale-95 disabled:hover:scale-100"
          >
            {isSaving ? "Salvo..." : "💾 Salva itinerario modificato"}
          </button>
        )}

        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/20 px-6 py-4 text-sm font-semibold text-white/70 transition-all hover:bg-white/20 hover:text-white hover:scale-[1.02] active:scale-95"
        >
          ← Torna alla destinazione
        </button>
      </div>

      {/* EDIT MODAL */}
      {editingActivity && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditingActivity(null)}
        >
          <div
            className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-white/20 rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                ✏️ Modifica attività
              </h3>
              <button
                onClick={() => setEditingActivity(null)}
                className="rounded-full bg-white/10 hover:bg-white/20 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
                  Nome attività
                </label>
                <input
                  value={editForm.attivita}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, attivita: e.target.value }))
                  }
                  className="w-full rounded-xl bg-black/30 border border-white/20 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Es: Colosseo"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
                  Tipo
                </label>
                <select
                  value={editForm.tipo}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      tipo: e.target.value as ItineraryActivity["tipo"],
                    }))
                  }
                  className="w-full rounded-xl bg-black/30 border border-white/20 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  {tipoOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Orario */}
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
                  Orario
                </label>
                <input
                  value={editForm.orario}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, orario: e.target.value }))
                  }
                  className="w-full rounded-xl bg-black/30 border border-white/20 px-4 py-3 text-sm text-white/70 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Es: 09:00 - 11:30"
                />
              </div>

              {/* Descrizione */}
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
                  Descrizione
                </label>
                <textarea
                  value={editForm.descrizione}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, descrizione: e.target.value }))
                  }
                  className="w-full rounded-xl bg-black/30 border border-white/20 px-4 py-3 text-sm text-white/70 placeholder:text-white/30 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Dettagli..."
                />
              </div>

              {/* Luogo */}
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
                  Luogo
                </label>
                <input
                  value={editForm.luogo}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, luogo: e.target.value }))
                  }
                  className="w-full rounded-xl bg-black/30 border border-white/20 px-4 py-3 text-sm text-white/70 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Es: Piazza del Colosseo, 1"
                />
              </div>

              {/* Costo */}
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
                  Costo
                </label>
                <input
                  value={editForm.costo}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, costo: e.target.value }))
                  }
                  className="w-full rounded-xl bg-black/30 border border-white/20 px-4 py-3 text-sm text-white/70 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Es: €15 o Gratis"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingActivity(null)}
                className="flex-1 rounded-xl bg-white/10 border border-white/20 text-white/70 py-3 text-sm font-semibold hover:bg-white/20 hover:text-white transition-all"
              >
                ✕ Annulla
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border border-emerald-500/40 text-emerald-200 py-3 text-sm font-semibold hover:from-emerald-500/40 hover:to-teal-500/40 hover:text-white transition-all"
              >
                ✅ Salva modifiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REPLAN DAY MODAL ── */}
      {replanningDay !== null && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleCloseReplan}
        >
          <div
            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/20 rounded-3xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-white mb-2">
              🔄 Rischedula Giorno {localItinerary.giorni[replanningDay].giorno}
            </h3>
            <p className="text-sm text-white/50 mb-6">
              {localItinerary.giorni[replanningDay].titolo} • {localItinerary.giorni[replanningDay].data}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-white/70 mb-3">
                Come vuoi modificare questo giorno?
              </label>
              <textarea
                value={replanRequest}
                onChange={(e) => setReplanRequest(e.target.value)}
                placeholder="Es: Voglio una giornata più festaiola con bar e locali notturni, oppure Più relax e meno attività, o Aggiungi più attività culturali come musei"
                rows={5}
                className="w-full rounded-xl bg-black/30 border border-white/20 px-4 py-3 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
              />
              <p className="text-xs text-white/40 mt-2">
                💡 Suggerimenti: &quot;più festaiolo&quot;, &quot;più relax&quot;, &quot;più culturale&quot;, &quot;più cibo&quot;, &quot;meno pieno&quot;, &quot;più avventura&quot;
              </p>
            </div>

            {/* Quick suggestions */}
            <div className="mb-6">
              <p className="text-xs text-white/50 mb-2">Suggerimenti rapidi:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Più festaiolo con locali notturni",
                  "Più relax e tranquillità",
                  "Più culturale con musei",
                  "Più cibo e degustazioni",
                  "Meno attività, più tempo libero",
                  "Più avventura e sport",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setReplanRequest(suggestion)}
                    className="text-xs bg-white/10 border border-white/20 text-white/70 rounded-full px-3 py-1.5 hover:bg-white/20 hover:text-white transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCloseReplan}
                disabled={isReplanLoading}
                className="flex-1 rounded-xl bg-white/10 border border-white/20 text-white/70 py-3 text-sm font-semibold hover:bg-white/20 hover:text-white transition-all disabled:opacity-50"
              >
                ✕ Annulla
              </button>
              <button
                onClick={() => handleReplanDay(replanningDay)}
                disabled={isReplanLoading || !replanRequest.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500/30 to-purple-500/30 border border-indigo-500/40 text-indigo-200 py-3 text-sm font-semibold hover:from-indigo-500/40 hover:to-purple-500/40 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReplanLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> Rigenerazione...
                  </span>
                ) : (
                  "🔄 Rigenera Giorno"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
