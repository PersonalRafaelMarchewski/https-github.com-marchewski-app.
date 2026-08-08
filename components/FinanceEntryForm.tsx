"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import { createFinanceEntry, type FinanceFormState } from "@/app/(trainer)/financas/actions";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/financeCategories";

const initialState: FinanceFormState = { error: null };

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function FinanceEntryForm({ students }: { students: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createFinanceEntry, initialState);
  const [type, setType] = useState<"income" | "expense">("income");
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("income")}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            type === "income"
              ? "border-orange bg-orange text-white"
              : "border-lightblue/50 text-navy hover:border-orange/50"
          }`}
        >
          Receita
        </button>
        <button
          type="button"
          onClick={() => setType("expense")}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            type === "expense"
              ? "border-navy bg-navy text-white"
              : "border-lightblue/50 text-navy hover:border-navy/50"
          }`}
        >
          Despesa
        </button>
      </div>
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Categoria</label>
          <select
            name="category"
            required
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Valor (R$)</label>
          <input
            type="number"
            name="amount"
            min={0.01}
            step={0.01}
            required
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Data</label>
          <input
            type="date"
            name="entry_date"
            defaultValue={todayInput()}
            required
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>
        {type === "income" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              Aluno <span className="font-normal text-blue">(opcional)</span>
            </label>
            <select
              name="student_id"
              defaultValue=""
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            >
              <option value="">—</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-navy">
          Descrição <span className="font-normal text-blue">(opcional)</span>
        </label>
        <input
          name="description"
          placeholder="Ex: mensalidade de agosto"
          className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
        />
      </div>

      {state.error && <p className="text-sm text-orange">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Adicionar lançamento"}
      </Button>
    </form>
  );
}
