"use client";

import { useState, useEffect, useCallback } from "react";
import { LEVELS } from "@/data/levels";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  achievement_count: number;
  total_spins: number;
  total_saves: number;
  xp: number;
  level: number;
  level_name: string;
  level_icon: string;
  is_me: boolean;
}

interface LeaderboardViewProps {
  onBack: () => void;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return <span className="text-2xl">🥇</span>;
  if (rank === 2)
    return <span className="text-2xl">🥈</span>;
  if (rank === 3)
    return <span className="text-2xl">🥉</span>;
  return (
    <span className="text-lg font-black text-white/30 w-8 text-center">
      {rank}
    </span>
  );
}

function LevelBadge({ level, levelName, levelIcon }: { level: number; levelName: string; levelIcon: string }) {
  const lvlData = LEVELS.find((l) => l.level === level) || LEVELS[0];
  return (
    <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 bg-gradient-to-r ${lvlData.gradient} bg-opacity-20`}>
      <span className="text-xs">{levelIcon}</span>
      <span className="text-[10px] font-bold text-white/90">{levelName}</span>
    </div>
  );
}

export default function LeaderboardView({ onBack }: LeaderboardViewProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (res.ok) setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setIsSavingName(true);
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: newName.trim() }),
      });
      if (res.ok) {
        setEditingName(false);
        fetchLeaderboard();
      }
    } catch (err) {
      console.error("Error saving name:", err);
    } finally {
      setIsSavingName(false);
    }
  };

  const myEntry = leaderboard.find((e) => e.is_me);

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto animate-fade-in">
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-12 h-12 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin" />
          <p className="text-sm text-white/50">Carico la classifica...</p>
        </div>
      </div>
    );
  }

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
        <span className="text-5xl mb-2 block">🏅</span>
        <h2 className="text-2xl font-bold text-white">Classifica</h2>
        <p className="text-sm text-white/50 mt-1">
          {leaderboard.length} esplorator{leaderboard.length === 1 ? "e" : "i"} in gara
        </p>
      </div>

      {/* My position card */}
      {myEntry && (
        <div className="mb-5 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-pink-500/10 border border-indigo-500/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              La tua posizione
            </p>
            <button
              onClick={() => {
                setEditingName(true);
                setNewName(myEntry.display_name);
              }}
              className="text-[10px] text-white/40 hover:text-white/70 transition-colors"
            >
              ✏️ Modifica nome
            </button>
          </div>

          {editingName ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={30}
                placeholder="Il tuo nome..."
                className="flex-1 rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              />
              <button
                onClick={handleSaveName}
                disabled={isSavingName || !newName.trim()}
                className="rounded-xl bg-indigo-500/30 border border-indigo-500/40 px-3 py-2 text-xs font-bold text-indigo-200 hover:bg-indigo-500/40 transition-all disabled:opacity-50"
              >
                {isSavingName ? "..." : "✓"}
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-xs text-white/50 hover:bg-white/20 transition-all"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <RankBadge rank={myEntry.rank} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    {myEntry.display_name}
                  </h3>
                  <LevelBadge
                    level={myEntry.level}
                    levelName={myEntry.level_name}
                    levelIcon={myEntry.level_icon}
                  />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-white/50">
                    ⭐ {myEntry.xp} XP
                  </span>
                  <span className="text-xs text-white/50">
                    🏆 {myEntry.achievement_count} achievement
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  #{myEntry.rank}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard table */}
      <div className="space-y-1.5">
        {leaderboard.map((entry) => {
          const isMe = entry.is_me;
          const isTop3 = entry.rank <= 3;

          return (
            <div
              key={entry.user_id}
              className={`
                rounded-xl border p-3 transition-all
                ${
                  isMe
                    ? "bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/10"
                    : isTop3
                    ? "bg-amber-500/5 border-amber-500/15"
                    : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]"
                }
              `}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className="w-10 flex justify-center shrink-0">
                  <RankBadge rank={entry.rank} />
                </div>

                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${
                    isMe
                      ? "bg-gradient-to-br from-indigo-400 to-purple-500"
                      : isTop3
                      ? "bg-gradient-to-br from-amber-400 to-orange-500"
                      : "bg-white/15"
                  }`}
                >
                  {entry.level_icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-sm font-bold truncate ${
                        isMe ? "text-white" : "text-white/80"
                      }`}
                    >
                      {entry.display_name}
                      {isMe && (
                        <span className="text-[10px] text-indigo-300 ml-1">
                          (tu)
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <LevelBadge
                      level={entry.level}
                      levelName={entry.level_name}
                      levelIcon={entry.level_icon}
                    />
                    <span className="text-[10px] text-white/30">
                      Lv.{entry.level}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right shrink-0">
                  <p
                    className={`text-sm font-black ${
                      isTop3
                        ? "bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent"
                        : "text-white/60"
                    }`}
                  >
                    {entry.xp} XP
                  </p>
                  <p className="text-[10px] text-white/30">
                    🏆 {entry.achievement_count}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {leaderboard.length === 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
            <span className="text-5xl block mb-3">🏜️</span>
            <p className="text-sm text-white/50">
              Nessun esploratore in classifica. Sii il primo!
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 rounded-2xl bg-white/[0.03] border border-white/10 p-4">
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
          Livelli
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {LEVELS.map((lvl) => (
            <div
              key={lvl.level}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5"
            >
              <span className="text-sm">{lvl.icon}</span>
              <span className={`text-[11px] font-semibold ${lvl.color}`}>
                Lv.{lvl.level} {lvl.name}
              </span>
              <span className="text-[9px] text-white/20 ml-auto">
                {lvl.minXp}+ XP
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* XP per rarità */}
      <div className="mt-3 rounded-2xl bg-white/[0.03] border border-white/10 p-4">
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
          XP per Achievement
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Comune", xp: 10, color: "text-zinc-400" },
            { label: "Non Comune", xp: 25, color: "text-emerald-400" },
            { label: "Raro", xp: 50, color: "text-blue-400" },
            { label: "Epico", xp: 100, color: "text-purple-400" },
            { label: "Leggendario", xp: 250, color: "text-amber-400" },
          ].map((r) => (
            <div
              key={r.label}
              className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1"
            >
              <span className={`text-[10px] font-bold ${r.color}`}>
                {r.label}
              </span>
              <span className="text-[10px] text-white/40">
                +{r.xp} XP
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Back button */}
      <div className="mt-6 pb-4">
        <button
          onClick={onBack}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/20 px-6 py-4 text-sm font-semibold text-white/70 transition-all hover:bg-white/20 hover:text-white hover:scale-[1.02] active:scale-95"
        >
          ← Torna indietro
        </button>
      </div>
    </div>
  );
}
