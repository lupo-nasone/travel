"use client";

interface LocationStatusProps {
  status: "idle" | "loading" | "success" | "error";
  errorMessage?: string;
}

export default function LocationStatus({ status, errorMessage }: LocationStatusProps) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {status === "loading" && (
        <>
          <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-white/60">Localizzazione in corso...</span>
        </>
      )}
      {status === "success" && (
        <>
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-emerald-400/80">Posizione rilevata</span>
        </>
      )}
      {status === "error" && (
        <>
          <div className="h-2 w-2 rounded-full bg-red-400" />
          <span className="text-red-400/80">{errorMessage || "Errore geolocalizzazione"}</span>
        </>
      )}
    </div>
  );
}
