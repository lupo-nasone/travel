"use client";

import { useState } from "react";
import {
  TouristPreferences,
  TouristTransport,
  TouristAccommodation,
  TouristBudget,
  TouristInterest,
  TouristPace,
  TouristStyle,
} from "@/lib/types";

interface TouristOptionsProps {
  preferences: TouristPreferences;
  onChange: (prefs: TouristPreferences) => void;
}

const TRANSPORTS: {
  value: TouristTransport;
  emoji: string;
  label: string;
  sub: string;
}[] = [
  { value: "auto", emoji: "🚗", label: "Auto", sub: "Libertà totale" },
  { value: "treno", emoji: "🚆", label: "Treno", sub: "Rilassato e green" },
  { value: "aereo", emoji: "✈️", label: "Aereo", sub: "Per mete lontane" },
  { value: "traghetto", emoji: "⛴️", label: "Traghetto", sub: "Isole e coste" },
];

const ACCOMMODATIONS: {
  value: TouristAccommodation;
  emoji: string;
  label: string;
  sub: string;
}[] = [
  { value: "hotel_lusso", emoji: "🏨", label: "Hotel / Lusso", sub: "Comfort e relax" },
  { value: "bnb", emoji: "🏠", label: "B&B", sub: "Accogliente e autentico" },
  { value: "campeggio", emoji: "⛺", label: "Campeggio", sub: "Natura e avventura" },
  { value: "arrangiarsi", emoji: "🎒", label: "Arrangiarsi", sub: "Zaino e spirito libero" },
];

const BUDGETS: {
  value: TouristBudget;
  emoji: string;
  label: string;
  sub: string;
}[] = [
  { value: "economico", emoji: "💰", label: "Economico", sub: "€0–50/gg" },
  { value: "medio", emoji: "💵", label: "Medio", sub: "€50–100/gg" },
  { value: "comfort", emoji: "💳", label: "Comfort", sub: "€100–200/gg" },
  { value: "lusso", emoji: "💎", label: "Lusso", sub: "€200+/gg" },
];

const INTERESTS: { value: TouristInterest; emoji: string; label: string }[] = [
  { value: "natura", emoji: "🌿", label: "Natura" },
  { value: "cultura", emoji: "🏛️", label: "Cultura" },
  { value: "cibo", emoji: "🍕", label: "Cibo" },
  { value: "avventura", emoji: "🧗", label: "Avventura" },
  { value: "relax", emoji: "🧘", label: "Relax" },
  { value: "nightlife", emoji: "🎶", label: "Nightlife" },
  { value: "shopping", emoji: "🛍️", label: "Shopping" },
  { value: "sport", emoji: "⚽", label: "Sport" },
  { value: "fotografia", emoji: "📸", label: "Fotografia" },
  { value: "arte", emoji: "🎨", label: "Arte" },
];

const PACES: { value: TouristPace; emoji: string; label: string; sub: string }[] = [
  { value: "rilassato", emoji: "🐢", label: "Rilassato", sub: "Con calma, poche tappe" },
  { value: "moderato", emoji: "🚶", label: "Moderato", sub: "Il giusto equilibrio" },
  { value: "intenso", emoji: "⚡", label: "Intenso", sub: "Vedere tutto il possibile" },
];

const STYLES: { value: TouristStyle; emoji: string; label: string }[] = [
  { value: "culturale", emoji: "📖", label: "Culturale" },
  { value: "avventuroso", emoji: "🏕️", label: "Avventuroso" },
  { value: "romantico", emoji: "💕", label: "Romantico" },
  { value: "gourmet", emoji: "🍷", label: "Gourmet" },
  { value: "sportivo", emoji: "🚴", label: "Sportivo" },
  { value: "spirituale", emoji: "🕊️", label: "Spirituale" },
];

const GROUP_OPTIONS: {
  value: TouristPreferences["groupSize"];
  emoji: string;
  label: string;
}[] = [
  { value: "solo", emoji: "🧳", label: "Solo" },
  { value: "coppia", emoji: "❤️", label: "In coppia" },
  { value: "famiglia", emoji: "👨‍👩‍👧‍👦", label: "Famiglia" },
  { value: "gruppo", emoji: "👥", label: "Gruppo" },
];

