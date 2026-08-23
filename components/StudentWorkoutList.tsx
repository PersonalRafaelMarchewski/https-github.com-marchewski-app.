"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, TrendingUp } from "lucide-react";
import Card from "@/components/Card";
import DeleteButton from "@/components/DeleteButton";
import DragHandle from "@/components/DragHandle";
import { useSortableReorder } from "@/lib/useSortableReorder";
import { daysUntil, formatDueLabel } from "@/lib/dueDate";
import { deleteWorkout, reorderWorkouts } from "@/app/(trainer)/alunos/[id]/actions";

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  completed: "Concluído",
  draft: "Rascunho",
};

export type WorkoutSummary = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  plannedSessions: number | null;
  completedCount: number;
  avgRating: number | null;
};

// Sem mais sigla (A/B/C) pra identificar o treino — só o nome, e a ordem de
// exibição é escolhida arrastando (⠿) em vez de vir da letra ou da data.
export default function StudentWorkoutList({
  studentId,
  workouts,
}: {
  studentId: string;
  workouts: WorkoutSummary[];
}) {
  const [order, setOrder] = useState(workouts.map((w) => w.id));
  const [, startTransition] = useTransition();
  const byId = new Map(workouts.map((w) => [w.id, w]));
  const ordered = order.map((id) => byId.get(id)).filter((w): w is WorkoutSummary => Boolean(w));

  const { draggingKey, startDrag, handlePointerMove, handlePointerUp, handlePointerCancel } =
    useSortableReorder(order, setOrder, (finalOrder) => {
      startTransition(() => {
        reorderWorkouts(studentId, finalOrder).catch(() => {
          // se falhar, a leitura da página volta a mostrar a ordem salva
          // no próximo carregamento — não precisa travar a tela
        });
      });
    });

  return (
    <div className="space-y-2">
      {ordered.length > 1 && (
        <p className="text-xs text-blue">Segure as ⠿ e arraste pra mudar a ordem.</p>
      )}
      {ordered.map((w) => (
        <div
          key={w.id}
          data-sortable-key={w.id}
          className={`flex items-stretch gap-1 ${draggingKey === w.id ? "opacity-50" : ""}`}
        >
          <DragHandle
            onPointerDown={startDrag(w.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          />
          <Card className="flex flex-1 items-center justify-between">
            <div>
              <p className="font-medium text-navy">{w.name}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm text-blue">
                  {w.startDate ?? "?"} até {w.endDate ?? "?"}
                </p>
                {w.endDate && w.status === "active" && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      daysUntil(w.endDate) <= 7
                        ? "bg-orange/15 text-orange"
                        : "bg-lightblue/15 text-blue"
                    }`}
                  >
                    {formatDueLabel(daysUntil(w.endDate))}
                  </span>
                )}
              </div>
              {w.completedCount > 0 && (
                <p className="mt-1 text-xs text-blue">
                  {w.plannedSessions
                    ? `${w.completedCount}/${w.plannedSessions} treinos`
                    : `${w.completedCount} treinos concluídos`}
                  {w.avgRating !== null && ` · ⭐ ${w.avgRating.toFixed(1)}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  w.status === "active" ? "bg-orange/15 text-orange" : "bg-lightblue/20 text-blue"
                }`}
              >
                {STATUS_LABELS[w.status] ?? w.status}
              </span>
              <Link
                href={`/treinos/${w.id}/evolucao`}
                className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20"
                aria-label="Evolução de carga"
              >
                <TrendingUp size={16} />
              </Link>
              <Link
                href={`/treinos/${w.id}/editar`}
                className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20"
                aria-label="Editar treino"
              >
                <Pencil size={16} />
              </Link>
              <DeleteButton
                action={deleteWorkout.bind(null, w.id, studentId)}
                confirmMessage={`Excluir o treino "${w.name}"? O histórico de execução dele (cargas registradas, sessões) é apagado junto. Essa ação não pode ser desfeita.`}
              />
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
