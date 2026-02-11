"use client";

import { TravelMode } from "@/lib/types";

interface ModeToggleProps {
  mode: TravelMode;
  onChange: (mode: TravelMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="w-full max-w-sm">
      <p className="text-xs text-white/30 text-center mb-2 font-medium">Che tipo di viaggio?</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange("tourist")}
          className={`group relative flex-1 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-base font-semibold transition-all duration-300 ${
            mode === "tourist"
              ? "bg-emerald-500/20 border-2 border-emerald-500/40 text-white shadow-lg shadow-emerald-500/10 scale-[1.02]"
              : "bg-white/5 border-2 border-transparent text-white/50 hover:bg-white/10 hover:text-white/70"
          }`}
        >
          <span className="text-2xl">🚗</span>
          <div className="flex flex-col items-start">
            <span className="text-sm font-bold">Turista</span>
            <span className={`text-[11px] font-normal ${
              mode === "tourist" ? "text-emerald-300/70" : "text-white/30"
            }`}>
              Borghi, mare, natura
            </span>
          </div>
        </button>

        <button
          onClick={() => onChange("biker")}
          className={`group relative flex-1 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-base font-semibold transition-all duration-300 ${
            mode === "biker"
              ? "bg-orange-500/20 border-2 border-orange-500/40 text-white shadow-lg shadow-orange-500/10 scale-[1.02]"
              : "bg-white/5 border-2 border-transparent text-white/50 hover:bg-white/10 hover:text-white/70"
          }`}
        >
          <span className="text-2xl">🏍️</span>
          <div className="flex flex-col items-start">
            <span className="text-sm font-bold">Biker</span>
            <span className={`text-[11px] font-normal ${
              mode === "biker" ? "text-orange-300/70" : "text-white/30"
            }`}>
              Curve, passi, panorami
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
