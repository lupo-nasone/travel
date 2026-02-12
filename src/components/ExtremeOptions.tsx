"use client";

import { ExtremePreferences, ExtremeTransport, ExtremeBudget, ExtremeAccommodation, ExtremeRiskLevel } from "@/lib/types";

interface ExtremeOptionsProps {
  preferences: ExtremePreferences;
  onChange: (prefs: ExtremePreferences) => void;
}

export default function ExtremeOptions({ preferences, onChange }: ExtremeOptionsProps) {
  const update = (partial: Partial<ExtremePreferences>) => {
    onChange({ ...preferences, ...partial });
  };

  // ── Transport options ──
  const transportOptions: { value: ExtremeTransport; emoji: string; label: string }[] = [
    { value: "auto", emoji: "🚗", label: "Auto" },
    { value: "moto", emoji: "🏍️", label: "Moto" },
    { value: "treno", emoji: "🚂", label: "Treno" },
    { value: "aereo", emoji: "✈️", label: "Aereo" },
    { value: "traghetto", emoji: "⛴️", label: "Traghetto" },
    { value: "bici", emoji: "🚴", label: "Bicicletta" },
    { value: "autostop", emoji: "👍", label: "Autostop" },
    { value: "piedi", emoji: "🥾", label: "A piedi" },
    { value: "qualsiasi", emoji: "🎲", label: "Qualsiasi" },
  ];

  // ── Budget options ──
  const budgetOptions: { value: ExtremeBudget; emoji: string; label: string }[] = [
    { value: "zero", emoji: "🆓", label: "€0 Gratis" },
    { value: "50", emoji: "💸", label: "~€50" },
    { value: "100", emoji: "💵", label: "~€100" },
    { value: "200", emoji: "💰", label: "~€200" },
    { value: "500", emoji: "🤑", label: "~€500" },
    { value: "1000", emoji: "💎", label: "€1000+" },
    { value: "illimitato", emoji: "♾️", label: "Illimitato" },
  ];

  // ── Accommodation options ──
  const accommodationOptions: { value: ExtremeAccommodation; emoji: string; label: string }[] = [
    { value: "tenda", emoji: "⛺", label: "Tenda" },
    { value: "sacco_a_pelo", emoji: "🛏️", label: "Sacco a pelo" },
    { value: "bivacco", emoji: "🏔️", label: "Bivacco" },
    { value: "macchina", emoji: "🚗", label: "In macchina" },
    { value: "ostello", emoji: "🏠", label: "Ostello" },
    { value: "hotel", emoji: "🏨", label: "Hotel" },
    { value: "qualsiasi", emoji: "🎲", label: "Qualsiasi" },
  ];

  // ── Risk level options ──
  const riskOptions: { value: ExtremeRiskLevel; emoji: string; label: string; desc: string }[] = [
    { value: "soft", emoji: "😊", label: "Soft", desc: "Un po' folle ma tranquillo" },
    { value: "medio", emoji: "😈", label: "Medio", desc: "Ci vuole coraggio" },
    { value: "hardcore", emoji: "💀", label: "Hardcore", desc: "Solo per pazzi veri" },
    { value: "suicida", emoji: "☠️", label: "Suicida", desc: "Follia totale (legale)" },
  ];

  // ── Companions ──
  const companionOptions: { value: "solo" | "coppia" | "gruppo" | "chiunque"; emoji: string; label: string }[] = [
    { value: "solo", emoji: "🧍", label: "Solo" },
    { value: "coppia", emoji: "👫", label: "In coppia" },
    { value: "gruppo", emoji: "👥", label: "Gruppo" },
    { value: "chiunque", emoji: "🎭", label: "Chiunque" },
  ];

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="w-full animate-fade-in rounded-2xl glass border-red-500/20 p-5">
      <h3 className="mb-4 text-center text-sm font-bold text-red-300/80 flex items-center justify-center gap-2">
        <span className="text-lg">🔥</span>
        Opzioni Modalità Estrema
        <span className="text-lg">🔥</span>
      </h3>

      {/* ═══ TRASPORTO (OBBLIGATORIO) ═══ */}
      <div className="mb-5">
        <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/60">
          Come ci arrivi?
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300/80">
            OBBLIGATORIO
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {transportOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ transport: opt.value })}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-medium transition-all duration-200 ${
                preferences.transport === opt.value
                  ? "bg-red-500/20 text-white border border-red-400/30 scale-105"
                  : "glass-subtle text-white/45 hover:bg-white/[0.06] hover:text-white/70"
              }`}
            >
              <span className="text-lg">{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ BUDGET (OBBLIGATORIO) ═══ */}
      <div className="mb-5">
        <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/60">
          Budget massimo
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300/80">
            OBBLIGATORIO
          </span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {budgetOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ budget: opt.value })}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-all duration-200 ${
                preferences.budget === opt.value
                  ? "bg-red-500/20 text-white border border-red-400/30 scale-105"
                  : "glass-subtle text-white/45 hover:bg-white/[0.06] hover:text-white/70"
              }`}
            >
              <span className="text-base">{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ SEPARATORE OPZIONALI ═══ */}
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.06]" />
        <span className="section-label">
          Opzionali
        </span>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      {/* ═══ DOVE DORMI (OPZIONALE) ═══ */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-semibold text-white/45">
          Dove dormi? 
          <span className="ml-1 text-white/25">(opzionale)</span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {accommodationOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                update({
                  accommodation:
                    preferences.accommodation === opt.value ? undefined : opt.value,
                })
              }
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-all duration-200 ${
                preferences.accommodation === opt.value
                  ? "bg-orange-500/20 text-white border border-orange-400/30 scale-105"
                  : "glass-subtle text-white/35 hover:bg-white/[0.06] hover:text-white/60"
              }`}
            >
              <span className="text-base">{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ LIVELLO DI RISCHIO (OPZIONALE) ═══ */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-semibold text-white/45">
          Quanto sei pazzo?
          <span className="ml-1 text-white/25">(opzionale)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {riskOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                update({
                  riskLevel:
                    preferences.riskLevel === opt.value ? undefined : opt.value,
                })
              }
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 ${
                preferences.riskLevel === opt.value
                  ? "bg-orange-500/20 text-white border border-orange-400/30 scale-105"
                  : "glass-subtle text-white/35 hover:bg-white/[0.06] hover:text-white/60"
              }`}
            >
              <span className="text-lg">{opt.emoji}</span>
              <div className="flex flex-col items-start">
                <span className="font-bold">{opt.label}</span>
                <span className="text-[10px] text-white/30">{opt.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ DURATA + COMPAGNI (OPZIONALI) ═══ */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {/* Durata */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white/45">
            Durata <span className="text-white/25">(opz.)</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => update({ duration: Math.max(1, (preferences.duration || 1) - 1) })}
              className="rounded-lg glass-subtle px-2.5 py-1.5 text-sm text-white/50 hover:bg-white/[0.08] transition-colors"
            >
              −
            </button>
            <span className="min-w-[3rem] text-center text-sm font-bold text-white/70">
              {preferences.duration ? `${preferences.duration}g` : "—"}
            </span>
            <button
              onClick={() => update({ duration: Math.min(30, (preferences.duration || 0) + 1) })}
              className="rounded-lg glass-subtle px-2.5 py-1.5 text-sm text-white/50 hover:bg-white/[0.08] transition-colors"
            >
              +
            </button>
            {preferences.duration && (
              <button
                onClick={() => update({ duration: undefined })}
                className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Compagni */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white/45">
            Con chi? <span className="text-white/25">(opz.)</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {companionOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  update({
                    companions:
                      preferences.companions === opt.value ? undefined : opt.value,
                  })
                }
                className={`flex items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                  preferences.companions === opt.value
                    ? "bg-orange-500/20 text-white border border-orange-400/30"
                    : "glass-subtle text-white/35 hover:bg-white/[0.06]"
                }`}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ DATA + ESTERO (OPZIONALI) ═══ */}
      <div className="flex items-center gap-3">
        {/* Data partenza */}
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-semibold text-white/45">
            Quando? <span className="text-white/25">(opz.)</span>
          </label>
          <input
            type="date"
            value={preferences.targetDate || ""}
            min={today}
            onChange={(e) => update({ targetDate: e.target.value || undefined })}
            className="w-full rounded-xl input-glass px-3 py-2 text-xs text-white/70 [color-scheme:dark]"
          />
        </div>

        {/* Estero */}
        <div className="flex flex-col items-center gap-1 pt-4">
          <button
            onClick={() => update({ allowAbroad: !preferences.allowAbroad })}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all duration-200 ${
              preferences.allowAbroad
                ? "bg-red-500/20 text-white border border-red-400/30"
                : "glass-subtle text-white/35 hover:bg-white/[0.06]"
            }`}
          >
            <span className="text-base">{preferences.allowAbroad ? "🌍" : "🇮🇹"}</span>
            <span>{preferences.allowAbroad ? "Anche estero" : "Solo Italia"}</span>
          </button>
        </div>
      </div>

      {/* ═══ FREE TEXT (OPZIONALE) ═══ */}
      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-semibold text-white/45">
          ✏️ Descrivi la follia che vuoi fare
          <span className="ml-1 text-white/25">(opzionale)</span>
        </label>
        <textarea
          value={preferences.freeText || ""}
          onChange={(e) => update({ freeText: e.target.value })}
          placeholder="Es: vorrei dormire in un faro abbandonato, oppure raggiungere il punto più estremo d'Italia..."
          rows={3}
          maxLength={300}
          className="w-full rounded-xl input-glass px-3 py-2.5 text-sm text-white/70 placeholder-white/25 resize-none"
        />
        <div className="mt-1 text-right text-[10px] text-white/30">
          {(preferences.freeText || "").length}/300
        </div>
      </div>
    </div>
  );
}
