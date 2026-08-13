"use client";

import { ACTIVITY_LEVEL_OPTIONS } from "@/lib/activityLevel";

export default function ActivityLevelPicker({
  name = "activity_level",
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
      <div className="space-y-1.5">
        {ACTIVITY_LEVEL_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              value === o.value
                ? "border-orange bg-orange/10"
                : "border-lightblue/50 hover:border-orange/50"
            }`}
          >
            <span className="font-medium text-navy">{o.label}</span>
            <span className="text-xs text-blue">{o.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