// ── Italian departure points by transport type ──
const AIRPORTS: { code: string; name: string; city: string }[] = [
  { code: "FCO", name: "Roma Fiumicino", city: "Roma" },
  { code: "CIA", name: "Roma Ciampino", city: "Roma" },
  { code: "MXP", name: "Milano Malpensa", city: "Milano" },
  { code: "BGY", name: "Milano Bergamo", city: "Bergamo" },
  { code: "LIN", name: "Milano Linate", city: "Milano" },
  { code: "NAP", name: "Napoli Capodichino", city: "Napoli" },
  { code: "VCE", name: "Venezia Marco Polo", city: "Venezia" },
  { code: "BLQ", name: "Bologna Marconi", city: "Bologna" },
  { code: "FLR", name: "Firenze Peretola", city: "Firenze" },
  { code: "PSA", name: "Pisa Galilei", city: "Pisa" },
  { code: "CTA", name: "Catania Fontanarossa", city: "Catania" },
  { code: "PMO", name: "Palermo Falcone-Borsellino", city: "Palermo" },
  { code: "CAG", name: "Cagliari Elmas", city: "Cagliari" },
  { code: "OLB", name: "Olbia Costa Smeralda", city: "Olbia" },
  { code: "AHO", name: "Alghero Fertilia", city: "Alghero" },
  { code: "BRI", name: "Bari Palese", city: "Bari" },
  { code: "BDS", name: "Brindisi Casale", city: "Brindisi" },
  { code: "TRN", name: "Torino Caselle", city: "Torino" },
  { code: "GOA", name: "Genova C. Colombo", city: "Genova" },
  { code: "VRN", name: "Verona Villafranca", city: "Verona" },
  { code: "TRS", name: "Trieste Ronchi dei Legionari", city: "Trieste" },
  { code: "TSF", name: "Treviso Canova", city: "Treviso" },
  { code: "SUF", name: "Lamezia Terme", city: "Lamezia Terme" },
  { code: "REG", name: "Reggio Calabria", city: "Reggio Calabria" },
  { code: "PEG", name: "Perugia San Francesco", city: "Perugia" },
  { code: "AOI", name: "Ancona Falconara", city: "Ancona" },
  { code: "TPS", name: "Trapani Birgi", city: "Trapani" },
  { code: "CRV", name: "Crotone", city: "Crotone" },
  { code: "PSR", name: "Pescara Abruzzo", city: "Pescara" },
];

const TRAIN_STATIONS: string[] = [
  "Roma Termini", "Roma Tiburtina", "Milano Centrale", "Milano Rogoredo",
  "Napoli Centrale", "Firenze SMN", "Bologna Centrale", "Torino Porta Nuova",
  "Venezia Santa Lucia", "Venezia Mestre", "Verona Porta Nuova", "Genova Piazza Principe",
  "Genova Brignole", "Padova", "Bari Centrale", "Palermo Centrale",
  "Catania Centrale", "Cagliari", "Trieste Centrale", "Pisa Centrale",
  "Perugia", "Ancona", "Pescara Centrale", "Lecce",
  "Reggio Calabria Centrale", "Salerno", "Brescia", "Bergamo",
  "Parma", "Modena", "Rimini", "Ravenna",
  "Trento", "Bolzano", "Udine", "La Spezia Centrale",
  "Livorno Centrale", "Siena", "Arezzo", "Prato Centrale",
  "Como San Giovanni", "Varese", "Novara", "Alessandria",
];

