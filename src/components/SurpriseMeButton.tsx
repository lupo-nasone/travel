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
  const colors =
    mode === "tourist"
      ? "from-emerald-400 to-teal-600 shadow-emerald-500/40 hover:shadow-emerald-500/60"
      : "from-orange-400 to-red-600 shadow-orange-500/40 hover:shadow-orange-500/60";

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        group relative overflow-hidden rounded-full bg-gradient-to-br ${colors}
        px-10 py-5 text-lg font-bold text-white shadow-2xl
        transition-all duration-500 ease-out
        hover:scale-110 hover:shadow-2xl
        active:scale-95
        disabled:opacity-70 disabled:cursor-wait disabled:hover:scale-100
      `}
    >
      {/* Pulse ring animation */}
      {!isLoading && (
        <>
          <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-20" />
          <span
            className="absolute inset-0 rounded-full bg-white/10 animate-ping opacity-10"
            style={{ animationDelay: "0.5s" }}
          />
        </>
      )}

      <span className="relative z-10 flex items-center gap-3">
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
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
            <span>Sto cercando...</span>
          </>
        ) : (
          <>
            <span className="text-2xl transition-transform duration-300 group-hover:rotate-12">
              🎲
            </span>
            <span>Trova un posto a caso!</span>
          </>
        )}
      </span>
    </button>
  );
}
