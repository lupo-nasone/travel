"use client";

interface SurpriseMeButtonProps {
  onClick: () => void;
  isLoading: boolean;
  mode: "tourist" | "biker";
}

export default function SurpriseMeButton({
  onClick,
  isLoading,
  mode,
}: SurpriseMeButtonProps) {
  const gradient =
    mode === "tourist"
      ? "from-emerald-500 to-teal-600"
      : "from-orange-500 to-red-600";

  const glow =
    mode === "tourist"
      ? "shadow-emerald-500/25 hover:shadow-emerald-500/40"
      : "shadow-orange-500/25 hover:shadow-orange-500/40";

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient}
        px-10 py-4 text-base font-bold text-white shadow-xl ${glow}
        transition-all duration-300 ease-out
        hover:scale-105
        active:scale-[0.97]
        disabled:opacity-60 disabled:cursor-wait disabled:hover:scale-100
      `}
    >
      <span className="relative z-10 flex items-center gap-2.5">
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Sto cercando...</span>
          </>
        ) : (
          <>
            <span className="text-xl transition-transform duration-300 group-hover:rotate-[20deg]">🎲</span>
            <span>Sorprendimi!</span>
          </>
        )}
      </span>
    </button>
  );
}
