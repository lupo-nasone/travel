"use client";

import { TravelMode } from "@/lib/types";

interface ModeToggleProps {
  mode: TravelMode;
  onChange: (mode: TravelMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onChange("tourist")}
        className={`group relative flex items-center gap-3 rounded-2xl px-6 py-4 text-lg font-semibold transition-all duration-300 ${
          mode === "tourist"
            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105"
            : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white/80"
        }`}
      >
        <span className="text-2xl">🚗</span>
        <div className="flex flex-col items-start">
          <span>Turista</span>
          <span className={`text-xs font-normal ${
            mode === "tourist" ? "text-emerald-100" : "text-white/40"
          }`}>
            Borghi, laghi, musei
          </span>
        </div>
      </button>

      <div className="w-px h-12 bg-white/20" />

      <button
        onClick={() => onChange("biker")}
        className={`group relative flex items-center gap-3 rounded-2xl px-6 py-4 text-lg font-semibold transition-all duration-300 ${
          mode === "biker"
            ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105"
            : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white/80"
        }`}
      >
        <span className="text-2xl">🏍️</span>
        <div className="flex flex-col items-start">
          <span>Biker</span>
          <span className={`text-xs font-normal ${
            mode === "biker" ? "text-orange-100" : "text-white/40"
          }`}>
            Passi, curve, panorami
          </span>
        </div>
      </button>
    </div>
  );
}
