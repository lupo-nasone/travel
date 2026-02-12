"use client";

import { useState } from "react";
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
  const initial = (user.email || "U")[0].toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 rounded-full glass px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-white/10 hover:scale-[1.03] active:scale-95"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
          {initial}
        </div>
        <svg className={`w-3.5 h-3.5 text-white/40 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl glass-dropdown overflow-hidden animate-dropdown">
            {/* User info */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="section-label">Account</p>
              <p className="text-sm text-white/70 truncate mt-0.5">
                {user.email}
              </p>
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
