"use client";

import { JOINT_TYPE_OPTIONS } from "@/lib/jointType";

// Igual ao LevelPicker, mas opcional: clicar de novo na opção já
// selecionada limpa (fica "não definido") — nem todo exercício precisa
// estar classificado pra já poder ser salvo.
export default function JointTypePicker({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1.5 ${className}`}>
      {JOINT_TYPE_OPTIONS.map((j) => (
        <button
          key={j.value}
          type="button"
          onClick={() => onChange(value === j.value ? "" : j.value)}
          className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
            value === j.value
              ? "border-orange bg-orange text-white"
              : "border-lightblue/50 text-navy hover:border-orange/50"
          }`}
        >
          {j.label}
        </button>
      ))}
    </div>
  );
}
