"use client";

import { useState } from "react";
import { DestinationResult, TravelMode, CostBreakdown, Destination } from "@/lib/types";

interface DestinationCardProps {
  result: DestinationResult;
  mode: TravelMode;
  onReset: () => void;
  onAccept?: () => void;
  isGeneratingItinerary?: boolean;
}

/* ═══ Collapsible Section ═══ */
function CollapsibleSection({
  title,
  emoji,
  children,
  defaultOpen = false,
  accent = "white",
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const accentColors: Record<string, string> = {
    white: "text-white/60",
    emerald: "text-emerald-400/70",
    indigo: "text-indigo-400/70",
    sky: "text-sky-400/70",
    amber: "text-amber-400/70",
    orange: "text-orange-400/70",
  };

  return (
    <div className="rounded-2xl glass-subtle overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${accentColors[accent] || accentColors.white}`}>
          <span className="text-base">{emoji}</span>
          {title}
        </span>
        <svg
          className={`w-4 h-4 text-white/30 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ═══ Cost Breakdown ═══ */
function CostBreakdownSection({ breakdown }: { breakdown: CostBreakdown }) {
  const costItems: { emoji: string; label: string; descrizione: string; costo: number }[] = [];

  if (breakdown.carburante && breakdown.carburante.costo > 0)
    costItems.push({ emoji: "⛽", label: "Carburante", ...breakdown.carburante });
  if (breakdown.trasporto && breakdown.trasporto.costo > 0)
    costItems.push({ emoji: "🎫", label: "Trasporto", ...breakdown.trasporto });
  if (breakdown.alloggio && breakdown.alloggio.costo > 0)
    costItems.push({ emoji: "🏨", label: "Alloggio", ...breakdown.alloggio });
  if (breakdown.cibo && breakdown.cibo.costo > 0)
    costItems.push({ emoji: "🍽️", label: "Cibo", ...breakdown.cibo });
  if (breakdown.pedaggi && breakdown.pedaggi.costo > 0)
    costItems.push({ emoji: "🛣️", label: "Pedaggi", ...breakdown.pedaggi });
  if (breakdown.attivita && breakdown.attivita.costo > 0)
    costItems.push({ emoji: "🎟️", label: "Attività", ...breakdown.attivita });
  if (breakdown.altro && breakdown.altro.costo > 0)
    costItems.push({ emoji: "📦", label: "Altro", ...breakdown.altro });

  if (costItems.length === 0 && !breakdown.totale) return null;

  return (
    <>
      <div className="space-y-1.5">
        {costItems.map((item, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2.5">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <span className="text-sm shrink-0 mt-0.5">{item.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/80">{item.label}</p>
                <p className="text-[11px] text-white/40 truncate">{item.descrizione}</p>
              </div>
            </div>
            <span className="text-sm font-bold text-emerald-300/90 shrink-0 ml-3">
              €{typeof item.costo === "number" ? item.costo.toFixed(0) : "0"}
            </span>
          </div>
        ))}
      </div>
      {breakdown.totale != null && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
          <span className="text-sm font-bold text-white/90">🧾 Totale stimato</span>
          <span className="text-lg font-black text-emerald-300">€{breakdown.totale.toFixed(0)}</span>
        </div>
      )}
      {breakdown.nota && (
        <p className="text-center text-[11px] text-white/30 italic">{breakdown.nota}</p>
      )}
    </>
  );
}

/* ═══ Transport Info ═══ */
function TransportInfoSection({ info }: { info: NonNullable<Destination["transportInfo"]> }) {
  const renderLeg = (
    leg: { compagnia: string; partenza: string; arrivo: string; orario: string; durata: string; prezzo: string; note?: string },
    label: string
  ) => (
    <div className="rounded-xl bg-white/[0.04] p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wide">{label}</span>
        <span className="text-xs font-semibold text-sky-300/80">{leg.prezzo}</span>
      </div>
      <p className="text-sm font-medium text-white/80">{leg.compagnia}</p>
      <div className="flex items-center gap-2 text-xs text-white/50">
        <span className="text-white/70">{leg.partenza}</span>
        <span className="text-white/20">→</span>
        <span className="text-white/70">{leg.arrivo}</span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-white/40">
        <span>🕐 {leg.orario}</span>
        <span>⏱️ {leg.durata}</span>
      </div>
      {leg.note && <p className="text-[11px] text-white/30 italic">ℹ️ {leg.note}</p>}
    </div>
  );

  return (
    <>
      <div className="space-y-2">
        {renderLeg(info.andata, "Andata")}
        {info.ritorno && renderLeg(info.ritorno, "Ritorno")}
      </div>
      {info.consigli && (
        <div className="rounded-xl bg-sky-500/[0.08] px-3 py-2.5">
          <p className="text-xs text-sky-200/70 leading-relaxed">
            <span className="font-bold">💡</span> {info.consigli}
          </p>
        </div>
      )}
      {info.linkPrenotazione && (
        <a
          href={info.linkPrenotazione.startsWith("http") ? info.linkPrenotazione : `https://${info.linkPrenotazione}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-sky-500/15 border border-sky-500/20 px-4 py-2.5 text-sm font-medium text-sky-200/80 transition-all hover:bg-sky-500/25"
        >
          🔗 Prenota
        </a>
      )}
    </>
  );
}

