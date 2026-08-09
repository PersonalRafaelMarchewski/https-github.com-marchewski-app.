"use client";

import { useActionState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { updateWorkout, type UpdateWorkoutState } from "@/app/(trainer)/treinos/[id]/actions";

const initialState: UpdateWorkoutState = { error: null };

export default function EditarTreinoMetaForm({
  workoutId,
  studentId,
  initialName,
  initialStartDate,
  initialEndDate,
  initialStatus,
  initialPlannedSessions,
  completedSessions,
}: {
  workoutId: string;
  studentId: string;
  initialName: string;
  initialStartDate: string;
  initialEndDate: string;
  initialStatus: string;
  initialPlannedSessions?: number | null;
  completedSessions?: number;
}) {
  const boundAction = updateWorkout.bind(null, workoutId, studentId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Card className="space-y-4">
      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Nome do treino</label>
          <input
            name="name"
            defaultValue={initialName}
            required
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        {Boolean(initialPlannedSessions) && (
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-navy">Progresso do programa</span>
              <span className="text-blue">
                {completedSessions ?? 0} de {initialPlannedSessions} treinos
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-lightblue/15">
              <div
                className="h-full rounded-full bg-orange"
                style={{
                  width: `${Math.min(100, Math.round(((completedSessions ?? 0) / (initialPlannedSessions || 1)) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Início</label>
            <input
              type="date"
              name="start_date"
              defaultValue={initialStartDate}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Fim</label>
            <input
              type="date"
              name="end_date"
              defaultValue={initialEndDate}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Status</label>
            <select
              name="status"
              defaultValue={initialStatus}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            >
              <option value="active">Ativo</option>
              <option value="completed">Concluído</option>
              <option value="draft">Rascunho</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Treinos previstos <span className="font-normal text-blue">(opcional, pra barra de progresso)</span>
          </label>
          <input
            type="number"
            name="planned_sessions"
            min={1}
            defaultValue={initialPlannedSessions ?? ""}
            placeholder="ex: 36"
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange sm:w-40"
          />
        </div>

        {state.error && <p className="text-sm text-orange">{state.error}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar treino"}
        </Button>
      </form>
    </Card>
  );
}
