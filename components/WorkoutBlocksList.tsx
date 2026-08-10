"use client";

import { useState, useTransition } from "react";
import { Clock } from "lucide-react";
import DragHandle from "@/components/DragHandle";
import WorkoutLabelHeader from "@/components/WorkoutLabelHeader";
import WorkoutExerciseList from "@/components/WorkoutExerciseList";
import { formatDuration } from "@/lib/workoutTime";
import { useSortableReorder } from "@/lib/useSortableReorder";
import { reorderWorkoutLabels } from "@/app/(trainer)/treinos/[id]/label-actions";

type ExerciseItem = {
  id: string;
  label: string;
  method: string | null;
  sets: number | null;
  reps: string | null;
  load: string | null;
  rest_seconds: number | null;
  exerciseName: string;
  muscleGroup: string | null;
};

export type Block = {
  label: string;
  name: string | null;
  weekday: number | null;
  items: ExerciseItem[];
  estimatedSeconds: number;
};

// Sem mais "Treino A/B/C" — cada bloco só tem um nome (escolhido pelo
// personal) e a ordem de exibição é arrastar (⠿), não mais a letra.
export default function WorkoutBlocksList({
  workoutId,
  blocks,
}: {
  workoutId: string;
  blocks: Block[];
}) {
  const [order, setOrder] = useState(blocks.map((b) => b.label));
  const [, startTransition] = useTransition();
  const byLabel = new Map(blocks.map((b) => [b.label, b]));
  const ordered = order.map((l) => byLabel.get(l)).filter((b): b is Block => Boolean(b));
  const blockOptions = blocks.map((b, i) => ({ label: b.label, name: b.name ?? `Bloco ${i + 1}` }));

  const { draggingKey, startDrag, handlePointerMove, handlePointerUp, handlePointerCancel } =
    useSortableReorder(order, setOrder, (finalOrder) => {
      startTransition(() => {
        reorderWorkoutLabels(workoutId, finalOrder).catch(() => {
          // se falhar, a leitura da página volta a mostrar a ordem salva
          // no próximo carregamento — não precisa travar a tela
        });
      });
    });

  return (
    <>
      {ordered.length > 1 && (
        <p className="text-xs text-blue">Segure as ⠿ do bloco pra mudar a ordem de exibição.</p>
      )}
      {ordered.map((block, index) => (
        <div
          key={block.label}
          data-sortable-key={block.label}
          className={`flex items-start gap-1 ${draggingKey === block.label ? "opacity-50" : ""}`}
        >
          <DragHandle
            onPointerDown={startDrag(block.label)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className="mt-1"
          />
          <div className="flex-1 space-y-3">
            <WorkoutLabelHeader
              workoutId={workoutId}
              label={block.label}
              fallbackName={`Bloco ${index + 1}`}
              initialName={block.name}
              initialWeekday={block.weekday}
            />

            <WorkoutExerciseList workoutId={workoutId} items={block.items} blocks={blockOptions} />

            {block.items.length > 0 && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-navy">
                <Clock size={14} className="text-orange" />
                Tempo estimado: ~{formatDuration(block.estimatedSeconds)}
              </p>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
