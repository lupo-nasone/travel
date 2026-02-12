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
  const [username, setUsername] = useState("");
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
        if (!username.trim()) {
          setError("Username obbligatorio");
          setIsSubmitting(false);
          return;
        }
        const { error: err } = await signUpWithEmail(email, password, username.trim());
        if (err) {
          setError(err);
        } else {
          setSuccess(
            "Registrazione avvenuta! Controlla la tua email per confermare l'account."
          );
          setEmail("");
          setPassword("");
          setUsername("");
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
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-3xl glass-dropdown overflow-hidden animate-card-appear">
        {/* Header */}
        <div className="relative px-6 py-6 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent" />
          <div className="relative">
            <h2 className="text-xl font-bold text-white">
              {isSignUp ? "Crea il tuo account" : "Accedi"}
            </h2>
            <p className="text-sm text-white/40 mt-1">
              {isSignUp
                ? "Registrati per salvare i tuoi viaggi"
                : "Accedi per ritrovare i tuoi viaggi salvati"}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {isSignUp && (
            <div>
              <label className="section-label mb-1.5 block">
                Username *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={isSignUp}
                maxLength={30}
                placeholder="Il tuo nome utente"
                className="w-full rounded-xl input-glass px-4 py-3 text-sm text-white placeholder-white/25"
              />
            </div>
          )}

          <div>
            <label className="section-label mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="la-tua@email.it"
              className="w-full rounded-xl input-glass px-4 py-3 text-sm text-white placeholder-white/25"
            />
          </div>

          <div>
            <label className="section-label mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Minimo 6 caratteri"
              className="w-full rounded-xl input-glass px-4 py-3 text-sm text-white placeholder-white/25"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-300/80">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-sm text-emerald-300/80">
              {success}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/20 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait disabled:hover:shadow-none disabled:hover:brightness-100"
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
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] text-white/30 hover:bg-white/10 hover:text-white/70 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}
