"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { setWorkoutLabelMeta, type LabelFormState } from "@/app/(trainer)/treinos/[id]/label-actions";

const WEEKDAYS = [
  { value: "", label: "Sem dia fixo" },
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda" },
  { value: "2", label: "Terça" },
  { value: "3", label: "Quarta" },
  { value: "4", label: "Quinta" },
  { value: "5", label: "Sexta" },
  { value: "6", label: "Sábado" },
];

const initialState: LabelFormState = { error: null };

export default function WorkoutLabelHeader({
  workoutId,
  label,
  fallbackName,
  initialName,
  initialWeekday,
}: {
  workoutId: string;
  label: string;
  // "Bloco 1", "Bloco 2"... — usado só enquanto o personal não dá um nome
  // de verdade pro bloco (a letra interna nunca aparece na tela)
  fallbackName: string;
  initialName: string | null;
  initialWeekday: number | null;
}) {
  const boundAction = setWorkoutLabelMeta.bind(null, workoutId, label);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [editing, setEditing] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  const weekdayLabel =
    initialWeekday !== null ? WEEKDAYS.find((w) => w.value === String(initialWeekday))?.label : null;

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-heading text-sm font-semibold text-navy">
          {initialName ? initialName : fallbackName}
        </p>
        {weekdayLabel && (
          <span className="rounded-full bg-lightblue/15 px-2 py-0.5 text-xs font-medium text-blue">
            {weekdayLabel}
          </span>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Editar nome e dia da ficha"
          className="text-blue hover:text-orange"
        >
          <Pencil size={13} />
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        name="name"
        defaultValue={initialName ?? ""}
        placeholder={fallbackName}
        className="w-40 rounded-lg border border-lightblue/50 px-2 py-1 text-sm outline-none focus:border-orange"
      />
      <select
        name="weekday"
        defaultValue={initialWeekday !== null ? String(initialWeekday) : ""}
        className="rounded-lg border border-lightblue/50 px-2 py-1 text-sm outline-none focus:border-orange"
      >
        {WEEKDAYS.map((w) => (
          <option key={w.value} value={w.value}>
            {w.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-navy px-3 py-1 text-xs font-medium text-white hover:bg-blue disabled:opacity-50"
      >
        {pending ? "..." : "Salvar"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs text-blue hover:underline"
      >
        Cancelar
      </button>
      {state.error && <p className="w-full text-xs text-orange">{state.error}</p>}
    </form>
  );
}
