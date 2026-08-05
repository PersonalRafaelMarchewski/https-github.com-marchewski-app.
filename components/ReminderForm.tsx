"use client";

import { useActionState, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  createReminder,
  updateReminder,
  type ReminderFormState,
} from "@/app/(trainer)/agenda/lembretes/actions";

const initialState: ReminderFormState = { error: null };

type InitialData = {
  title: string;
  startDate: string;
  endDate: string;
  notes: string;
};

export default function ReminderForm({
  reminderId,
  initialData,
  defaultDate,
}: {
  reminderId?: string;
  initialData?: InitialData;
  defaultDate?: string;
}) {
  const isEdit = Boolean(reminderId);
  const action = isEdit ? updateReminder.bind(null, reminderId as string) : createReminder;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [multiDay, setMultiDay] = useState(
    Boolean(initialData && initialData.startDate !== initialData.endDate)
  );

  return (
    <Card className="max-w-md">
      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Título</label>
          <input
            name="title"
            defaultValue={initialData?.title ?? ""}
            required
            placeholder="Ex: Férias, renovar CREF..."
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            {multiDay ? "Data inicial" : "Data"}
          </label>
          <input
            type="date"
            name="start_date"
            defaultValue={initialData?.startDate ?? defaultDate}
            required
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-navy">
          <input
            type="checkbox"
            checked={multiDay}
            onChange={(e) => setMultiDay(e.target.checked)}
          />
          Vários dias (ex: período de férias)
        </label>

        {multiDay && (
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Até</label>
            <input
              type="date"
              name="end_date"
              defaultValue={initialData?.endDate ?? initialData?.startDate ?? defaultDate}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Observações <span className="font-normal text-blue">(opcional)</span>
          </label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={initialData?.notes ?? ""}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <p className="text-xs text-blue">
          É só um aviso visual na agenda — não impede de criar aula nesses dias.
        </p>

        {state.error && <p className="text-sm text-orange">{state.error}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : isEdit ? "Salvar lembrete" : "Criar lembrete"}
        </Button>
      </form>
    </Card>
  );
}
