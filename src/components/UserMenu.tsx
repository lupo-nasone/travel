"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import AuthModal from "./AuthModal";

interface UserMenuProps {
  onShowSavedTrips: () => void;
  savedTripsCount: number;
  onShowAchievements: () => void;
  achievementsCount: number;
  totalAchievements: number;
  onShowLeaderboard: () => void;
}

export default function UserMenu({
  onShowSavedTrips,
  savedTripsCount,
  onShowAchievements,
  achievementsCount,
  totalAchievements,
  onShowLeaderboard,
}: UserMenuProps) {
  const { user, isLoading, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Fetch display_name when user is logged in
  const fetchDisplayName = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/username");
      const data = await res.json();
      if (res.ok) {
        setDisplayName(data.display_name || "");
      }
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    fetchDisplayName();
  }, [fetchDisplayName]);

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setIsSavingName(true);
    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: trimmed }),
      });
      if (res.ok) {
        setDisplayName(trimmed);
        setEditingName(false);
      }
    } catch {
      // ignore
    } finally {
      setIsSavingName(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-9 w-9 rounded-full skeleton-circle" />
    );
  }

  // Not logged in
  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuth(true)}
          className="flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium text-white/60 transition-all hover:bg-white/10 hover:text-white hover:scale-[1.03] active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
          Accedi
        </button>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </>
    );
  }

  // Logged in
  const initial = (displayName || user.email || "U")[0].toUpperCase();
  const shownName = displayName || user.email || "Utente";

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 rounded-full glass px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-white/10 hover:scale-[1.03] active:scale-95"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
          {initial}
        </div>
        <span className="max-w-[100px] truncate text-white/70 text-xs hidden sm:block">
          {displayName || undefined}
        </span>
        <svg className={`w-3.5 h-3.5 text-white/40 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setShowDropdown(false); setEditingName(false); }}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl glass-dropdown overflow-hidden animate-dropdown">
            {/* User info / username edit */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              {editingName ? (
                <div className="space-y-2">
                  <p className="section-label">Modifica username</p>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      maxLength={30}
                      placeholder="Il tuo username..."
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                      className="flex-1 rounded-lg input-glass px-2.5 py-1.5 text-sm text-white placeholder-white/25"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isSavingName || !newName.trim()}
                      className="rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1.5 text-xs font-bold text-indigo-300/80 hover:bg-indigo-500/30 transition-all disabled:opacity-40"
                    >
                      {isSavingName ? "..." : "✓"}
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      className="rounded-lg glass-subtle px-2.5 py-1.5 text-xs text-white/40 hover:bg-white/[0.06] transition-all"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {shownName}
                    </p>
                    {displayName && (
                      <p className="text-[11px] text-white/35 truncate mt-0.5">
                        {user.email}
                      </p>
                    )}
                    {!displayName && (
                      <p className="text-[10px] text-white/30 mt-0.5">
                        Imposta un username ↗
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setNewName(displayName);
                      setEditingName(true);
                    }}
                    className="shrink-0 ml-2 rounded-lg glass-subtle px-2 py-1.5 text-[10px] text-white/35 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                    title="Modifica username"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-1.5">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onShowSavedTrips();
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.06] hover:text-white transition-all text-left"
              >
                <span className="text-base">📋</span>
                <span className="flex-1">I miei viaggi</span>
                {savedTripsCount > 0 && (
                  <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 rounded-full px-2 py-0.5 tabular-nums">
                    {savedTripsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  onShowAchievements();
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.06] hover:text-white transition-all text-left"
              >
                <span className="text-base">🏆</span>
                <span className="flex-1">Achievement</span>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 rounded-full px-2 py-0.5 tabular-nums">
                  {achievementsCount}/{totalAchievements}
                </span>
              </button>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  onShowLeaderboard();
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.06] hover:text-white transition-all text-left"
              >
                <span className="text-base">🏅</span>
                <span className="flex-1">Classifica</span>
              </button>

              <div className="my-1 mx-3 h-px bg-white/[0.06]" />

              <button
                onClick={async () => {
                  setShowDropdown(false);
                  await signOut();
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400/60 hover:bg-red-500/[0.06] hover:text-red-300 transition-all text-left"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                <span>Esci</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
