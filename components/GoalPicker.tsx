"use client";

// Atalhos com os objetivos mais comuns de aluno de personal — clicar
// preenche o campo de texto, que continua editável livremente pra quem
// tiver um objetivo mais específico que não está na lista.
const GOAL_SHORTCUTS = [
  "Hipertrofia",
  "Emagrecimento",
  "Qualidade de vida",
  "Condicionamento físico",
  "Ganho de força",
  "Definição muscular",
  "Reabilitação",
  "Performance esportiva",
];

export default function GoalPicker({
  value,
  onChange,
  name = "goal",
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {GOAL_SHORTCUTS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onChange(g)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              value === g
                ? "border-orange bg-orange text-white"
                : "border-lightblue/50 text-blue hover:border-orange/50 hover:text-orange"
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
      />
    </div>
  );
}
