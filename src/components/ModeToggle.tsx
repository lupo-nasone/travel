"use client";

import { TravelMode } from "@/lib/types";

interface ModeToggleProps {
  mode: TravelMode;
  onChange: (mode: TravelMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="w-full max-w-sm">
      <p className="text-[11px] text-white/25 text-center mb-2.5 font-medium uppercase tracking-wider">Tipo di viaggio</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange("tourist")}
          className={`group relative flex-1 flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 ${
            mode === "tourist"
              ? "glass-card ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/[0.08]"
              : "bg-white/[0.03] border border-white/[0.05] text-white/40 hover:bg-white/[0.06]"
          }`}
        >
          <span className="text-xl">🚗</span>
          <div className="flex flex-col items-start">
            <span className={`text-sm font-bold ${mode === "tourist" ? "text-white/90" : "text-white/50"}`}>Turista</span>
            <span className={`text-[10px] ${mode === "tourist" ? "text-emerald-300/60" : "text-white/25"}`}>
              Borghi, mare, natura
            </span>
          </div>
        </button>

        <button
          onClick={() => onChange("biker")}
          className={`group relative flex-1 flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 ${
            mode === "biker"
              ? "glass-card ring-1 ring-orange-500/30 shadow-lg shadow-orange-500/[0.08]"
              : "bg-white/[0.03] border border-white/[0.05] text-white/40 hover:bg-white/[0.06]"
          }`}
        >
          <span className="text-xl">🏍️</span>
          <div className="flex flex-col items-start">
            <span className={`text-sm font-bold ${mode === "biker" ? "text-white/90" : "text-white/50"}`}>Biker</span>
            <span className={`text-[10px] ${mode === "biker" ? "text-orange-300/60" : "text-white/25"}`}>
              Curve, passi, panorami
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
