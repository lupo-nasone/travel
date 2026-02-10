"use client";

import { DestinationResult, TravelMode, CostBreakdown, Destination } from "@/lib/types";

interface DestinationCardProps {
  result: DestinationResult;
  mode: TravelMode;
  onReset: () => void;
  onAccept?: () => void;
  isGeneratingItinerary?: boolean;
}

function CostBreakdownSection({ breakdown }: { breakdown: CostBreakdown }) {
  const costItems: { emoji: string; label: string; descrizione: string; costo: number }[] = [];

  if (breakdown.carburante && breakdown.carburante.costo > 0) {
    costItems.push({ emoji: "⛽", label: "Carburante", ...breakdown.carburante });
  }
  if (breakdown.trasporto && breakdown.trasporto.costo > 0) {
    costItems.push({ emoji: "🎫", label: "Trasporto", ...breakdown.trasporto });
  }
  if (breakdown.alloggio && breakdown.alloggio.costo > 0) {
    costItems.push({ emoji: "🏨", label: "Alloggio", ...breakdown.alloggio });
  }
  if (breakdown.cibo && breakdown.cibo.costo > 0) {
    costItems.push({ emoji: "🍽️", label: "Cibo", ...breakdown.cibo });
  }
  if (breakdown.pedaggi && breakdown.pedaggi.costo > 0) {
    costItems.push({ emoji: "🛣️", label: "Pedaggi", ...breakdown.pedaggi });
  }
  if (breakdown.attivita && breakdown.attivita.costo > 0) {
    costItems.push({ emoji: "🎟️", label: "Attività", ...breakdown.attivita });
  }
  if (breakdown.altro && breakdown.altro.costo > 0) {
    costItems.push({ emoji: "📦", label: "Altro", ...breakdown.altro });
  }

  if (costItems.length === 0 && !breakdown.totale) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-4">
      <p className="text-xs font-semibold text-emerald-300 mb-3 uppercase tracking-wide flex items-center gap-1.5">
        <span className="text-base">💰</span> Stima costi viaggio
      </p>
      <div className="space-y-2">
        {costItems.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5"
          >
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <span className="text-base shrink-0 mt-0.5">{item.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/90">{item.label}</p>
                <p className="text-xs text-white/50 leading-relaxed truncate">
                  {item.descrizione}
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-emerald-300 shrink-0 ml-3">
              €{typeof item.costo === 'number' ? item.costo.toFixed(0) : '0'}
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      {breakdown.totale != null && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-500/15 border border-emerald-500/25 px-4 py-3">
          <span className="text-sm font-bold text-white flex items-center gap-1.5">
            <span className="text-base">🧾</span> Totale stimato
          </span>
          <span className="text-lg font-black text-emerald-300">
            €{breakdown.totale.toFixed(0)}
          </span>
        </div>
      )}

      {/* Note */}
      {breakdown.nota && (
        <p className="mt-2 text-center text-xs text-white/40 italic">
          {breakdown.nota}
        </p>
      )}
    </div>
  );
}

