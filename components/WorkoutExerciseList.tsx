"use client";

import { useState, useTransition } from "react";
import DragHandle from "@/components/DragHandle";
import WorkoutExerciseRow from "@/components/WorkoutExerciseRow";
import { groupExercisesByMethod } from "@/lib/workoutMethods";
import { useSortableReorder } from "@/lib/useSortableReorder";
import { reorderWorkoutExercises } from "@/app/(trainer)/treinos/[id]/actions";

type Item = {
  id: string;
  label: string;
  method: string | null;
  sets: number | null;
  reps: string | null;
  load: string | null;
  rest_seconds: number | null;
  exerciseName: string;
  muscleGroup: string | null;
  videoUrl: string | null;
};

export default function WorkoutExerciseList({
  workoutId,
  items,
}: {
  workoutId: string;
  items: Item[];
}) {
  const [order, setOrder] = useState(items.map((i) => i.id));
  const [, startTransition] = useTransition();
  const byId = new Map(items.map((i) => [i.id, i]));
  const orderedItems = order.map((id) => byId.get(id)).filter((i): i is Item => Boolean(i));

  const { draggingKey, startDrag, handlePointerMove, handlePointerUp, handlePointerCancel } =
    useSortableReorder(order, setOrder, (finalOrder) => {
      startTransition(() => {
        reorderWorkoutExercises(finalOrder).catch(() => {
          // se falhar, a leitura da página vai voltar a mostrar a ordem
          // salva no próximo carregamento — não precisa travar a tela
        });
      });
    });

  const groups = groupExercisesByMethod(orderedItems);

  return (
    <>
      {items.length > 1 && (
        <p className="text-xs text-blue">Segure as ⠿ e arraste pra mudar a ordem.</p>
      )}
      {groups.map((group) =>
        group.items.length > 1 ? (
          <div
            key={group.items[0].id}
            className="space-y-2 rounded-xl border border-orange/40 bg-orange/5 p-2"
          >
            <span className="ml-1 inline-block rounded-full bg-orange/15 px-2.5 py-1 text-xs font-semibold text-orange">
              {group.method} · sem descanso entre eles
            </span>
            {group.items.map((we: any) => (
              <div
                key={we.id}
                data-sortable-key={we.id}
                className={`flex items-stretch gap-1 ${draggingKey === we.id ? "opacity-50" : ""}`}
              >
                <DragHandle
                  onPointerDown={startDrag(we.id)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                />
                <div className="flex-1">
                  <WorkoutExerciseRow
                    id={we.id}
                    workoutId={workoutId}
                    exerciseName={we.exerciseName}
                    muscleGroup={we.muscleGroup}
                    videoUrl={we.videoUrl}
                    initialLabel={we.label}
                    initialSets={we.sets}
                    initialReps={we.reps}
                    initialLoad={we.load}
                    initialRestSeconds={we.rest_seconds}
                    initialMethod={we.method}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            key={group.items[0].id}
            data-sortable-key={group.items[0].id}
            className={`flex items-stretch gap-1 ${draggingKey === group.items[0].id ? "opacity-50" : ""}`}
          >
            <DragHandle
              onPointerDown={startDrag(group.items[0].id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            />
            <div className="flex-1">
              <WorkoutExerciseRow
                id={group.items[0].id}
                workoutId={workoutId}
                exerciseName={(group.items[0] as any).exerciseName}
                muscleGroup={(group.items[0] as any).muscleGroup}
                videoUrl={(group.items[0] as any).videoUrl}
                initialLabel={group.items[0].label}
                initialSets={group.items[0].sets}
                initialReps={group.items[0].reps}
                initialLoad={group.items[0].load}
                initialRestSeconds={group.items[0].rest_seconds}
                initialMethod={group.items[0].method}
              />
            </div>
          </div>
        )
      )}
    </>
  );
}
