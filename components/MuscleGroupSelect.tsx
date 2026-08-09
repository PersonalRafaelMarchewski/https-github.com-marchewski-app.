"use client";

import { useState } from "react";
import { MUSCLE_GROUP_OPTIONS } from "@/lib/muscleGroups";

const CUSTOM = "__custom__";

// Select com os grupos musculares prontos + opção de digitar um outro
// (pra não travar quem tem um caso fora da lista, ex: "Core", "Panturrilha
// unilateral").
export default function MuscleGroupSelect({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const isPreset = (MUSCLE_GROUP_OPTIONS as readonly string[]).includes(value);
  const [customMode, setCustomMode] = useState(value !== "" && !isPreset);

  if (customMode) {
    return (
      <div className="space-y-1">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite o grupo muscular"
          className={className}
        />
        <button
          type="button"
          onClick={() => {
            setCustomMode(false);
            onChange("");
          }}
          className="text-xs text-blue hover:underline"
        >
          Escolher da lista
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === CUSTOM) {
          setCustomMode(true);
          onChange("");
        } else {
          onChange(e.target.value);
        }
      }}
      className={className}
    >
      <option value="">Selecione...</option>
      {MUSCLE_GROUP_OPTIONS.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
      <option value={CUSTOM}>Outro (digitar)</option>
    </select>
  );
}
