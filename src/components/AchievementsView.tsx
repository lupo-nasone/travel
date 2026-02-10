"use client";

import { useState } from "react";
import {
  ACHIEVEMENTS,
  RARITY_CONFIG,
  Achievement,
  AchievementRarity,
  AchievementCategory,
} from "@/data/achievements";

interface AchievementsViewProps {
  unlockedIds: Set<string>;
  onBack: () => void;
}

const RARITY_ORDER: AchievementRarity[] = [
  "leggendario",
  "epico",
  "raro",
  "non_comune",
  "comune",
];

const CATEGORY_LABELS: Record<AchievementCategory, { label: string; icon: string }> = {
  esplorazione: { label: "Esplorazione", icon: "🧭" },
  viaggio: { label: "Viaggio", icon: "🚗" },
  pianificazione: { label: "Pianificazione", icon: "📋" },
  sociale: { label: "Sociale", icon: "👥" },
  sfida: { label: "Sfida", icon: "⚡" },
  segreto: { label: "Segreto", icon: "🗝️" },
};

type FilterMode = "all" | AchievementRarity | AchievementCategory;

export default function AchievementsView({
  unlockedIds,
  onBack,
}: AchievementsViewProps) {
  const [filter, setFilter] = useState<FilterMode>("all");

  const totalUnlocked = unlockedIds.size;
  const totalAchievements = ACHIEVEMENTS.length;
  const percentage = Math.round((totalUnlocked / totalAchievements) * 100);

  // Filter achievements
  let filtered: Achievement[];
  if (filter === "all") {
    filtered = ACHIEVEMENTS;
  } else if (RARITY_ORDER.includes(filter as AchievementRarity)) {
    filtered = ACHIEVEMENTS.filter((a) => a.rarity === filter);
  } else {
    filtered = ACHIEVEMENTS.filter((a) => a.category === filter);
  }

  // Sort: unlocked first, then by rarity
  const sorted = [...filtered].sort((a, b) => {
    const aUnlocked = unlockedIds.has(a.id) ? 0 : 1;
    const bUnlocked = unlockedIds.has(b.id) ? 0 : 1;
    if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
    return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
  });

  // Stats per rarity
  const rarityStats = RARITY_ORDER.map((r) => {
    const total = ACHIEVEMENTS.filter((a) => a.rarity === r).length;
    const unlocked = ACHIEVEMENTS.filter(
      (a) => a.rarity === r && unlockedIds.has(a.id)
    ).length;
    return { rarity: r, total, unlocked };
  });

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      {/* Back */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
      >
        ← Torna indietro
      </button>

      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-5xl mb-2 block">🏆</span>
        <h2 className="text-2xl font-bold text-white">Achievement</h2>
        <p className="text-sm text-white/50 mt-1">
          {totalUnlocked}/{totalAchievements} sbloccati ({percentage}%)
        </p>

        {/* Progress bar */}
        <div className="mt-3 mx-auto max-w-xs h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 transition-all duration-1000"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Rarity stats */}
      <div className="grid grid-cols-5 gap-1.5 mb-5">
        {rarityStats.map(({ rarity, total, unlocked }) => {
          const cfg = RARITY_CONFIG[rarity];
          return (
            <button
              key={rarity}
              onClick={() => setFilter(filter === rarity ? "all" : rarity)}
              className={`rounded-xl p-2 text-center transition-all ${
                filter === rarity
                  ? `${cfg.bgColor} ${cfg.borderColor} border scale-105`
                  : "bg-white/5 border border-white/10 hover:bg-white/10"
              }`}
            >
              <p className={`text-lg font-black ${cfg.textColor}`}>
                {unlocked}
                <span className="text-[10px] text-white/30">/{total}</span>
              </p>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${cfg.textColor} opacity-70`}>
                {cfg.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5 mb-5 justify-center">
        <button
          onClick={() => setFilter("all")}
          className={`text-[11px] font-medium rounded-full px-3 py-1 transition-all ${
            filter === "all"
              ? "bg-white/20 text-white border border-white/30"
              : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
          }`}
        >
          Tutti
        </button>
        {(Object.keys(CATEGORY_LABELS) as AchievementCategory[]).map((cat) => {
          const { label, icon } = CATEGORY_LABELS[cat];
          return (
            <button
              key={cat}
              onClick={() => setFilter(filter === cat ? "all" : cat)}
              className={`text-[11px] font-medium rounded-full px-3 py-1 transition-all ${
                filter === cat
                  ? "bg-white/20 text-white border border-white/30"
                  : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
              }`}
            >
              {icon} {label}
            </button>
          );
        })}
      </div>

      {/* Achievement cards */}
      <div className="space-y-2">
        {sorted.map((achievement) => {
          const unlocked = unlockedIds.has(achievement.id);
          const rarity = RARITY_CONFIG[achievement.rarity];
          const isSecret = achievement.secret && !unlocked;

          return (
            <div
              key={achievement.id}
              className={`
                relative overflow-hidden rounded-xl border p-3 transition-all
                ${
                  unlocked
                    ? `${rarity.bgColor} ${rarity.borderColor} shadow-lg ${rarity.glowColor}`
                    : "bg-white/[0.02] border-white/[0.06] opacity-50"
                }
              `}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className={`text-2xl shrink-0 ${
                    unlocked ? "" : "grayscale brightness-50"
                  }`}
                >
                  {isSecret ? "❓" : achievement.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-sm font-bold truncate ${
                        unlocked ? "text-white" : "text-white/40"
                      }`}
                    >
                      {isSecret ? "???" : achievement.name}
                    </h3>
                    {unlocked && (
                      <span className="text-[10px] shrink-0">✅</span>
                    )}
                  </div>
                  <p
                    className={`text-[11px] leading-tight mt-0.5 ${
                      unlocked ? "text-white/60" : "text-white/25"
                    }`}
                  >
                    {isSecret
                      ? "Continua a esplorare per scoprirlo..."
                      : achievement.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider ${
                        unlocked ? rarity.textColor : "text-white/20"
                      }`}
                    >
                      {rarity.label}
                    </span>
                    {!isSecret && (
                      <span className="text-[9px] text-white/20">
                        • {achievement.condition}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Unlocked shimmer */}
              {unlocked && achievement.rarity === "leggendario" && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div
                    className="absolute -top-1/2 -left-full h-[200%] w-[200%] bg-gradient-to-r from-transparent via-amber-400/10 to-transparent"
                    style={{
                      animation: "shimmer 3s infinite",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Back button bottom */}
      <div className="mt-6 pb-4">
        <button
          onClick={onBack}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/20 px-6 py-4 text-sm font-semibold text-white/70 transition-all hover:bg-white/20 hover:text-white hover:scale-[1.02] active:scale-95"
        >
          ← Torna indietro
        </button>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
