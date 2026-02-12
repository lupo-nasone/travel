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
        <div className="space-y-3 py-6">
          {[1,2,3].map((i) => (
            <div key={i} className="rounded-2xl glass-subtle p-4" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex gap-3">
                <div className="w-20 h-20 skeleton rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton-text w-2/3" />
                  <div className="skeleton-text w-1/2" />
                  <div className="skeleton-text w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      {/* Header */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm text-white/35 hover:text-white/70 transition-colors group"
      >
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        Indietro
      </button>

      <div className="text-center mb-6">
        <span className="text-4xl mb-2 block">📋</span>
        <h2 className="text-2xl font-bold text-white">I miei viaggi</h2>
        <p className="text-sm text-white/40 mt-1">
          {trips.length === 0
            ? "Non hai ancora salvato nessun viaggio"
            : `${trips.length} viaggi${trips.length === 1 ? "o" : ""} salvat${trips.length === 1 ? "o" : "i"}`}
        </p>
      </div>

      {/* Empty state */}
      {trips.length === 0 && (
        <div className="rounded-2xl glass-subtle p-8 text-center">
          <span className="text-5xl block mb-3">🌍</span>
          <p className="text-sm text-white/40 leading-relaxed">
            Genera una destinazione, accetta l&apos;itinerario e premi
            &ldquo;Salva viaggio&rdquo; per ritrovarlo qui!
          </p>
        </div>
      )}

      {/* Trip cards */}
      <div className="space-y-3">
        {trips.map((trip, i) => {
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
              className="group rounded-2xl glass-subtle overflow-hidden transition-all hover:bg-white/[0.06] hover:border-white/[0.12] animate-fade-in-fast"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex gap-3 p-4">
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-white/[0.04]">
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
                  <p className="text-xs text-white/40 mt-0.5">
                    📍 {trip.destination_region} — {Math.round(trip.distance)} km
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] bg-indigo-500/15 text-indigo-300/80 rounded-full px-2 py-0.5 font-medium">
                      {trip.mode === "biker" ? "🏍️ Biker" : "🧳 Turista"}
                    </span>
                    <span className="text-[10px] bg-white/[0.06] text-white/40 rounded-full px-2 py-0.5">
                      {daysLabel}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/25 mt-1.5">
                    {dateStr}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex border-t border-white/[0.04]">
                <button
                  onClick={() => onLoad(trip)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-indigo-300/70 hover:bg-indigo-500/[0.06] hover:text-indigo-300 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                  Apri itinerario
                </button>
                <div className="w-px bg-white/[0.04]" />
                <button
                  onClick={() => {
                    if (confirm("Eliminare questo viaggio?")) {
                      onDelete(trip.id);
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-red-400/40 hover:bg-red-500/[0.06] hover:text-red-300 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
