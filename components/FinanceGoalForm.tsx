"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import { setBusinessGoal, type FinanceFormState } from "@/app/(trainer)/financas/actions";
import type { Business } from "@/lib/financeCategories";

const initialState: FinanceFormState = { error: null };

export default function FinanceGoalForm({
  business,
  label,
  currentGoalReais,
}: {
  business: Business;
  label: string;
  currentGoalReais: number | null;
}) {
  const boundAction = setBusinessGoal.bind(null, business);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [editing, setEditing] = useState(false);
  const wasPending = useRef(false);

  // fecha o modo de edição sozinho assim que a meta é salva com sucesso
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-navy">
          Meta {label}:{" "}
          <strong>
            {currentGoalReais
              ? currentGoalReais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              : "não definida"}
          </strong>
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-blue hover:underline"
        >
          {currentGoalReais ? "Editar" : "Definir meta"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-navy">Meta {label} (R$)</label>
        <input
          type="number"
          name="goal"
          min={0}
          step={0.01}
          defaultValue={currentGoalReais ?? ""}
          className="w-40 rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="rounded-lg border border-lightblue/50 px-3 py-2 text-sm font-medium text-navy hover:bg-lightblue/10"
      >
        Cancelar
      </button>
      {state.error && <p className="w-full text-sm text-orange">{state.error}</p>}
    </form>
  );
}
