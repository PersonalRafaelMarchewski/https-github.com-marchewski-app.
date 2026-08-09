"use client";

import { SET_PRESETS, type SetPreset } from "@/lib/setPresets";

export default function SetPresetPicker({
  onApply,
  className = "",
}: {
  onApply: (preset: SetPreset) => void;
  className?: string;
}) {
  return (
    <select
      value=""
      onChange={(e) => {
        const preset = SET_PRESETS.find((p) => p.name === e.target.value);
        if (preset) {
          onApply({
            sets: preset.sets,
            reps: preset.reps,
            rest_seconds: preset.rest_seconds,
            method: preset.method,
          });
        }
        e.target.value = "";
      }}
      className={`rounded-lg border border-lightblue/50 px-2 py-1.5 text-xs text-blue outline-none focus:border-orange ${className}`}
    >
      <option value="">Preset...</option>
      {SET_PRESETS.map((p) => (
        <option key={p.name} value={p.name}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
