"use client";

interface LocationStatusProps {
  status: "idle" | "loading" | "success" | "error";
  errorMessage?: string;
}

export default function LocationStatus({ status, errorMessage }: LocationStatusProps) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-2 text-[12px] rounded-xl px-3 py-2 glass-subtle">
      {status === "loading" && (
        <>
          <div className="h-1.5 w-1.5 rounded-full bg-yellow-400/70 animate-pulse" />
          <span className="text-white/35">Localizzazione in corso...</span>
        </>
      )}
      {status === "success" && (
        <>
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
          <span className="text-emerald-400/50">Posizione trovata</span>
        </>
      )}
      {status === "error" && (
        <>
          <div className="h-1.5 w-1.5 rounded-full bg-red-400/70" />
          <span className="text-red-400/50">{errorMessage || "Errore geolocalizzazione"}</span>
        </>
      )}
    </div>
  );
}
