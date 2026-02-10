"use client";

import { useState, useCallback } from "react";

interface RadiusSelectorProps {
  minRadius: number;
  maxRadius: number;
  allowAbroad: boolean;
  onChangeMin: (min: number) => void;
  onChangeMax: (max: number) => void;
  onChangeAbroad: (abroad: boolean) => void;
  /** When false, only the abroad toggle is shown (no km range UI). Default true. */
  showRange?: boolean;
}

const RANGE_PRESETS: { label: string; min: number; max: number }[] = [
  { label: "Vicino", min: 10, max: 50 },
  { label: "Medio", min: 50, max: 150 },
  { label: "Lontano", min: 150, max: 400 },
  { label: "Estremo", min: 400, max: 1000 },
];

// Non-linear scale: maps 0–1 to 10–1500 with fine precision at low values
// Uses a power curve so that the first 50% of the slider covers ~10-200km
const SLIDER_MIN = 10;
const SLIDER_MAX = 1500;
const POWER = 2.5; // higher = more precision at low values

function sliderToKm(sliderVal: number): number {
  // sliderVal is 0–1000 (integer range of the HTML slider)
  const t = sliderVal / 1000; // normalize to 0–1
  const km = SLIDER_MIN + (SLIDER_MAX - SLIDER_MIN) * Math.pow(t, POWER);
  // Round to nice steps: 5km under 200, 10km under 500, 25km above
  if (km < 200) return Math.round(km / 5) * 5;
  if (km < 500) return Math.round(km / 10) * 10;
  return Math.round(km / 25) * 25;
}

function kmToSlider(km: number): number {
  const t = Math.pow((km - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN), 1 / POWER);
  return Math.round(t * 1000);
}

export default function RadiusSelector({
  minRadius,
  maxRadius,
  allowAbroad,
  onChangeMin,
  onChangeMax,
  onChangeAbroad,
  showRange = true,
}: RadiusSelectorProps) {
  const [minInput, setMinInput] = useState(String(minRadius));
  const [maxInput, setMaxInput] = useState(String(maxRadius));

  const handleMinSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const km = sliderToKm(Number(e.target.value));
    const clamped = Math.min(km, maxRadius - 5);
    setMinInput(String(clamped));
    onChangeMin(clamped);
  }, [maxRadius, onChangeMin]);

  const handleMaxSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const km = sliderToKm(Number(e.target.value));
    const clamped = Math.max(km, minRadius + 5);
    setMaxInput(String(clamped));
    onChangeMax(clamped);
  }, [minRadius, onChangeMax]);

  const handleMinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setMinInput(raw);
    const val = Number(raw);
    if (val >= 10 && val < maxRadius) {
      onChangeMin(val);
    }
  };

  const handleMaxInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setMaxInput(raw);
    const val = Number(raw);
    if (val > minRadius && val <= 1500) {
      onChangeMax(val);
    }
  };

  const handleMinBlur = () => {
    let val = Number(minInput);
    if (isNaN(val) || val < 10) val = 10;
    if (val >= maxRadius) val = maxRadius - 5;
    setMinInput(String(val));
    onChangeMin(val);
  };

  const handleMaxBlur = () => {
    let val = Number(maxInput);
    if (isNaN(val) || val <= minRadius) val = minRadius + 5;
    if (val > 1500) val = 1500;
    setMaxInput(String(val));
    onChangeMax(val);
  };

  const handlePreset = (min: number, max: number) => {
    setMinInput(String(min));
    setMaxInput(String(max));
    onChangeMin(min);
    onChangeMax(max);
  };

  // Convert km values to slider percentages for the visual fill
  const minPercent = (kmToSlider(minRadius) / 1000) * 100;
  const maxPercent = (kmToSlider(maxRadius) / 1000) * 100;

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      {/* Abroad toggle — at the top, near the radius */}
      <div className="w-full">
        <label className="flex cursor-pointer items-center justify-center gap-3">
          <input
            type="checkbox"
            checked={allowAbroad}
            onChange={(e) => onChangeAbroad(e.target.checked)}
            className="peer sr-only"
          />
          <div className="relative h-5 w-9 shrink-0 rounded-full bg-white/15 transition-colors peer-checked:bg-emerald-500/60">
            <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm text-white/60">
            🌍 Posso uscire dall&apos;Italia
          </span>
        </label>
      </div>

      {/* Show range selector only when showRange is true AND NOT abroad */}
      {showRange && !allowAbroad ? (
        <>
          <span className="text-sm font-medium text-white/60 uppercase tracking-wider">
            Distanza — scegli il range
          </span>

          {/* Min/Max inputs */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Min</span>
              <input
                type="text"
                inputMode="numeric"
                value={minInput}
                onChange={handleMinInput}
                onBlur={handleMinBlur}
                className="w-20 rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-center text-xl font-bold text-white outline-none transition-all focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/10"
              />
            </div>
            <span className="text-lg font-semibold text-white/30 mt-4">—</span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Max</span>
              <input
                type="text"
                inputMode="numeric"
                value={maxInput}
                onChange={handleMaxInput}
                onBlur={handleMaxBlur}
                className="w-20 rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-center text-xl font-bold text-white outline-none transition-all focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/10"
              />
            </div>
            <span className="text-lg font-semibold text-white/50 mt-4">km</span>
          </div>

          {/* Single track with two thumbs */}
          <div className="relative w-full h-10 px-3">
            {/* Background track */}
            <div className="absolute top-1/2 left-3 right-3 h-2 -translate-y-1/2 rounded-full bg-white/10" />
            {/* Active range fill */}
            <div
              className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-400 to-orange-400"
              style={{
                left: `calc(${minPercent}% * 0.94 + 12px)`,
                right: `calc(${(100 - maxPercent)}% * 0.94 + 12px)`,
              }}
            />
            {/* Min thumb slider */}
            <input
              type="range"
              min={0}
              max={1000}
              step={1}
              value={kmToSlider(minRadius)}
              onChange={handleMinSlider}
              className="range-thumb absolute inset-0 w-full"
            />
            {/* Max thumb slider */}
            <input
              type="range"
              min={0}
              max={1000}
              step={1}
              value={kmToSlider(maxRadius)}
              onChange={handleMaxSlider}
              className="range-thumb absolute inset-0 w-full"
            />
          </div>

          {/* Scale labels */}
          <div className="flex w-full justify-between px-3 -mt-2">
            <span className="text-[10px] text-white/25">10 km</span>
            <span className="text-[10px] text-white/25">100</span>
            <span className="text-[10px] text-white/25">300</span>
            <span className="text-[10px] text-white/25">700</span>
            <span className="text-[10px] text-white/25">1500</span>
          </div>

          {/* Quick range presets */}
          <div className="flex gap-2">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p.min, p.max)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  minRadius === p.min && maxRadius === p.max
                    ? "bg-white/20 text-white ring-1 ring-white/30"
                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                }`}
              >
                {p.label}
                <span className="block text-[10px] text-white/30 font-normal">
                  {p.min}-{p.max}km
                </span>
              </button>
            ))}
          </div>
        </>
      ) : showRange && allowAbroad ? (
        <div className="animate-fade-in rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center">
          <p className="text-sm text-emerald-300">
            🌍 Modalità internazionale — l&apos;IA cercherà mete in tutta Europa senza limiti di distanza
          </p>
        </div>
      ) : null}
    </div>
  );
}
