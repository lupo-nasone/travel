"use client";

import { SavedTrip } from "@/lib/types";

interface SavedTripsListProps {
  trips: SavedTrip[];
  isLoading: boolean;
  onLoad: (trip: SavedTrip) => void;
  onDelete: (tripId: string) => void;
  onBack: () => void;
}

export default function SavedTripsList({
  trips,
  isLoading,
  onLoad,
  onDelete,
  onBack,
}: SavedTripsListProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto animate-fade-in">
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-sm text-white/50">Carico i tuoi viaggi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      {/* Header */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
      >
        ← Torna indietro
      </button>

      <div className="text-center mb-6">
        <span className="text-4xl mb-2 block">📋</span>
        <h2 className="text-2xl font-bold text-white">I miei viaggi</h2>
        <p className="text-sm text-white/50 mt-1">
          {trips.length === 0
            ? "Non hai ancora salvato nessun viaggio"
            : `${trips.length} viaggi${trips.length === 1 ? "o" : ""} salvat${trips.length === 1 ? "o" : "i"}`}
        </p>
      </div>

      {/* Empty state */}
      {trips.length === 0 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
          <span className="text-5xl block mb-3">🌍</span>
          <p className="text-sm text-white/50 leading-relaxed">
            Genera una destinazione, accetta l&apos;itinerario e premi
            &ldquo;Salva viaggio&rdquo; per ritrovarlo qui!
          </p>
        </div>
      )}

      {/* Trip cards */}
      <div className="space-y-3">
        {trips.map((trip) => {
          const date = new Date(trip.created_at);
          const dateStr = date.toLocaleDateString("it-IT", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          const daysLabel =
            trip.trip_days === 1
              ? "1 giorno"
              : `${trip.trip_days} giorni`;

          return (
            <div
              key={trip.id}
              className="group rounded-2xl bg-white/5 border border-white/10 overflow-hidden transition-all hover:bg-white/10 hover:border-white/20"
            >
              <div className="flex gap-3 p-4">
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-white/5">
                  {trip.destination_image ? (
                    <img
                      src={trip.destination_image}
                      alt={trip.destination_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🗺️
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {trip.destination_name}
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    📍 {trip.destination_region} — {Math.round(trip.distance)} km
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 rounded-full px-2 py-0.5 font-medium">
                      {trip.mode === "biker" ? "🏍️ Biker" : "🧳 Turista"}
                    </span>
                    <span className="text-[10px] bg-white/10 text-white/50 rounded-full px-2 py-0.5">
                      {daysLabel}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/30 mt-1.5">
                    Salvato il {dateStr}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex border-t border-white/5">
                <button
                  onClick={() => onLoad(trip)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/10 transition-all"
                >
                  📖 Apri itinerario
                </button>
                <div className="w-px bg-white/5" />
                <button
                  onClick={() => {
                    if (confirm("Eliminare questo viaggio?")) {
                      onDelete(trip.id);
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-red-400/60 hover:bg-red-500/10 hover:text-red-300 transition-all"
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
