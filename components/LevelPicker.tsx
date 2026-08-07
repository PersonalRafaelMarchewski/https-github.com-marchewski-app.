"use client";

import { LEVEL_OPTIONS } from "@/lib/level";

export default function LevelPicker({
  name = "level",
  value,
  onChange,
}: {
  name?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex gap-2">
        {LEVEL_OPTIONS.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => onChange(l.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              value === l.value
                ? "border-orange bg-orange text-white"
                : "border-lightblue/50 text-navy hover:border-orange/50"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
