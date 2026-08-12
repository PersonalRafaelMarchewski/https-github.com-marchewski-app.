"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import {
  createFinanceEntry,
  updateFinanceEntry,
  type FinanceFormState,
} from "@/app/(trainer)/financas/actions";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, BUSINESS_OPTIONS, type Business } from "@/lib/financeCategories";
import { todayInBrazil } from "@/lib/date";

const initialState: FinanceFormState = { error: null };

function todayInput() {
  return todayInBrazil();
}

type Student = { id: string; name: string; serviceType: Business };

export type FinanceEntryValues = {
  type: "income" | "expense";
  category: string;
  description: string | null;
  amountReais: number;
  entryDate: string;
  studentId: string | null;
  business: Business;
};

export default function FinanceEntryForm({
  students,
  defaultBusiness = "assessoria",
  entryId,
  initialValues,
  onSaved,
  onCancel,
}: {
  students: Student[];
  defaultBusiness?: Business;
  entryId?: string;
  initialValues?: FinanceEntryValues;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(entryId);
  const action = isEdit ? updateFinanceEntry.bind(null, entryId as string) : createFinanceEntry;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [type, setType] = useState<"income" | "expense">(initialValues?.type ?? "income");
  const [business, setBusiness] = useState<Business>(initialValues?.business ?? defaultBusiness);
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (!isEdit) setBusiness(defaultBusiness);
  }, [defaultBusiness, isEdit]);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      if (isEdit) {
        onSaved?.();
      } else {
        formRef.current?.reset();
        setBusiness(defaultBusiness);
      }
    }
    wasPending.current = pending;
  }, [pending, state.error, isEdit, onSaved, defaultBusiness]);

  // receita ligada a aluno usa sempre o negócio do próprio aluno — só mostra
  // quem é desse negócio pra não dar pra escolher errado
  const studentsForBusiness = students.filter((s) => s.serviceType === business);

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

      <div>
        <label className="mb-1 block text-sm font-medium text-navy">Negócio</label>
        <div className="flex gap-2">
          {BUSINESS_OPTIONS.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => setBusiness(b.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                business === b.value
                  ? "border-blue bg-blue text-white"
                  : "border-lightblue/50 text-navy hover:border-blue/50"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="business" value={business} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Categoria</label>
          <select
            name="category"
            required
            defaultValue={initialValues?.category}
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
            defaultValue={initialValues?.amountReais}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Data</label>
          <input
            type="date"
            name="entry_date"
            defaultValue={initialValues?.entryDate ?? todayInput()}
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
              defaultValue={initialValues?.studentId ?? ""}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            >
              <option value="">—</option>
              {studentsForBusiness.map((s) => (
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
          defaultValue={initialValues?.description ?? ""}
          className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
        />
      </div>

      {state.error && <p className="text-sm text-orange">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar lançamento"}
        </Button>
        {isEdit && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-lightblue/50 px-3 py-2 text-sm font-medium text-navy hover:bg-lightblue/10"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
