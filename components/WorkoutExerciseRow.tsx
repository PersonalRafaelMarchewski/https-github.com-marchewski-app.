"use client";

import { useState, useTransition } from "react";
import { PlayCircle } from "lucide-react";
import Card from "@/components/Card";
import DeleteButton from "@/components/DeleteButton";
import { METHOD_OPTIONS } from "@/lib/workoutMethods";
import SetPresetPicker from "@/components/SetPresetPicker";
import { isCardioGroup } from "@/lib/cardio";
import {
  updateWorkoutExercise,
  deleteWorkoutExerciseRow,
  setWorkoutExerciseActive,
} from "@/app/(trainer)/treinos/[id]/actions";

export default function WorkoutExerciseRow({
  id,
  workoutId,
  exerciseName,
  muscleGroup,
  videoUrl,
  initialLabel,
  initialSets,
  initialReps,
  initialLoad,
  initialRestSeconds,
  initialMethod,
  initialNotes,
  active = true,
}: {
  id: string;
  workoutId: string;
  exerciseName: string;
  muscleGroup?: string | null;
  videoUrl?: string | null;
  initialLabel: string;
  initialSets: number | null;
  initialReps: string | null;
  initialLoad: string | null;
  initialRestSeconds: number | null;
  initialMethod?: string | null;
  // observação da ficha (ex: "executar na máquina") — o aluno vê no card
  initialNotes?: string | null;
  // arquivado: some da ficha ativa (aluno não vê mais) mas o histórico
  // que ele já registrou continua intacto, já que a linha não é apagada
  active?: boolean;
}) {
  const cardio = isCardioGroup(muscleGroup);
  const label = initialLabel;
  const [sets, setSets] = useState(String(initialSets ?? ""));
  const [reps, setReps] = useState(initialReps ?? "");
  const [load, setLoad] = useState(initialLoad ?? "");
  const [restSeconds, setRestSeconds] = useState(String(initialRestSeconds ?? ""));
  const [method, setMethod] = useState(initialMethod ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(active);
  const [archivePending, startArchiveTransition] = useTransition();
  const [archiveError, setArchiveError] = useState<string | null>(null);

  function handleToggleActive() {
    setArchiveError(null);
    const next = !isActive;
    startArchiveTransition(async () => {
      try {
        const result = await setWorkoutExerciseActive(id, workoutId, next);
        if (result.error) setArchiveError(result.error);
        else setIsActive(next);
      } catch (err) {
        setArchiveError(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

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
    formData.set("notes", notes);

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
    <Card
      className={`grid grid-cols-2 gap-3 border-l-4 sm:flex sm:flex-wrap sm:items-end ${
        isActive ? "border-l-navy" : "border-l-blue/40 opacity-60"
      }`}
    >
      <div className="col-span-2 flex items-center gap-2 sm:flex-1 sm:min-w-[160px]">
        <p className="mb-1 text-sm font-medium text-navy">{exerciseName}</p>
        {!isActive && (
          <span className="mb-1 flex-none rounded-full bg-blue/10 px-2 py-0.5 text-xs font-medium text-blue">
            Arquivado
          </span>
        )}
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-1 flex flex-none items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange hover:bg-orange/20"
          >
            <PlayCircle size={13} />
            Ver vídeo
          </a>
        )}
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

      <div className="col-span-2 sm:w-full sm:flex-none">
        <label className="mb-1 block text-xs text-blue">
          Observação <span className="font-normal">(o aluno vê no exercício)</span>
        </label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: executar na máquina de tríceps testa"
          className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
        />
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

        <button
          type="button"
          onClick={handleToggleActive}
          disabled={archivePending}
          className="rounded-lg border border-lightblue/50 px-2.5 py-1.5 text-xs font-medium text-navy hover:bg-lightblue/10 disabled:opacity-50"
        >
          {archivePending ? "..." : isActive ? "Arquivar" : "Reativar"}
        </button>

        <DeleteButton
          action={deleteWorkoutExerciseRow.bind(null, id, workoutId)}
          confirmMessage={`Remover "${exerciseName}" deste treino?`}
        />
      </div>

      {error && <p className="col-span-2 text-xs text-orange sm:w-full">{error}</p>}
      {archiveError && <p className="col-span-2 text-xs text-orange sm:w-full">{archiveError}</p>}
    </Card>
  );
}
