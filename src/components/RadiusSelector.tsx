"use client";

interface RadiusSelectorProps {
  minRadius: number;
  maxRadius: number;
  allowAbroad: boolean;
  onChangeMin: (min: number) => void;
  onChangeMax: (max: number) => void;
  onChangeAbroad: (abroad: boolean) => void;
  showRange?: boolean;
}

type DestinationScope = "italia" | "europa" | "ovunque";
type TravelEffort = "vicino" | "medio" | "lontano" | "ovunque";

const SCOPE_OPTIONS: { value: DestinationScope; emoji: string; label: string; sub: string }[] = [
  { value: "italia", emoji: "\u{1F1EE}\u{1F1F9}", label: "Italia", sub: "Dentro i confini" },
  { value: "europa", emoji: "\u{1F1EA}\u{1F1FA}", label: "Europa", sub: "Anche all'estero" },
  { value: "ovunque", emoji: "\u{1F30D}", label: "Ovunque", sub: "Senza limiti" },
];

const EFFORT_OPTIONS: { value: TravelEffort; emoji: string; label: string; sub: string; min: number; max: number }[] = [
  { value: "vicino", emoji: "\u{1F697}", label: "Dietro l'angolo", sub: "< 1h di viaggio", min: 10, max: 80 },
  { value: "medio", emoji: "\u{1F6E3}\u{FE0F}", label: "Una bella gita", sub: "1-3h di viaggio", min: 50, max: 250 },
  { value: "lontano", emoji: "\u{2708}\u{FE0F}", label: "Una vera avventura", sub: "3h+ di viaggio", min: 200, max: 800 },
  { value: "ovunque", emoji: "\u{1F3B2}", label: "Sorprendimi!", sub: "Qualsiasi distanza", min: 10, max: 1500 },
];

export default function RadiusSelector({
  minRadius,
  maxRadius,
  allowAbroad,
  onChangeMin,
  onChangeMax,
  onChangeAbroad,
  showRange = true,
}: RadiusSelectorProps) {
  const currentScope: DestinationScope = !allowAbroad ? "italia" : maxRadius > 1500 ? "ovunque" : "europa";

  const currentEffort: TravelEffort = (() => {
    for (const opt of EFFORT_OPTIONS) {
      if (minRadius === opt.min && maxRadius === opt.max) return opt.value;
    }
    if (maxRadius <= 80) return "vicino";
    if (maxRadius <= 250) return "medio";
    if (maxRadius <= 800) return "lontano";
    return "ovunque";
  })();

  const handleScope = (scope: DestinationScope) => {
    if (scope === "italia") {
      onChangeAbroad(false);
    } else {
      onChangeAbroad(true);
      if (scope === "ovunque") {
        onChangeMin(10);
        onChangeMax(99999);
      }
    }
  };

  const handleEffort = (effort: TravelEffort) => {
    const opt = EFFORT_OPTIONS.find(o => o.value === effort)!;
    onChangeMin(opt.min);
    onChangeMax(opt.max);
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-5">
      {/* Dove vuoi andare? */}
      <div className="w-full">
        <p className="text-[11px] text-white/25 text-center mb-2.5 font-medium uppercase tracking-wider">
          Dove vuoi andare?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SCOPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleScope(opt.value)}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-3 transition-all duration-200 ${
                currentScope === opt.value
                  ? "glass-card ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/[0.06]"
                  : "bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06]"
              }`}
            >
              <span className="text-xl">{opt.emoji}</span>
              <span className={`text-sm font-semibold ${currentScope === opt.value ? "text-white/90" : "text-white/45"}`}>
                {opt.label}
              </span>
              <span className="text-[10px] text-white/25">{opt.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quanto vuoi viaggiare? */}
      {showRange && currentScope !== "ovunque" && (
        <div className="w-full animate-fade-in-fast">
          <p className="text-[11px] text-white/25 text-center mb-2.5 font-medium uppercase tracking-wider">
            Quanto vuoi viaggiare?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {EFFORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleEffort(opt.value)}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-3 transition-all duration-200 ${
                  currentEffort === opt.value
                    ? "glass-card ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-500/[0.06]"
                    : "bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06]"
                }`}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span className={`text-sm font-semibold ${currentEffort === opt.value ? "text-white/90" : "text-white/45"}`}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-white/25">{opt.sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info box per scope ovunque */}
      {currentScope === "ovunque" && (
        <div className="animate-fade-in-fast rounded-xl glass-subtle px-4 py-3 text-center w-full">
          <p className="text-[13px] text-emerald-300/60">
            Nessun limite &mdash; l&apos;IA cercher&agrave; la meta perfetta ovunque nel mondo
          </p>
        </div>
      )}

      {/* Info box per europa */}
      {currentScope === "europa" && (
        <div className="animate-fade-in-fast rounded-xl glass-subtle px-4 py-3 text-center w-full">
          <p className="text-[13px] text-blue-300/60">
            L&apos;IA cercher&agrave; mete anche fuori dall&apos;Italia, in tutta Europa
          </p>
        </div>
      )}
    </div>
  );
}