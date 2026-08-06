"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import Card from "@/components/Card";
import ExercisePicker from "@/components/ExercisePicker";
import { METHOD_OPTIONS } from "@/lib/workoutMethods";
import { isCardioGroup } from "@/lib/cardio";
import { addWorkoutExercise } from "@/app/(trainer)/treinos/[id]/actions";

const TREINO_LABELS = ["A", "B", "C", "D", "E", "F"];

type Exercise = { id: string; name: string; muscle_group?: string | null };

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
  const [method, setMethod] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cardio = isCardioGroup(exercises.find((e) => e.id === exerciseId)?.muscle_group);

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
    formData.set("method", method);

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
    <Card className="grid grid-cols-2 gap-3 border-dashed sm:flex sm:flex-wrap sm:items-end">
      <div className="col-span-2 sm:flex-1 sm:min-w-[180px]">
        <label className="mb-1 block text-xs text-blue">Exercício</label>
        <ExercisePicker
          exercises={exercises}
          value={exerciseId}
          onChange={(id) => {
            const picked = exercises.find((e) => e.id === id);
            if (isCardioGroup(picked?.muscle_group)) {
              if (reps === "10-12") setReps("20 min");
              if (sets === "3") setSets("1");
            }
            setExerciseId(id);
          }}
        />
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
          placeholder="20kg"
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

      <button
        type="button"
        onClick={handleAdd}
        disabled={pending}
        className="col-span-2 flex items-center justify-center gap-1 rounded-lg bg-orange px-3 py-1.5 text-sm font-medium text-white hover:bg-orange2 disabled:opacity-50 sm:col-auto"
      >
        <Plus size={14} />
        {pending ? "..." : "Adicionar"}
      </button>

      {error && <p className="col-span-2 text-xs text-orange">{error}</p>}
    </Card>
  );
}
