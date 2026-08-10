"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import ExercisePicker from "@/components/ExercisePicker";
import { setExerciseAlternatives } from "@/app/(trainer)/exercicios/actions";

type Exercise = { id: string; name: string; muscle_group: string | null };

// Alternativas de um exercício (ex: leg press e agachamento livre como
// alternativa do agachamento no Smith) — pro aluno trocar na hora se a
// máquina estiver ocupada ou não existir na academia dele.
export default function ExerciseAlternativesPicker({
  exerciseId,
  exercises,
  initialAlternativeIds,
}: {
  exerciseId: string;
  exercises: Exercise[];
  initialAlternativeIds: string[];
}) {
  const [selectedIds, setSelectedIds] = useState(initialAlternativeIds);
  const [addingId, setAddingId] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const options = exercises.filter((e) => e.id !== exerciseId && !selectedIds.includes(e.id));
  const selected = selectedIds
    .map((id) => exercises.find((e) => e.id === id))
    .filter((e): e is Exercise => Boolean(e));

  function persist(next: string[]) {
    setError(null);
    startTransition(async () => {
      try {
        await setExerciseAlternatives(exerciseId, next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  function addAlternative(id: string) {
    if (!id) return;
    const next = [...selectedIds, id];
    setSelectedIds(next);
    setAddingId("");
    persist(next);
  }

  function removeAlternative(id: string) {
    const next = selectedIds.filter((i) => i !== id);
    setSelectedIds(next);
    persist(next);
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-blue">
        Alternativas <span className="font-normal">(pra quando a máquina estiver ocupada)</span>
      </label>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((ex) => (
            <span
              key={ex.id}
              className="flex items-center gap-1 rounded-full bg-lightblue/15 px-2.5 py-1 text-xs text-navy"
            >
              {ex.name}
              <button
                type="button"
                onClick={() => removeAlternative(ex.id)}
                aria-label={`Remover ${ex.name} das alternativas`}
                className="text-blue hover:text-orange"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <ExercisePicker
        exercises={options}
        value={addingId}
        onChange={addAlternative}
        placeholder="+ Adicionar alternativa..."
      />
      {pending && <p className="mt-1 text-xs text-blue">Salvando...</p>}
      {error && <p className="mt-1 text-xs text-orange">{error}</p>}
    </div>
  );
}
