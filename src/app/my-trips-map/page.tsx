"use client";

import dynamic from "next/dynamic";

const MyTripsMapClient = dynamic(() => import("@/components/MyTripsMapClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-3 animate-bounce">🗺️</p>
        <p className="text-white/60">Caricamento mappa...</p>
      </div>
    </div>
  ),
});

export default function MyTripsMapPage() {
  return <MyTripsMapClient />;
}