const PORTS: string[] = [
  "Genova", "Livorno", "Civitavecchia", "Napoli",
  "Salerno", "Palermo", "Catania", "Cagliari",
  "Olbia", "Porto Torres", "Piombino", "Ancona",
  "Bari", "Brindisi", "Venezia", "Trieste",
  "Savona", "La Spezia", "Messina", "Villa San Giovanni",
  "Trapani", "La Maddalena", "Golfo Aranci", "Arbatax",
];

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export default function TouristOptions({
  preferences,
  onChange,
}: TouristOptionsProps) {
  const [departureSearch, setDepartureSearch] = useState("");
  const [showDepartureDropdown, setShowDepartureDropdown] = useState(false);

  const update = (partial: Partial<TouristPreferences>) => {
    onChange({ ...preferences, ...partial });
  };

  const toggleInterest = (interest: TouristInterest) => {
    const current = preferences.interests || [];
    const next = current.includes(interest)
      ? current.filter((i) => i !== interest)
      : [...current, interest];
    update({ interests: next });
  };

  const today = new Date().toISOString().split("T")[0];
  const isPublicTransport = ["treno", "aereo", "traghetto"].includes(preferences.transport);

  // Get departure points based on transport type
  const getDepartureOptions = (): string[] => {
    if (preferences.transport === "aereo") {
      return AIRPORTS.map((a) => `${a.city} — ${a.name} (${a.code})`);
    }
    if (preferences.transport === "treno") {
      return TRAIN_STATIONS;
    }
    if (preferences.transport === "traghetto") {
      return PORTS.map((p) => `Porto di ${p}`);
    }
    return [];
  };

  const departureOptions = getDepartureOptions();
  const filteredDepartures = departureSearch.trim()
    ? departureOptions.filter((d) =>
        d.toLowerCase().includes(departureSearch.toLowerCase())
      )
    : departureOptions;

  // Generate month options: current month + next 11 months
  const getMonthOptions = (): { value: string; label: string }[] => {
    const now = new Date();
    const options: { value: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`;
      options.push({ value, label });
    }
    return options;
  };

  const monthOptions = getMonthOptions();

  // Filter accommodation options based on transport
  const filteredAccommodations = ACCOMMODATIONS.filter((a) => {
    if (a.value === "arrangiarsi" && (preferences.transport === "treno" || preferences.transport === "aereo")) {
      return false;
    }
    return true;
  });

  if (!filteredAccommodations.find((a) => a.value === preferences.accommodation)) {
    update({ accommodation: "bnb" });
  }

  return (
    <div className="w-full max-w-sm animate-fade-in space-y-5">
      {/* Section title */}
      <div className="text-center">
        <span className="text-sm font-medium uppercase tracking-wider text-emerald-400/80">
          Personalizza il tuo viaggio
        </span>
      </div>

      {/* Interests — multi-select */}
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
          ✨ Cosa ti interessa? (scegli più opzioni)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {INTERESTS.map((i) => {
            const selected = (preferences.interests || []).includes(i.value);
            return (
              <button
                key={i.value}
                onClick={() => toggleInterest(i.value)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  selected
                    ? "bg-emerald-500/20 border border-emerald-500/40 text-white shadow-sm"
                    : "chip text-white/40 hover:text-white/60"
                }`}
              >
                <span>{i.emoji}</span>
                <span>{i.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Transport */}
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
          🚗 Come viaggi?
        </span>
        <div className="grid grid-cols-4 gap-2">
          {TRANSPORTS.map((t) => (
            <button
              key={t.value}
              onClick={() => update({ transport: t.value })}
              className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center transition-all duration-200 ${
                preferences.transport === t.value
                  ? "scale-105 border border-emerald-500/40 bg-emerald-500/20 text-white shadow-lg shadow-emerald-500/[0.06]"
                  : "glass-subtle text-white/45 hover:bg-white/[0.06] hover:text-white/65"
              }`}
            >
              <span className="text-xl">{t.emoji}</span>
              <span className="text-xs font-bold">{t.label}</span>
              <span className="text-[10px] leading-tight text-white/40">{t.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accommodation */}
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
          🛏️ Dove dormi?
        </span>
        <div className="grid grid-cols-2 gap-2">
          {filteredAccommodations.map((a) => (
            <button
              key={a.value}
              onClick={() => update({ accommodation: a.value })}
              className={`flex items-center gap-2.5 rounded-2xl px-3 py-3 text-left transition-all duration-200 ${
                preferences.accommodation === a.value
                  ? "scale-[1.02] border border-emerald-500/40 bg-emerald-500/20 text-white shadow-lg shadow-emerald-500/[0.06]"
                  : "glass-subtle text-white/45 hover:bg-white/[0.06] hover:text-white/65"
              }`}
            >
              <span className="text-xl">{a.emoji}</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold">{a.label}</span>
                <span className="text-[10px] leading-tight text-white/40">{a.sub}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
          💰 Quanto vuoi spendere?
        </span>
        <div className="grid grid-cols-4 gap-2">
          {BUDGETS.map((b) => (
            <button
              key={b.value}
              onClick={() => update({ budget: b.value })}
              className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center transition-all duration-200 ${
                preferences.budget === b.value
                  ? "scale-105 border border-emerald-500/40 bg-emerald-500/20 text-white shadow-lg shadow-emerald-500/[0.06]"
                  : "glass-subtle text-white/45 hover:bg-white/[0.06] hover:text-white/65"
              }`}
            >
              <span className="text-xl">{b.emoji}</span>
              <span className="text-xs font-bold">{b.label}</span>
              <span className="text-[10px] leading-tight text-white/40">{b.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pace */}
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
          🏃 Che ritmo vuoi?
        </span>
        <div className="grid grid-cols-3 gap-2">
          {PACES.map((p) => (
            <button
              key={p.value}
              onClick={() => update({ pace: p.value })}
              className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center transition-all duration-200 ${
                preferences.pace === p.value
                  ? "scale-105 border border-emerald-500/40 bg-emerald-500/20 text-white shadow-lg shadow-emerald-500/[0.06]"
                  : "glass-subtle text-white/45 hover:bg-white/[0.06] hover:text-white/65"
              }`}
            >
              <span className="text-xl">{p.emoji}</span>
              <span className="text-xs font-bold">{p.label}</span>
              <span className="text-[10px] leading-tight text-white/40">{p.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Travel Style — optional chips */}
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
          🎭 Stile di viaggio (opzionale)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => update({ travelStyle: preferences.travelStyle === s.value ? undefined : s.value })}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                preferences.travelStyle === s.value
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-white shadow-sm"
                  : "chip text-white/40 hover:text-white/60"
              }`}
            >
              <span>{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Trip duration */}
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
          📆 Quanto dura il viaggio?
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="30"
            value={preferences.tripDays}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 1 && val <= 30) {
                update({ tripDays: val });
              }
            }}
            className="w-20 rounded-xl input-glass px-3 py-2.5 text-center text-sm text-white [color-scheme:dark]"
          />
          <span className="text-xs text-white/60">
            {preferences.tripDays === 1 ? "giorno" : "giorni"}
          </span>
          <span className="text-[10px] text-white/40 ml-auto">
            {preferences.tripDays === 1
              ? "Andata e ritorno"
              : preferences.tripDays <= 2
              ? "Weekend breve"
              : preferences.tripDays <= 4
              ? "Ponte lungo"
              : preferences.tripDays <= 7
              ? "Settimana"
              : "Vacanza lunga"}
          </span>
        </div>
      </div>

      {/* Date type selector */}
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
          📅 Quando parti?
        </span>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => {
              update({ travelMonth: undefined });
            }}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              !preferences.travelMonth
                ? "border border-emerald-500/40 bg-emerald-500/20 text-white"
                : "glass-subtle text-white/45 hover:bg-white/[0.06]"
            }`}
          >
            📅 Giorno preciso
          </button>
          <button
            onClick={() => {
              // Set month to current if not set
              if (!preferences.travelMonth) {
                const now = new Date();
                const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                update({ travelMonth: currentMonth });
              }
            }}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              preferences.travelMonth
                ? "border border-emerald-500/40 bg-emerald-500/20 text-white"
                : "glass-subtle text-white/45 hover:bg-white/[0.06]"
            }`}
          >
            � Solo mese
          </button>
        </div>

        {preferences.travelMonth ? (
          /* Month selector */
          <select
            value={preferences.travelMonth || monthOptions[0]?.value || ""}
            onChange={(e) => update({ travelMonth: e.target.value })}
            className="w-full rounded-xl input-glass px-3 py-2.5 text-sm text-white [color-scheme:dark] appearance-none cursor-pointer"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value} className="bg-slate-900 text-white">
                {m.label}
              </option>
            ))}
          </select>
        ) : (
          /* Exact date */
          <input
            type="date"
            value={preferences.targetDate || today}
            min={today}
            onChange={(e) => update({ targetDate: e.target.value })}
            className="w-full rounded-xl input-glass px-3 py-2.5 text-sm text-white [color-scheme:dark]"
          />
        )}
      </div>

      {/* Group size */}
      <div>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
          👥 Con chi viaggi?
        </span>
        <div className="flex gap-2">
          {GROUP_OPTIONS.map((g) => (
            <button
              key={g.value}
              onClick={() => update({ groupSize: g.value })}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-center transition-all duration-200 ${
                preferences.groupSize === g.value
                  ? "border border-emerald-500/40 bg-emerald-500/20 text-white"
                  : "glass-subtle text-white/45 hover:bg-white/[0.06]"
              }`}
            >
              <span className="text-base">{g.emoji}</span>
              <span className="text-xs font-semibold">{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Departure point — only for public transport */}
      {isPublicTransport && (
        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
            {preferences.transport === "aereo" ? "✈️ Da quale aeroporto parti?" :
             preferences.transport === "treno" ? "🚆 Da quale stazione parti?" :
             "⛴️ Da quale porto parti?"}
          </span>

          {/* Selected departure display */}
          {preferences.departurePoint && !showDepartureDropdown ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2.5 text-sm text-white font-medium">
                {preferences.departurePoint}
              </div>
              <button
                onClick={() => {
                  setShowDepartureDropdown(true);
                  setDepartureSearch("");
                }}
                className="rounded-lg glass-subtle px-3 py-2.5 text-xs text-white/45 hover:bg-white/[0.06] hover:text-white/70 transition-all"
              >
                ✏️
              </button>
            </div>
          ) : (
            /* Search + dropdown */
            <div className="relative">
              <input
                type="text"
                value={departureSearch}
                onChange={(e) => {
                  setDepartureSearch(e.target.value);
                  setShowDepartureDropdown(true);
                }}
                onFocus={() => setShowDepartureDropdown(true)}
                placeholder={
                  preferences.transport === "aereo" ? "Cerca aeroporto (es: Roma, Milano...)" :
                  preferences.transport === "treno" ? "Cerca stazione (es: Firenze, Bologna...)" :
                  "Cerca porto (es: Genova, Livorno...)"
                }
                className="w-full rounded-xl input-glass px-3 py-2.5 text-sm text-white placeholder-white/25"
              />

              {/* Dropdown results */}
              {showDepartureDropdown && (
                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl glass-dropdown shadow-xl">
                  {filteredDepartures.length > 0 ? (
                    filteredDepartures.map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          update({ departurePoint: d });
                          setDepartureSearch("");
                          setShowDepartureDropdown(false);
                        }}
                        className={`w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-emerald-500/15 ${
                          preferences.departurePoint === d
                            ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                            : "text-white/70"
                        }`}
                      >
                        {d}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2.5 text-xs text-white/40 italic">
                      Nessun risultato per &quot;{departureSearch}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Free text — what do you want to do? */}
      <div>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
          ✏️ Cosa vorresti fare? (opzionale)
        </span>
        <textarea
          value={preferences.freeText || ""}
          onChange={(e) => update({ freeText: e.target.value })}
          placeholder="es: Vorrei vedere un borgo medievale con un bel panorama e mangiare bene in una trattoria tipica..."
          maxLength={300}
          rows={3}
          className="w-full resize-none rounded-xl input-glass px-3 py-2.5 text-sm text-white placeholder-white/20"
        />
        <div className="mt-1 text-right text-[10px] text-white/25">
          {(preferences.freeText || "").length}/300
        </div>
      </div>
    </div>
  );
}
