"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signInWithEmail, signUpWithEmail } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const { error: err } = await signUpWithEmail(email, password);
        if (err) {
          setError(err);
        } else {
          setSuccess(
            "Registrazione avvenuta! Controlla la tua email per confermare l'account."
          );
          setEmail("");
          setPassword("");
        }
      } else {
        const { error: err } = await signInWithEmail(email, password);
        if (err) {
          setError(err);
        } else {
          onClose();
        }
      }
    } catch {
      setError("Errore imprevisto. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900/95 border border-white/15 backdrop-blur-xl shadow-2xl overflow-hidden animate-card-appear">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-b border-white/10 px-6 py-5 text-center">
          <h2 className="text-xl font-bold text-white">
            {isSignUp ? "Crea il tuo account" : "Accedi"}
          </h2>
          <p className="text-sm text-white/50 mt-1">
            {isSignUp
              ? "Registrati per salvare i tuoi viaggi"
              : "Accedi per ritrovare i tuoi viaggi salvati"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="la-tua@email.it"
              className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/15 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Minimo 6 caratteri"
              className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/15 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-2.5 text-sm text-red-300">
              ❌ {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 text-sm text-emerald-300">
              ✅ {success}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-wait disabled:hover:scale-100 shadow-lg shadow-indigo-500/25"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {isSignUp ? "Registro..." : "Accedo..."}
              </span>
            ) : isSignUp ? (
              "🚀 Registrati"
            ) : (
              "🔓 Accedi"
            )}
          </button>

          {/* Toggle sign up / sign in */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setSuccess("");
              }}
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              {isSignUp
                ? "Hai già un account? Accedi"
                : "Non hai un account? Registrati"}
            </button>
          </div>
        </form>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors text-xl leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
