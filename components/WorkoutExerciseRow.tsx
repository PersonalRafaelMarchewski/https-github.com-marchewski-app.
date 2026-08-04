"use client";

import { useState, useTransition } from "react";
import Card from "@/components/Card";
import DeleteButton from "@/components/DeleteButton";
import {
  updateWorkoutExercise,
  deleteWorkoutExerciseRow,
} from "@/app/(trainer)/treinos/[id]/actions";

const TREINO_LABELS = ["A", "B", "C", "D", "E", "F"];

export default function WorkoutExerciseRow({
  id,
  workoutId,
  exerciseName,
  initialLabel,
  initialSets,
  initialReps,
  initialLoad,
  initialRestSeconds,
}: {
  id: string;
  workoutId: string;
  exerciseName: string;
  initialLabel: string;
  initialSets: number | null;
  initialReps: string | null;
  initialLoad: string | null;
  initialRestSeconds: number | null;
}) {
  const [label, setLabel] = useState(initialLabel);
  const [sets, setSets] = useState(String(initialSets ?? ""));
  const [reps, setReps] = useState(initialReps ?? "");
  const [load, setLoad] = useState(initialLoad ?? "");
  const [restSeconds, setRestSeconds] = useState(String(initialRestSeconds ?? ""));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setSaved(false);
    const formData = new FormData();
    formData.set("label", label);
    formData.set("sets", sets);
    formData.set("reps", reps);
    formData.set("load", load);
    formData.set("rest_seconds", restSeconds);

    startTransition(async () => {
      try {
        await updateWorkoutExercise(id, workoutId, formData);
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <Card className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[160px]">
        <p className="mb-1 text-sm font-medium text-navy">{exerciseName}</p>
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
        onClick={handleSave}
        disabled={pending}
        className="rounded-lg bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-blue disabled:opacity-50"
      >
        {pending ? "..." : saved ? "Salvo" : "Salvar"}
      </button>

      <DeleteButton
        action={deleteWorkoutExerciseRow.bind(null, id, workoutId)}
        confirmMessage={`Remover "${exerciseName}" deste treino?`}
      />

      {error && <p className="w-full text-xs text-orange">{error}</p>}
    </Card>
  );
}
