"use client";

import { BikerPreferences, BikerIntent, BikerExperience, BikerRoadType } from "@/lib/types";

interface BikerOptionsProps {
  preferences: BikerPreferences;
  onChange: (prefs: BikerPreferences) => void;
}

const INTENTS: { value: BikerIntent; emoji: string; label: string; sub: string }[] = [
  { value: "curve", emoji: "🛣️", label: "Curve", sub: "Strade tortuose e divertenti" },
  { value: "panorama", emoji: "🏔️", label: "Panorama", sub: "Viste mozzafiato" },
  { value: "aperitivo", emoji: "🍹", label: "Aperitivo", sub: "Posto con locale carino" },
  { value: "pranzo", emoji: "🍝", label: "Pranzo", sub: "Meta con ristorante/trattoria" },
  { value: "tramonto", emoji: "🌅", label: "Tramonto", sub: "Punto panoramico al sunset" },
  { value: "giornata_intera", emoji: "☀️", label: "Giornata", sub: "Tour lungo, più tappe" },
];

const GROUP_OPTIONS: { value: BikerPreferences["groupSize"]; emoji: string; label: string }[] = [
  { value: "solo", emoji: "🏍️", label: "Solo" },
  { value: "coppia", emoji: "❤️", label: "In coppia" },
  { value: "gruppo", emoji: "👥", label: "Gruppo" },
];

const EXPERIENCE_OPTIONS: { value: BikerExperience; emoji: string; label: string; sub: string }[] = [
  { value: "principiante", emoji: "🟢", label: "Principiante", sub: "Strade facili e sicure" },
  { value: "intermedio", emoji: "🟡", label: "Intermedio", sub: "Un po' di tutto" },
  { value: "esperto", emoji: "🔴", label: "Esperto", sub: "Curve strette e passi impegnativi" },
];

const ROAD_TYPE_OPTIONS: { value: BikerRoadType; emoji: string; label: string }[] = [
  { value: "tornanti", emoji: "🔄", label: "Tornanti" },
  { value: "sterrato", emoji: "🪨", label: "Sterrato" },
  { value: "costiera", emoji: "🌊", label: "Costiera" },
  { value: "montagna", emoji: "⛰️", label: "Montagna" },
  { value: "collina", emoji: "🏞️", label: "Collina" },
  { value: "pianura", emoji: "🌾", label: "Pianura" },
];

