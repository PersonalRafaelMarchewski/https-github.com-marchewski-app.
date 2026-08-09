"use client";

import { useState, useTransition } from "react";
import Card from "@/components/Card";
import DeleteButton from "@/components/DeleteButton";
import { METHOD_OPTIONS } from "@/lib/workoutMethods";
import SetPresetPicker from "@/components/SetPresetPicker";
import { isCardioGroup } from "@/lib/cardio";
import {
  updateWorkoutExercise,
  deleteWorkoutExerciseRow,
} from "@/app/(trainer)/treinos/[id]/actions";

const TREINO_LABELS = ["A", "B", "C", "D", "E", "F"];

export default function WorkoutExerciseRow({
  id,
  workoutId,
  exerciseName,
  muscleGroup,
  initialLabel,
  initialSets,
  initialReps,
  initialLoad,
  initialRestSeconds,
  initialMethod,
}: {
  id: string;
  workoutId: string;
  exerciseName: string;
  muscleGroup?: string | null;
  initialLabel: string;
  initialSets: number | null;
  initialReps: string | null;
  initialLoad: string | null;
  initialRestSeconds: number | null;
  initialMethod?: string | null;
}) {
  const cardio = isCardioGroup(muscleGroup);
  const [label, setLabel] = useState(initialLabel);
  const [sets, setSets] = useState(String(initialSets ?? ""));
  const [reps, setReps] = useState(initialReps ?? "");
  const [load, setLoad] = useState(initialLoad ?? "");
  const [restSeconds, setRestSeconds] = useState(String(initialRestSeconds ?? ""));
  const [method, setMethod] = useState(initialMethod ?? "");
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
    formData.set("method", method);

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
    <Card className="grid grid-cols-2 gap-3 border-l-4 border-l-navy sm:flex sm:flex-wrap sm:items-end">
      <div className="col-span-2 sm:flex-1 sm:min-w-[160px]">
        <p className="mb-1 text-sm font-medium text-navy">{exerciseName}</p>
      </div>

      <div className="sm:w-20">
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

      <div className="sm:w-16">
        <label className="mb-1 block text-xs text-blue">Séries</label>
        <input
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
        />
      </div>

      <div className="sm:w-20">
        <label className="mb-1 block text-xs text-blue">{cardio ? "Duração" : "Reps"}</label>
        <input
          value={reps}
          placeholder={cardio ? "20 min" : undefined}
          onChange={(e) => setReps(e.target.value)}
          className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
        />
      </div>

      <div className="sm:w-24">
        <label className="mb-1 block text-xs text-blue">Carga</label>
        <input
          value={load}
          onChange={(e) => setLoad(e.target.value)}
          className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
        />
      </div>

      <div className="sm:w-20">
        <label className="mb-1 block text-xs text-blue">Descanso</label>
        <input
          value={restSeconds}
          onChange={(e) => setRestSeconds(e.target.value)}
          className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
        />
      </div>

      <div className="sm:w-32">
        <label className="mb-1 block text-xs text-blue">Método</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
        >
          <option value="">Normal</option>
          {METHOD_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:w-28">
        <label className="mb-1 block text-xs text-blue">&nbsp;</label>
        <SetPresetPicker
          className="w-full py-1.5"
          onApply={(preset) => {
            setSets(preset.sets);
            setReps(preset.reps);
            setRestSeconds(preset.rest_seconds);
            setMethod(preset.method);
          }}
        />
      </div>

      <div className="col-span-2 flex items-center gap-2 sm:col-auto">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="flex-1 rounded-lg bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-blue disabled:opacity-50 sm:flex-none"
        >
          {pending ? "..." : saved ? "Salvo" : "Salvar"}
        </button>

        <DeleteButton
          action={deleteWorkoutExerciseRow.bind(null, id, workoutId)}
          confirmMessage={`Remover "${exerciseName}" deste treino?`}
        />
      </div>

      {error && <p className="col-span-2 text-xs text-orange sm:w-full">{error}</p>}
    </Card>
  );
}
