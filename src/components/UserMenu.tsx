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
      <div className="h-9 w-9 rounded-full bg-white/10 animate-pulse" />
    );
  }

  // Not logged in
  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuth(true)}
          className="flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition-all hover:bg-white/20 hover:text-white hover:scale-[1.03] active:scale-95"
        >
          <span>👤</span>
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
        className="flex items-center gap-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-500/30 hover:scale-[1.03] active:scale-95"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
          {initial}
        </div>
        <span className="max-w-[120px] truncate text-white/80 text-xs hidden sm:block">
          {user.email}
        </span>
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl bg-slate-900/95 border border-white/15 backdrop-blur-xl shadow-2xl overflow-hidden animate-fade-in">
            {/* User info */}
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-xs text-white/40 uppercase tracking-wider">
                Account
              </p>
              <p className="text-sm text-white/80 truncate mt-0.5">
                {user.email}
              </p>
            </div>

            {/* Actions */}
            <div className="p-2">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onShowSavedTrips();
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all text-left"
              >
                <span>📋</span>
                I miei viaggi
                {savedTripsCount > 0 && (
                  <span className="ml-auto bg-indigo-500/30 text-indigo-300 text-xs font-bold rounded-full px-2 py-0.5">
                    {savedTripsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  onShowAchievements();
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all text-left"
              >
                <span>🏆</span>
                Achievement
                <span className="ml-auto bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full px-2 py-0.5">
                  {achievementsCount}/{totalAchievements}
                </span>
              </button>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  onShowLeaderboard();
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all text-left"
              >
                <span>🏅</span>
                Classifica
              </button>

              <button
                onClick={async () => {
                  setShowDropdown(false);
                  await signOut();
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400/70 hover:bg-red-500/10 hover:text-red-300 transition-all text-left"
              >
                <span>🚪</span>
                Esci
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