export default function BikerOptions({ preferences, onChange }: BikerOptionsProps) {
  const update = (partial: Partial<BikerPreferences>) => {
    onChange({ ...preferences, ...partial });
  };

  const toggleRoadType = (road: BikerRoadType) => {
    const current = preferences.roadTypes || [];
    if (current.includes(road)) {
      update({ roadTypes: current.filter((r) => r !== road) });
    } else {
      update({ roadTypes: [...current, road] });
    }
  };

  // Default date to today if empty
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="w-full max-w-sm animate-fade-in space-y-5">
      {/* Section title */}
      <div className="text-center">
        <span className="text-sm font-medium text-orange-400/80 uppercase tracking-wider">
          Personalizza la tua uscita
        </span>
      </div>

      {/* Intent pills */}
      <div>
        <span className="mb-2 block text-xs font-semibold text-white/50 uppercase tracking-wider">
          Cosa vuoi fare?
        </span>
        <div className="grid grid-cols-3 gap-2">
          {INTENTS.map((intent) => (
            <button
              key={intent.value}
              onClick={() => update({ intent: intent.value })}
              className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-3 text-center transition-all duration-200 ${
                preferences.intent === intent.value
                  ? "bg-orange-500/20 border border-orange-500/40 text-white shadow-lg shadow-orange-500/[0.06] scale-105"
                  : "glass-subtle text-white/45 hover:bg-white/[0.06] hover:text-white/65"
              }`}
            >
              <span className="text-xl">{intent.emoji}</span>
              <span className="text-xs font-bold">{intent.label}</span>
              <span className="text-[10px] leading-tight text-white/40">
                {intent.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Experience level */}
      <div>
        <span className="mb-2 block text-xs font-semibold text-white/50 uppercase tracking-wider">
          🎯 Il tuo livello
        </span>
        <div className="grid grid-cols-3 gap-2">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ experience: opt.value })}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 text-center transition-all duration-200 ${
                preferences.experience === opt.value
                  ? "bg-orange-500/20 border border-orange-500/40 text-white shadow-lg shadow-orange-500/[0.06] scale-105"
                  : "glass-subtle text-white/45 hover:bg-white/[0.06] hover:text-white/65"
              }`}
            >
              <span className="text-lg">{opt.emoji}</span>
              <span className="text-xs font-bold">{opt.label}</span>
              <span className="text-[10px] leading-tight text-white/40">{opt.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preferred road types */}
      <div>
        <span className="mb-2 block text-xs font-semibold text-white/50 uppercase tracking-wider">
          🛤️ Tipo di strade preferite <span className="text-white/30 normal-case">(opzionale)</span>
        </span>
        <div className="grid grid-cols-3 gap-2">
          {ROAD_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggleRoadType(opt.value)}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center transition-all duration-200 ${
                (preferences.roadTypes || []).includes(opt.value)
                  ? "bg-orange-500/20 border border-orange-500/40 text-white scale-105"
                  : "glass-subtle text-white/45 hover:bg-white/[0.06] hover:text-white/65"
              }`}
            >
              <span className="text-lg">{opt.emoji}</span>
              <span className="text-[11px] font-bold">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date & Time row */}
      <div className="flex gap-3">
        <div className="flex-1">
          <span className="mb-1.5 block text-xs font-semibold text-white/50 uppercase tracking-wider">
            📅 Giorno
          </span>
          <input
            type="date"
            value={preferences.targetDate || today}
            min={today}
            onChange={(e) => update({ targetDate: e.target.value })}
            className="w-full rounded-xl input-glass px-3 py-2.5 text-sm text-white [color-scheme:dark]"
          />
        </div>
        <div className="flex-1">
          <span className="mb-1.5 block text-xs font-semibold text-white/50 uppercase tracking-wider">
            🕐 Ora partenza
          </span>
          <input
            type="time"
            value={preferences.targetTime || "10:00"}
            onChange={(e) => update({ targetTime: e.target.value })}
            className="w-full rounded-xl input-glass px-3 py-2.5 text-sm text-white [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Group size */}
      <div>
        <span className="mb-2 block text-xs font-semibold text-white/50 uppercase tracking-wider">
          Con chi vai?
        </span>
        <div className="flex gap-2">
          {GROUP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ groupSize: opt.value })}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                preferences.groupSize === opt.value
                  ? "bg-orange-500/20 border border-orange-500/40 text-white"
                  : "glass-subtle text-white/45 hover:bg-white/[0.06]"
              }`}
            >
              <span>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="flex items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={preferences.preferScenic}
            onChange={(e) => update({ preferScenic: e.target.checked })}
            className="peer sr-only"
          />
          <div className="relative h-5 w-9 rounded-full bg-white/[0.08] transition-colors peer-checked:bg-orange-500/50">
            <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-xs text-white/50">🏞️ Preferisci strade panoramiche</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={preferences.avoidHighways}
            onChange={(e) => update({ avoidHighways: e.target.checked })}
            className="peer sr-only"
          />
          <div className="relative h-5 w-9 rounded-full bg-white/[0.08] transition-colors peer-checked:bg-orange-500/50">
            <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-xs text-white/50">🚫 Evita autostrade</span>
        </label>
      </div>

      {/* Free text */}
      <div>
        <span className="mb-1.5 block text-xs font-semibold text-white/50 uppercase tracking-wider">
          ✏️ Richieste particolari <span className="text-white/30 normal-case">(opzionale)</span>
        </span>
        <textarea
          value={preferences.freeText || ""}
          onChange={(e) => update({ freeText: e.target.value })}
          placeholder="Es: vorrei un passo con vista lago, oppure una trattoria con polenta..."
          rows={3}
          maxLength={300}
          className="w-full rounded-xl input-glass px-3 py-2.5 text-sm text-white placeholder-white/25 resize-none"
        />
        <div className="mt-1 text-right text-[10px] text-white/30">
          {(preferences.freeText || "").length}/300
        </div>
      </div>
    </div>
  );
}