/* ═══ Main Card ═══ */
export default function DestinationCard({
  result,
  mode,
  onReset,
  onAccept,
  isGeneratingItinerary,
}: DestinationCardProps) {
  const { destination, distance, weather, travelTime, mapsUrl } = result;

  return (
    <div className="animate-card-appear w-full max-w-md mx-auto">
      <div className="relative overflow-hidden rounded-3xl glass-card">

        {/* ─── Hero Image ─── */}
        <div className="relative h-60 overflow-hidden">
          <img
            src={destination.image}
            alt={destination.name}
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-black/30 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-md px-3 py-1 text-[11px] font-medium text-white/90">
              📍 {destination.region}
            </span>
            {destination.hiddenGemRating && destination.hiddenGemRating >= 3 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/50 backdrop-blur-md px-3 py-1 text-[11px] font-medium text-white/90">
                💎 {destination.hiddenGemRating === 5 ? "Segretissima" : destination.hiddenGemRating === 4 ? "Nascosta" : "Rara"}
              </span>
            )}
          </div>

          {/* Weather badge */}
          {weather && (
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md px-3 py-1.5 text-[11px] font-medium text-white/90">
                {weather.icon} {weather.temp}°C
              </span>
            </div>
          )}

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h2 className="text-2xl font-bold text-white leading-tight tracking-tight">
              {destination.name}
            </h2>
            {destination.altitude && (
              <p className="text-sm text-white/60 mt-0.5">⛰️ {destination.altitude}m s.l.m.</p>
            )}
          </div>
        </div>

        {/* ─── Content ─── */}
        <div className="p-5 space-y-4">

          {/* Why Go */}
          {destination.whyGo && (
            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: mode === "tourist" ? "rgba(16, 185, 129, 0.08)" : "rgba(249, 115, 22, 0.08)",
                borderColor: mode === "tourist" ? "rgba(16, 185, 129, 0.15)" : "rgba(249, 115, 22, 0.15)",
                borderWidth: "1px",
                borderStyle: "solid",
              }}
            >
              <p className="text-sm text-white/85 leading-relaxed flex items-start gap-2">
                <span className="text-base shrink-0 mt-0.5">💡</span>
                <span>{destination.whyGo}</span>
              </p>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: "📏", value: `${Math.round(distance)} km`, label: "Distanza" },
              { icon: "⏱️", value: travelTime, label: "Viaggio" },
              { icon: weather?.icon || "🌤️", value: weather ? `${weather.temp}°C` : "N/D", label: "Meteo" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center rounded-xl bg-white/[0.04] py-3 px-2">
                <span className="text-base">{stat.icon}</span>
                <span className="text-sm font-bold text-white/90 mt-1">{stat.value}</span>
                <span className="text-[10px] text-white/40 mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Sunrise / Sunset */}
          {(result.sunriseTime || result.sunsetTime) && (
            <div className="flex items-center justify-center gap-5 py-1 text-[11px] text-white/40">
              {result.sunriseTime && (
                <span className="flex items-center gap-1">
                  🌅 Alba <span className="font-semibold text-amber-300/70">{result.sunriseTime}</span>
                </span>
              )}
              {result.sunsetTime && (
                <span className="flex items-center gap-1">
                  🌇 Tramonto <span className="font-semibold text-orange-300/70">{result.sunsetTime}</span>
                </span>
              )}
            </div>
          )}

          {/* AI Review */}
          {destination.aiReview && (
            <div className="rounded-2xl bg-indigo-500/[0.06] border border-indigo-500/10 p-4">
              <p className="text-[11px] font-semibold text-indigo-300/60 mb-1.5 uppercase tracking-wider">
                ✍️ Recensione personale
              </p>
              <p className="text-sm text-white/70 italic leading-relaxed">
                &ldquo;{destination.aiReview}&rdquo;
              </p>
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-white/55 leading-relaxed">
            {destination.description}
          </p>

          {/* ═══ COLLAPSIBLE SECTIONS ═══ */}

          {/* Biker Section */}
          {mode === "biker" && (destination.roadQuality || destination.directions || (destination.roads && destination.roads.length > 0)) && (
            <CollapsibleSection title="Info percorso" emoji="🏍️" accent="orange" defaultOpen>
              {destination.roadQuality && (
                <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Qualità asfalto</span>
                    <span className="text-sm text-white/80 mt-0.5">
                      {"⭐".repeat(destination.roadQuality)}{"☆".repeat(5 - destination.roadQuality)}
                    </span>
                  </div>
                  {destination.curvinessRating && (
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider">Curve</span>
                      <span className="text-sm mt-0.5">{"🔥".repeat(destination.curvinessRating)}</span>
                    </div>
                  )}
                </div>
              )}
              {destination.directions && (
                <p className="text-sm text-white/70 leading-relaxed">🗺️ {destination.directions}</p>
              )}
              {destination.roads && destination.roads.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {destination.roads.map((road, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/15 px-2.5 py-1 text-[11px] text-orange-200/80">
                      {road.name || "Strada"}
                      {road.surface && <span className="text-orange-400/50">({road.surface})</span>}
                    </span>
                  ))}
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* AI Plan */}
          {destination.aiPlan && (
            <CollapsibleSection title="Piano consigliato dall&#39;IA" emoji="🤖" accent="indigo" defaultOpen>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
                {destination.aiPlan}
              </p>
            </CollapsibleSection>
          )}

          {/* Transport Info */}
          {destination.transportInfo && (
            <CollapsibleSection
              title={`Come arrivarci in ${destination.transportInfo.tipo}`}
              emoji={destination.transportInfo.tipo === "treno" ? "🚂" : destination.transportInfo.tipo === "aereo" ? "✈️" : "⛴️"}
              accent="sky"
            >
              <TransportInfoSection info={destination.transportInfo} />
            </CollapsibleSection>
          )}

          {/* Cost Breakdown */}
          {destination.costBreakdown && (
            <CollapsibleSection title="Stima costi" emoji="💰" accent="emerald">
              <CostBreakdownSection breakdown={destination.costBreakdown} />
            </CollapsibleSection>
          )}

          {/* Nearby Places */}
          {destination.nearbyPlaces && destination.nearbyPlaces.length > 0 && (
            <CollapsibleSection title="Dove mangiare e bere" emoji="🍽️" accent="emerald">
              <div className="space-y-2">
                {destination.nearbyPlaces.map((place, i) => {
                  const typeEmoji: Record<string, string> = {
                    ristorante: "🍽️", bar: "🍹", trattoria: "🍝", agriturismo: "🌾",
                    rifugio: "⛺", gelateria: "🍦", altro: "📍",
                  };
                  return (
                    <div key={i} className="flex items-start gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5">
                      <span className="text-sm shrink-0 mt-0.5">{typeEmoji[place.type] || "📍"}</span>
                      <div>
                        <p className="text-sm font-medium text-white/80">{place.name}</p>
                        <p className="text-[11px] text-white/40 leading-relaxed">{place.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* Weather details */}
          {weather && (
            <div className="flex items-center justify-between text-[11px] text-white/30 px-1 py-1">
              <span>💨 {weather.windSpeed} km/h</span>
              <span>💧 {weather.humidity}%</span>
              <span>{weather.description}</span>
            </div>
          )}

          {/* ═══ Action Buttons ═══ */}
          <div className="flex flex-col gap-2.5 pt-3">
            {onAccept && (
              <button
                onClick={onAccept}
                disabled={isGeneratingItinerary}
                className="group relative flex items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-base font-bold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60 disabled:cursor-wait disabled:hover:scale-100 overflow-hidden glow-indigo"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)",
                }}
              >
                {isGeneratingItinerary ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Genero il tuo itinerario...
                  </span>
                ) : (
                  <>
                    <span className="text-lg transition-transform duration-300 group-hover:scale-110">📋</span>
                    Accetta e Pianifica
                  </>
                )}
              </button>
            )}

            <a
              href={mapsUrl}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: mode === "tourist"
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "linear-gradient(135deg, #f97316, #dc2626)",
                boxShadow: mode === "tourist"
                  ? "0 8px 24px rgba(16, 185, 129, 0.2)"
                  : "0 8px 24px rgba(249, 115, 22, 0.2)",
              }}
            >
              🧭 Parti Ora
            </a>

            <div className="flex gap-2">
              <a
                href={destination.wikiUrl}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/[0.05] py-3 text-sm font-medium text-white/50 hover:bg-white/10 hover:text-white/80 transition-all"
              >
                📖 Scopri di più
              </a>
              <button
                onClick={onReset}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/[0.05] py-3 text-sm font-medium text-white/50 hover:bg-white/10 hover:text-white/80 transition-all"
              >
                🎲 Riprova
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}