"use client";

import { DestinationResult, TravelMode } from "@/lib/types";

interface DestinationCardProps {
  result: DestinationResult;
  mode: TravelMode;
  onReset: () => void;
}

export default function DestinationCard({
  result,
  mode,
  onReset,
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

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
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
