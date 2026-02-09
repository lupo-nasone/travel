"use client";

import {
  TouristPreferences,
  TouristTransport,
  TouristAccommodation,
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
  {
    value: "hotel_lusso",
    emoji: "🏨",
    label: "Hotel / Lusso",
    sub: "Comfort e relax",
  },
  { value: "bnb", emoji: "🏠", label: "B&B", sub: "Accogliente e autentico" },
  {
    value: "campeggio",
    emoji: "⛺",
    label: "Campeggio",
    sub: "Natura e avventura",
  },
  {
    value: "arrangiarsi",
    emoji: "🎒",
    label: "Arrangiarsi",
    sub: "Zaino e spirito libero",
  },
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

const TRIP_DAYS: { value: number; label: string; sub: string }[] = [
  { value: 1, label: "Giornata", sub: "Andata e ritorno" },
  { value: 2, label: "Weekend", sub: "2 giorni" },
  { value: 3, label: "Ponte", sub: "3 giorni" },
  { value: 5, label: "Settimana", sub: "5-7 giorni" },
  { value: 10, label: "Vacanza", sub: "10+ giorni" },
];

export default function TouristOptions({
  preferences,
  onChange,
}: TouristOptionsProps) {
  const update = (partial: Partial<TouristPreferences>) => {
    onChange({ ...preferences, ...partial });
  };

  const today = new Date().toISOString().split("T")[0];

  // Abroad warning logic
  const abroadWarning = (() => {
    if (!preferences.allowAbroad) return null;
    if (preferences.tripDays <= 1 && preferences.transport === "auto") {
      return "⚠️ Per una giornata in auto, l'estero è troppo lontano — ti godrai poco! Prova almeno un weekend.";
    }
    if (
      preferences.tripDays <= 1 &&
      (preferences.transport === "treno" || preferences.transport === "traghetto")
    ) {
      return "⚠️ In giornata con treno/traghetto non riesci ad uscire dall'Italia e goderti qualcosa. Metti almeno 2 giorni!";
    }
    if (preferences.tripDays <= 2 && preferences.transport === "aereo") {
      return "💡 Con l'aereo in 2 giorni si può fare, ma considera che perdi tempo tra aeroporto, check-in, ecc.";
    }
    return null;
  })();

  return (
    <div className="w-full max-w-sm animate-fade-in space-y-5">
      {/* Section title */}
      <div className="text-center">
        <span className="text-sm font-medium uppercase tracking-wider text-emerald-400/80">
          Personalizza il tuo viaggio
        </span>
      </div>

      {/* Transport */}
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
          Come viaggi?
        </span>
        <div className="grid grid-cols-4 gap-2">
          {TRANSPORTS.map((t) => (
            <button
              key={t.value}
              onClick={() => update({ transport: t.value })}
              className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center transition-all duration-200 ${
                preferences.transport === t.value
                  ? "scale-105 border border-emerald-500/50 bg-emerald-500/25 text-white shadow-lg shadow-emerald-500/10"
                  : "border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
              }`}
            >
              <span className="text-xl">{t.emoji}</span>
              <span className="text-xs font-bold">{t.label}</span>
              <span className="text-[10px] leading-tight text-white/40">
                {t.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Accommodation */}
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
          Dove dormi?
        </span>
        <div className="grid grid-cols-2 gap-2">
          {ACCOMMODATIONS.map((a) => (
            <button
              key={a.value}
              onClick={() => update({ accommodation: a.value })}
              className={`flex items-center gap-2.5 rounded-2xl px-3 py-3 text-left transition-all duration-200 ${
                preferences.accommodation === a.value
                  ? "scale-[1.02] border border-emerald-500/50 bg-emerald-500/25 text-white shadow-lg shadow-emerald-500/10"
                  : "border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
              }`}
            >
              <span className="text-xl">{a.emoji}</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold">{a.label}</span>
                <span className="text-[10px] leading-tight text-white/40">
                  {a.sub}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Trip duration */}
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
          Quanto dura il viaggio?
        </span>
        <div className="flex gap-2">
          {TRIP_DAYS.map((d) => (
            <button
              key={d.value}
              onClick={() => update({ tripDays: d.value })}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-center transition-all duration-200 ${
                preferences.tripDays === d.value
                  ? "border border-emerald-500/50 bg-emerald-500/25 text-white"
                  : "border border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              <span className="text-xs font-bold">{d.label}</span>
              <span className="text-[10px] text-white/40">{d.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
          📅 Quando parti?
        </span>
        <input
          type="date"
          value={preferences.targetDate || today}
          min={today}
          onChange={(e) => update({ targetDate: e.target.value })}
          className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition-all focus:border-emerald-500/50 focus:bg-white/15 focus:ring-2 focus:ring-emerald-500/20 [color-scheme:dark]"
        />
      </div>

      {/* Group size */}
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
          Con chi vai?
        </span>
        <div className="grid grid-cols-4 gap-2">
          {GROUP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ groupSize: opt.value })}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-sm font-semibold transition-all duration-200 ${
                preferences.groupSize === opt.value
                  ? "border border-emerald-500/50 bg-emerald-500/25 text-white"
                  : "border border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              <span>{opt.emoji}</span>
              <span className="text-[11px]">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Abroad toggle */}
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={preferences.allowAbroad}
            onChange={(e) => update({ allowAbroad: e.target.checked })}
            className="peer sr-only"
          />
          <div className="relative h-5 w-9 rounded-full bg-white/15 transition-colors peer-checked:bg-emerald-500/60">
            <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm text-white/60">
            🌍 Posso uscire dall&apos;Italia
          </span>
        </label>

        {/* Abroad warning */}
        {abroadWarning && (
          <div className="animate-fade-in rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
            <p className="text-xs leading-relaxed text-amber-300">
              {abroadWarning}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
