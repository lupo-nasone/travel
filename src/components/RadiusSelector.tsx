"use client";

import { useState } from "react";

interface RadiusSelectorProps {
  radius: number;
  onChange: (radius: number) => void;
}

const PRESETS = [50, 100, 200, 300, 500];

export default function RadiusSelector({ radius, onChange }: RadiusSelectorProps) {
  const [inputValue, setInputValue] = useState(String(radius));

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setInputValue(String(val));
    onChange(val);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setInputValue(raw);
    const val = Number(raw);
    if (val >= 10 && val <= 1000) {
      onChange(val);
    }
  };

  const handleInputBlur = () => {
    let val = Number(inputValue);
    if (isNaN(val) || val < 10) val = 10;
    if (val > 1000) val = 1000;
    setInputValue(String(val));
    onChange(val);
  };

  const handlePreset = (val: number) => {
    setInputValue(String(val));
    onChange(val);
  };

  // Calculate fill percentage for the slider track
  const fillPercent = ((radius - 10) / (1000 - 10)) * 100;

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <span className="text-sm font-medium text-white/60 uppercase tracking-wider">
        Raggio d&apos;azione
      </span>

      {/* Number input + km label */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className="w-24 rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-center text-2xl font-bold text-white outline-none transition-all focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/10"
          />
        </div>
        <span className="text-lg font-semibold text-white/50">km</span>
      </div>

      {/* Slider */}
      <div className="relative w-full px-1">
        <input
          type="range"
          min={10}
          max={1000}
          step={5}
          value={radius}
          onChange={handleSliderChange}
          className="radius-slider w-full"
        />
        {/* Custom track fill */}
        <div
          className="pointer-events-none absolute top-1/2 left-1 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-400 to-orange-400 transition-all"
          style={{ width: `calc(${fillPercent}% - 4px)` }}
        />
      </div>

      {/* Quick presets */}
      <div className="flex gap-2">
        {PRESETS.map((val) => (
          <button
            key={val}
            onClick={() => handlePreset(val)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              radius === val
                ? "bg-white/20 text-white ring-1 ring-white/30"
                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
            }`}
          >
            {val}
          </button>
        ))}
      </div>
    </div>
  );
}
