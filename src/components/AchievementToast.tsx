"use client";

import { useEffect, useState } from "react";
import { Achievement, RARITY_CONFIG } from "@/data/achievements";

interface AchievementToastProps {
  achievement: Achievement;
  onDone: () => void;
}

export default function AchievementToast({ achievement, onDone }: AchievementToastProps) {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");
  const rarity = RARITY_CONFIG[achievement.rarity];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 50);
    const t2 = setTimeout(() => setPhase("exit"), 4000);
    const t3 = setTimeout(onDone, 4500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div
      className={`
        fixed top-6 left-1/2 -translate-x-1/2 z-[9999]
        max-w-sm w-[90vw]
        transition-all duration-500 ease-out
        ${phase === "enter" ? "opacity-0 -translate-y-8 scale-90" : ""}
        ${phase === "show" ? "opacity-100 translate-y-0 scale-100" : ""}
        ${phase === "exit" ? "opacity-0 -translate-y-4 scale-95" : ""}
      `}
    >
      <div
        className={`
          relative overflow-hidden rounded-2xl backdrop-blur-xl
          border ${rarity.borderColor} ${rarity.bgColor}
          shadow-2xl ${rarity.glowColor}
          p-4
        `}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={`absolute -top-1/2 -left-1/2 h-[200%] w-[200%] bg-gradient-to-r ${rarity.color} opacity-[0.07] animate-spin`}
            style={{ animationDuration: "4s" }}
          />
        </div>

        <div className="relative flex items-center gap-3">
          {/* Icon with glow */}
          <div className="relative">
            <span className="text-4xl block animate-bounce" style={{ animationDuration: "1s" }}>
              {achievement.icon}
            </span>
            <div className={`absolute inset-0 blur-xl opacity-40 bg-gradient-to-r ${rarity.color} rounded-full`} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                🏆 Achievement sbloccato!
              </span>
            </div>
            <h3 className="text-sm font-black text-white truncate">
              {achievement.name}
            </h3>
            <p className="text-[11px] text-white/60 leading-tight mt-0.5 line-clamp-2">
              {achievement.description}
            </p>
            <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider ${rarity.textColor}`}>
              {rarity.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
