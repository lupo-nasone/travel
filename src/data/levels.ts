// ── Sistema Livelli basato sugli Achievement ──

import { AchievementRarity } from "./achievements";

// XP per rarità achievement
export const RARITY_XP: Record<AchievementRarity, number> = {
  comune: 10,
  non_comune: 25,
  raro: 50,
  epico: 100,
  leggendario: 250,
};

// Definizione livelli
export interface Level {
  level: number;
  name: string;
  icon: string;
  minXp: number;
  color: string;
  gradient: string;
}

export const LEVELS: Level[] = [
  { level: 1, name: "Novizio", icon: "🌱", minXp: 0, color: "text-zinc-400", gradient: "from-zinc-400 to-zinc-500" },
  { level: 2, name: "Viaggiatore", icon: "🥾", minXp: 20, color: "text-zinc-300", gradient: "from-zinc-300 to-zinc-400" },
  { level: 3, name: "Esploratore", icon: "🧭", minXp: 50, color: "text-emerald-400", gradient: "from-emerald-400 to-green-500" },
  { level: 4, name: "Avventuriero", icon: "⛺", minXp: 100, color: "text-emerald-300", gradient: "from-emerald-300 to-teal-400" },
  { level: 5, name: "Navigatore", icon: "🗺️", minXp: 175, color: "text-blue-400", gradient: "from-blue-400 to-cyan-500" },
  { level: 6, name: "Scopritore", icon: "🔭", minXp: 275, color: "text-blue-300", gradient: "from-blue-300 to-sky-400" },
  { level: 7, name: "Veterano", icon: "⚔️", minXp: 400, color: "text-purple-400", gradient: "from-purple-400 to-violet-500" },
  { level: 8, name: "Maestro", icon: "🎖️", minXp: 550, color: "text-purple-300", gradient: "from-purple-300 to-fuchsia-400" },
  { level: 9, name: "Leggenda", icon: "👑", minXp: 750, color: "text-amber-400", gradient: "from-amber-400 to-orange-500" },
  { level: 10, name: "Divinità", icon: "⭐", minXp: 1000, color: "text-amber-300", gradient: "from-amber-300 via-yellow-400 to-red-500" },
];

export function calculateXp(unlockedIds: string[], achievements: { id: string; rarity: AchievementRarity }[]): number {
  let xp = 0;
  for (const a of achievements) {
    if (unlockedIds.includes(a.id)) {
      xp += RARITY_XP[a.rarity];
    }
  }
  return xp;
}

export function getLevel(xp: number): Level {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl;
    else break;
  }
  return current;
}

export function getNextLevel(xp: number): Level | null {
  for (const lvl of LEVELS) {
    if (xp < lvl.minXp) return lvl;
  }
  return null; // max level reached
}

export function getLevelProgress(xp: number): number {
  const current = getLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return 100; // max level
  const range = next.minXp - current.minXp;
  const progress = xp - current.minXp;
  return Math.round((progress / range) * 100);
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  achievement_count: number;
  xp: number;
  level: Level;
}
