"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import Card from "@/components/Card";
import { addWorkoutExercise } from "@/app/(trainer)/treinos/[id]/actions";

const TREINO_LABELS = ["A", "B", "C", "D", "E", "F"];

type Exercise = { id: string; name: string };

export default function AddExerciseRow({
  workoutId,
  exercises,
}: {
  workoutId: string;
  exercises: Exercise[];
}) {
  const [exerciseId, setExerciseId] = useState("");
  const [label, setLabel] = useState("A");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10-12");
  const [load, setLoad] = useState("");
  const [restSeconds, setRestSeconds] = useState("60");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    if (!exerciseId) {
      setError("Escolha um exercício.");
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set("exercise_id", exerciseId);
    formData.set("label", label);
    formData.set("sets", sets);
    formData.set("reps", reps);
    formData.set("load", load);
    formData.set("rest_seconds", restSeconds);

    startTransition(async () => {
      try {
        await addWorkoutExercise(workoutId, formData);
        setExerciseId("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao adicionar.");
      }
    });
  }

  return (
    <Card className="flex flex-wrap items-end gap-3 border-dashed">
      <div className="flex-1 min-w-[180px]">
        <label className="mb-1 block text-xs text-blue">Exercício</label>
        <select
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
          className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
        >
          <option value="">Selecione</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>

      <div className="w-20">
        <label className="mb-1 block text-xs text-blue">Treino</label>
        <select
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
        >
          {TREINO_LABELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="w-16">
        <label className="mb-1 block text-xs text-blue">Séries</label>
        <input
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
        />
      </div>

      <div className="w-20">
        <label className="mb-1 block text-xs text-blue">Reps</label>
        <input
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
        />
      </div>

      <div className="w-24">
        <label className="mb-1 block text-xs text-blue">Carga</label>
        <input
          value={load}
          onChange={(e) => setLoad(e.target.value)}
          placeholder="20kg"
          className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
        />
      </div>

      <div className="w-20">
        <label className="mb-1 block text-xs text-blue">Descanso</label>
        <input
          value={restSeconds}
          onChange={(e) => setRestSeconds(e.target.value)}
          className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
        />
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={pending}
        className="flex items-center gap-1 rounded-lg bg-orange px-3 py-1.5 text-sm font-medium text-white hover:bg-orange2 disabled:opacity-50"
      >
        <Plus size={14} />
        {pending ? "..." : "Adicionar"}
      </button>

      {error && <p className="w-full text-xs text-orange">{error}</p>}
    </Card>
  );
}
