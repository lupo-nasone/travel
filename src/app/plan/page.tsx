"use client";

import { useState } from "react";
import { FullItinerary } from "@/lib/types";
import ItineraryView from "@/components/ItineraryView";

export default function PlanPage() {
  const [step, setStep] = useState<"input" | "planning" | "result">("input");
  const [destination, setDestination] = useState("");
  const [tripDays, setTripDays] = useState(3);
  const [transport, setTransport] = useState<"auto" | "treno" | "aereo" | "moto">("auto");
  const [departureFrom, setDepartureFrom] = useState("");
  const [accommodation, setAccommodation] = useState<"hotel" | "bnb" | "campeggio" | "casa_amici">("bnb");
  const [wantsStops, setWantsStops] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [budget, setBudget] = useState<"economico" | "medio" | "comfort" | "lusso">("medio");
  const [startDate, setStartDate] = useState("");
  const [groupSize, setGroupSize] = useState<"solo" | "coppia" | "famiglia" | "gruppo">("coppia");
  const [freeText, setFreeText] = useState("");
  const [itinerary, setItinerary] = useState<FullItinerary | null>(null);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const interestOptions = [
    { value: "natura", emoji: "🌿", label: "Natura" },
    { value: "cultura", emoji: "🏛️", label: "Cultura" },
    { value: "cibo", emoji: "🍕", label: "Cibo" },
    { value: "avventura", emoji: "🏔️", label: "Avventura" },
    { value: "relax", emoji: "☕", label: "Relax" },
    { value: "nightlife", emoji: "🎉", label: "Nightlife" },
    { value: "shopping", emoji: "🛍️", label: "Shopping" },
    { value: "sport", emoji: "⚽", label: "Sport" },
    { value: "fotografia", emoji: "📸", label: "Fotografia" },
    { value: "arte", emoji: "🎨", label: "Arte" },
  ];

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handlePlanTrip = async () => {
    setStep("planning");
    setError("");
    
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          departureFrom,
          startDate,
          tripDays,
          transport,
          accommodation,
          wantsStops,
          interests,
          budget,
          groupSize,
          freeText,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore nella pianificazione");
      }

      const planData = await res.json();
      setItinerary(planData);
      setStep("result");
    } catch (err: any) {
      setError(err.message);
      setStep("input");
    }
  };

  const handleBack = () => {
    setStep("input");
    setItinerary(null);
    setError("");
  };

  if (step === "result" && itinerary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-8">
        <ItineraryView
          itinerary={itinerary}
          destinationName={destination}
          destinationRegion=""
          destinationLat={0}
          destinationLng={0}
          onBack={handleBack}
          isSaved={false}
          budget={budget}
          groupSize={groupSize}
          interests={interests}
        />
      </div>
    );
  }

  if (step === "planning") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <p className="text-white/70 text-lg font-semibold mb-2">Sto pianificando il tuo viaggio...</p>
            <p className="text-white/40 text-sm">Cerco le migliori attività, eventi e luoghi per te</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-4"
          >
            ← Torna alla home
          </a>
          <h1 className="text-4xl font-black text-white mb-2">
            🗺️ Pianifica il tuo viaggio
          </h1>
          <p className="text-white/60 text-sm">
            Sai già dove vuoi andare? Ti aiuto a organizzare tutto!
          </p>
          
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">
          {/* Destination */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
              📍 Dove vuoi andare?
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="es: Roma, Firenze, Cinque Terre, Lago di Como..."
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/15 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Departure */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
              🏠 Da dove parti?
            </label>
            <input
              type="text"
              value={departureFrom}
              onChange={(e) => setDepartureFrom(e.target.value)}
              placeholder="es: Milano, la mia posizione..."
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/15 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Dates + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
                📅 Data di partenza
              </label>
              <input
                type="date"
                value={startDate}
                min={today}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none transition-all focus:border-indigo-500/50 focus:bg-white/15 focus:ring-2 focus:ring-indigo-500/20 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
                📆 Quanti giorni?
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={tripDays}
                onChange={(e) => setTripDays(parseInt(e.target.value) || 1)}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-white outline-none transition-all focus:border-indigo-500/50 focus:bg-white/15 focus:ring-2 focus:ring-indigo-500/20 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Transport */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
              🚗 Come vuoi viaggiare?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: "auto", emoji: "🚗", label: "Auto" },
                { value: "treno", emoji: "🚆", label: "Treno" },
                { value: "aereo", emoji: "✈️", label: "Aereo" },
                { value: "moto", emoji: "🏍️", label: "Moto" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTransport(t.value as any)}
                  className={`flex flex-col items-center gap-1 rounded-xl px-3 py-3 transition-all ${
                    transport === t.value
                      ? "bg-indigo-500/30 border-2 border-indigo-500/50 text-white scale-105"
                      : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10"
                  }`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span className="text-xs font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stops */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={wantsStops}
                onChange={(e) => setWantsStops(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <span className="text-sm text-white/80">
                🛣️ Voglio fare soste lungo il percorso
              </span>
            </label>
          </div>

          {/* Accommodation */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
              🛏️ Dove vuoi dormire?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "hotel", emoji: "🏨", label: "Hotel" },
                { value: "bnb", emoji: "🏡", label: "B&B / Airbnb" },
                { value: "campeggio", emoji: "⛺", label: "Campeggio" },
                { value: "casa_amici", emoji: "🏠", label: "Casa amici/famiglia" },
              ].map((a) => (
                <button
                  key={a.value}
                  onClick={() => setAccommodation(a.value as any)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all ${
                    accommodation === a.value
                      ? "bg-indigo-500/30 border-2 border-indigo-500/50 text-white"
                      : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10"
                  }`}
                >
                  <span className="text-xl">{a.emoji}</span>
                  <span className="text-xs font-semibold">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
              💰 Budget giornaliero
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: "economico", label: "Economico", sub: "€0-50/gg" },
                { value: "medio", label: "Medio", sub: "€50-100/gg" },
                { value: "comfort", label: "Comfort", sub: "€100-200/gg" },
                { value: "lusso", label: "Lusso", sub: "€200+/gg" },
              ].map((b) => (
                <button
                  key={b.value}
                  onClick={() => setBudget(b.value as any)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 transition-all ${
                    budget === b.value
                      ? "bg-indigo-500/30 border-2 border-indigo-500/50 text-white"
                      : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10"
                  }`}
                >
                  <span className="text-xs font-bold">{b.label}</span>
                  <span className="text-[10px] text-white/40">{b.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Group size */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
              👥 Con chi vai?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: "solo", emoji: "🧳", label: "Solo" },
                { value: "coppia", emoji: "❤️", label: "In coppia" },
                { value: "famiglia", emoji: "👨‍👩‍👧‍👦", label: "Famiglia" },
                { value: "gruppo", emoji: "👥", label: "Gruppo" },
              ].map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGroupSize(g.value as any)}
                  className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition-all ${
                    groupSize === g.value
                      ? "bg-indigo-500/30 border-2 border-indigo-500/50 text-white"
                      : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10"
                  }`}
                >
                  <span className="text-lg">{g.emoji}</span>
                  <span className="text-xs font-semibold">{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
              ✨ Cosa ti interessa? (multiplo)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {interestOptions.map((i) => (
                <button
                  key={i.value}
                  onClick={() => toggleInterest(i.value)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    interests.includes(i.value)
                      ? "bg-indigo-500/30 border border-indigo-500/50 text-white"
                      : "bg-white/5 border border-white/10 text-white/45 hover:bg-white/10"
                  }`}
                >
                  <span>{i.emoji}</span>
                  <span>{i.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Free text */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
              ✏️ Note aggiuntive (opzionale)
            </label>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="es: Voglio visitare quel museo specifico, ho bisogno di parcheggio, vorrei evitare autostrade..."
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/15 focus:ring-2 focus:ring-indigo-500/20"
            />
            <div className="mt-1 text-right text-[10px] text-white/25">
              {freeText.length}/500
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handlePlanTrip}
            disabled={!destination.trim() || !startDate}
            className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            🗺️ Pianifica il viaggio
          </button>
        </div>
      </div>
    </div>
  );
}