function TransportInfoSection({ info }: { info: NonNullable<Destination["transportInfo"]> }) {
  const tipoEmoji: Record<string, string> = {
    treno: "🚂",
    aereo: "✈️",
    traghetto: "⛴️",
  };
  const tipoLabel: Record<string, string> = {
    treno: "Treno",
    aereo: "Volo",
    traghetto: "Traghetto",
  };

  const renderLeg = (
    leg: { compagnia: string; partenza: string; arrivo: string; orario: string; durata: string; prezzo: string; note?: string },
    label: string
  ) => (
    <div className="rounded-xl bg-white/5 p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white/70 uppercase tracking-wide">{label}</span>
        <span className="text-xs font-semibold text-sky-300">{leg.prezzo}</span>
      </div>
      <p className="text-sm font-semibold text-white/90">{leg.compagnia}</p>
      <div className="flex items-center gap-2 text-xs text-white/60">
        <span className="font-medium text-white/80">{leg.partenza}</span>
        <span className="text-white/30">→</span>
        <span className="font-medium text-white/80">{leg.arrivo}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-white/50">
        <span>🕐 {leg.orario}</span>
        <span>⏱️ {leg.durata}</span>
      </div>
      {leg.note && (
        <p className="text-[11px] text-white/40 italic">ℹ️ {leg.note}</p>
      )}
    </div>
  );

  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/20 p-4">
      <p className="text-xs font-semibold text-sky-300 mb-3 uppercase tracking-wide flex items-center gap-1.5">
        <span className="text-base">{tipoEmoji[info.tipo] || "🎫"}</span>
        Come arrivarci in {tipoLabel[info.tipo] || info.tipo}
      </p>

      <div className="space-y-2.5">
        {renderLeg(info.andata, "Andata")}
        {info.ritorno && renderLeg(info.ritorno, "Ritorno")}
      </div>

      {info.consigli && (
        <div className="mt-3 rounded-xl bg-sky-500/10 px-3 py-2.5">
          <p className="text-xs text-sky-200/80 leading-relaxed">
            <span className="font-bold">💡 Consiglio:</span> {info.consigli}
          </p>
        </div>
      )}

      {info.linkPrenotazione && (
        <a
          href={info.linkPrenotazione.startsWith("http") ? info.linkPrenotazione : `https://${info.linkPrenotazione}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-sky-500/20 border border-sky-500/30 px-4 py-2.5 text-sm font-semibold text-sky-200 transition-all hover:bg-sky-500/30 hover:scale-[1.02]"
        >
          <span>🔗</span> Prenota su {info.linkPrenotazione.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}
        </a>
      )}
    </div>
  );
}

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
      <div className="relative overflow-hidden rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        {/* Hero Image */}
        <div className="relative h-56 overflow-hidden">
          <img
            src={destination.image}
            alt={destination.name}
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Region badge */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
              📍 {destination.region}
            </span>
            {/* Hidden Gem Rating */}
            {destination.hiddenGemRating && destination.hiddenGemRating >= 3 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/60 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                💎 Gemma {destination.hiddenGemRating === 5 ? "Segretissima" : destination.hiddenGemRating === 4 ? "Nascosta" : "Rara"}
              </span>
            )}
            {/* AI source badge */}
            {destination.source === "ai" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/50 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                🤖 Scelta dall&apos;IA
              </span>
            )}
          </div>

          {/* Weather badge */}
          {weather && (
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                {weather.icon} {weather.temp}°C
              </span>
            </div>
          )}

          {/* Title overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-2xl font-bold text-white leading-tight">
              {destination.name}
            </h2>
            {destination.altitude && (
              <span className="text-sm text-white/70">
                ⛰️ {destination.altitude}m s.l.m.
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Why Go */}
          <div
            className="rounded-2xl p-4"
            style={{
              backgroundColor: mode === "tourist" ? "rgba(16, 185, 129, 0.1)" : "rgba(249, 115, 22, 0.1)",
              borderColor: mode === "tourist" ? "rgba(16, 185, 129, 0.2)" : "rgba(249, 115, 22, 0.2)",
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            <p className="text-sm font-semibold text-white/90 flex items-start gap-2">
              <span className="text-lg shrink-0">💡</span>
              {destination.whyGo}
            </p>
          </div>

          {/* AI Review — personal "been there" note */}
          {destination.aiReview && (
            <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-4">
              <div className="flex items-start gap-2">
                <span className="text-lg shrink-0">✍️</span>
                <div>
                  <p className="text-xs font-semibold text-indigo-300 mb-1 uppercase tracking-wide">
                    Recensione personale
                  </p>
                  <p className="text-sm text-white/80 italic leading-relaxed">
                    &ldquo;{destination.aiReview}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center rounded-xl bg-white/5 p-3">
              <span className="text-lg">📏</span>
              <span className="text-sm font-bold text-white">
                {Math.round(distance)} km
              </span>
              <span className="text-xs text-white/50">Distanza</span>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-white/5 p-3">
              <span className="text-lg">⏱️</span>
              <span className="text-sm font-bold text-white">{travelTime}</span>
              <span className="text-xs text-white/50">Tempo</span>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-white/5 p-3">
              <span className="text-lg">
                {weather ? weather.icon : "🌤️"}
              </span>
              <span className="text-sm font-bold text-white">
                {weather ? `${weather.temp}°C` : "N/D"}
              </span>
              <span className="text-xs text-white/50">Meteo</span>
            </div>
          </div>

          {/* Sunrise / Sunset row */}
          {(result.sunriseTime || result.sunsetTime) && (
            <div className="flex items-center justify-center gap-6 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/15 px-4 py-3">
              {result.sunriseTime && (
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🌅</span>
                  <div>
                    <span className="text-xs text-white/40 block leading-none">Alba</span>
                    <span className="text-sm font-bold text-amber-200">{result.sunriseTime}</span>
                  </div>
                </div>
              )}
              <div className="w-px h-8 bg-white/10" />
              {result.sunsetTime && (
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🌇</span>
                  <div>
                    <span className="text-xs text-white/40 block leading-none">Tramonto</span>
                    <span className="text-sm font-bold text-orange-200">{result.sunsetTime}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Biker extras */}
          {mode === "biker" && destination.roadQuality && (
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
              <div className="flex flex-col">
                <span className="text-xs text-white/50">Qualità asfalto</span>
                <span className="text-sm text-white">
                  {"⭐".repeat(destination.roadQuality)}
                  {"☆".repeat(5 - destination.roadQuality)}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-white/50">Curve</span>
                <span className="text-sm text-white">
                  {"🔥".repeat(destination.curvinessRating || 0)}
                </span>
              </div>
            </div>
          )}

          {/* Biker directions */}
          {mode === "biker" && destination.directions && (
            <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 p-4">
              <div className="flex items-start gap-2">
                <span className="text-lg shrink-0">🗺️</span>
                <div>
                  <p className="text-xs font-semibold text-orange-300 mb-1 uppercase tracking-wide">
                    Percorso consigliato
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {destination.directions}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Biker roads info */}
          {mode === "biker" && destination.roads && destination.roads.length > 0 && (
            <div className="rounded-xl bg-white/5 px-4 py-3">
              <p className="text-xs font-semibold text-white/50 mb-2 uppercase tracking-wide">
                🛣️ Strade principali
              </p>
              <div className="flex flex-wrap gap-1.5">
                {destination.roads.map((road, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/25 px-2.5 py-1 text-xs text-orange-200"
                  >
                    {road.name || "Strada senza nome"}
                    {road.surface && (
                      <span className="text-[10px] text-orange-400/60 ml-0.5">
                        ({road.surface})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Weather details */}
          {weather && (
            <div className="flex items-center justify-between text-xs text-white/40 px-1">
              <span>💨 Vento: {weather.windSpeed} km/h</span>
              <span>💧 Umidità: {weather.humidity}%</span>
              <span>{weather.description}</span>
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-white/70 leading-relaxed">
            {destination.description}
          </p>

          {/* AI Plan — detailed guide */}
          {destination.aiPlan && (
            <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-4">
              <div className="flex items-start gap-2">
                <span className="text-lg shrink-0">🤖</span>
                <div>
                  <p className="text-xs font-semibold text-indigo-300 mb-2 uppercase tracking-wide">
                    Il tuo piano — consigliato dall&apos;IA
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
                    {destination.aiPlan}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Transport Info — train/flight/ferry details */}
          {destination.transportInfo && (
            <TransportInfoSection info={destination.transportInfo} />
          )}

          {/* Cost Breakdown */}
          {destination.costBreakdown && (
            <CostBreakdownSection breakdown={destination.costBreakdown} />
          )}

          {/* Nearby places to eat/drink */}
          {destination.nearbyPlaces && destination.nearbyPlaces.length > 0 && (
            <div className="rounded-2xl bg-emerald-500/8 border border-emerald-500/20 p-4">
              <p className="text-xs font-semibold text-emerald-300 mb-3 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-base">🍽️</span> Dove mangiare e bere
              </p>
              <div className="space-y-2.5">
                {destination.nearbyPlaces.map((place, i) => {
                  const typeEmoji: Record<string, string> = {
                    ristorante: "🍽️",
                    bar: "🍹",
                    trattoria: "🍝",
                    agriturismo: "🌾",
                    rifugio: "⛺",
                    gelateria: "🍦",
                    altro: "📍",
                  };
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2.5"
                    >
                      <span className="text-base shrink-0 mt-0.5">
                        {typeEmoji[place.type] || "📍"}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white/90">
                          {place.name}
                        </p>
                        <p className="text-xs text-white/50 leading-relaxed">
                          {place.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            {/* Accept & Plan button */}
            {onAccept && (
              <button
                onClick={onAccept}
                disabled={isGeneratingItinerary}
                className="group relative flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg disabled:opacity-70 disabled:cursor-wait disabled:hover:scale-100 overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)",
                  boxShadow: "0 10px 30px rgba(99, 102, 241, 0.3)",
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
                    <span className="text-xl transition-transform duration-300 group-hover:scale-125">📋</span>
                    Accetta e Pianifica
                  </>
                )}
              </button>
            )}

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
              style={{
                background: mode === "tourist"
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "linear-gradient(135deg, #f97316, #dc2626)",
                boxShadow: mode === "tourist"
                  ? "0 10px 30px rgba(16, 185, 129, 0.3)"
                  : "0 10px 30px rgba(249, 115, 22, 0.3)",
              }}
            >
              🧭 Parti Ora!
            </a>

            <div className="flex gap-2">
              <a
                href={destination.wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-medium text-white/70 hover:bg-white/20 hover:text-white transition-all"
              >
                📖 Scopri di più
              </a>
              <button
                onClick={onReset}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-medium text-white/70 hover:bg-white/20 hover:text-white transition-all"
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
