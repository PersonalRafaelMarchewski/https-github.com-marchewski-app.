import Link from "next/link";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import PreviewExerciseCard from "@/components/PreviewExerciseCard";
import PrintButton from "@/components/PrintButton";
import { groupExercisesByMethod } from "@/lib/workoutMethods";

export default async function VisualizarTreinoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, student_id, students:student_id (profiles:profile_id (name))")
    .eq("id", id)
    .single();

  if (!workout) {
    return <Card className="text-blue">Treino não encontrado.</Card>;
  }

  const { data: workoutExercises } = await supabase
    .from("workout_exercises")
    .select(
      "id, label, sets, reps, load, rest_seconds, method, order_index, exercises:exercise_id (name, muscle_group, video_url, instructions)"
    )
    .eq("workout_id", id)
    .order("order_index");

  // order_index é coluna nova; se a migração ainda não rodou, pedir ela
  // faz a consulta inteira falhar, então tenta sem ela nesse caso.
  let labelMetaRows: any[] | null = null;
  {
    const { data, error } = await supabase
      .from("workout_labels")
      .select("label, name, order_index")
      .eq("workout_id", id);
    if (error) {
      const fallback = await supabase.from("workout_labels").select("label, name").eq("workout_id", id);
      labelMetaRows = fallback.data;
    } else {
      labelMetaRows = data;
    }
  }
  const labelMeta = new Map(
    (labelMetaRows ?? []).map((l: any) => [l.label, { name: l.name as string | null, orderIndex: l.order_index as number | null }])
  );

  const studentName = (workout as any).students?.profiles?.name ?? "Aluno";

  const byLabel = (workoutExercises ?? []).reduce<Record<string, any[]>>((acc, we: any) => {
    (acc[we.label] ??= []).push(we);
    return acc;
  }, {});

  const orderedLabels = Object.keys(byLabel).sort((a, b) => {
    const orderA = labelMeta.get(a)?.orderIndex;
    const orderB = labelMeta.get(b)?.orderIndex;
    if (orderA != null && orderB != null && orderA !== orderB) return orderA - orderB;
    if (orderA != null && orderB == null) return -1;
    if (orderA == null && orderB != null) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Eye size={22} className="mt-0.5 flex-none text-blue" />
          <div>
            <h1 className="text-2xl font-bold text-navy">{workout.name}</h1>
            <p className="text-blue">
              {studentName} · isso é só uma prévia de como o aluno vê — não marca nada como
              concluído
            </p>
          </div>
        </div>
        <PrintButton />
      </div>

      {orderedLabels.length === 0 ? (
        <Card className="text-blue">Nenhum exercício cadastrado nesse treino ainda.</Card>
      ) : (
        orderedLabels.map((label, index) => {
          const items = byLabel[label];
          const groups = groupExercisesByMethod(items);

          return (
            <div key={label} className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="font-heading text-sm font-semibold text-navy">
                  {labelMeta.get(label)?.name || `Bloco ${index + 1}`}
                </p>
              </div>

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
                      <PreviewExerciseCard
                        key={we.id}
                        exerciseName={we.exercises?.name ?? "Exercício"}
                        muscleGroup={we.exercises?.muscle_group ?? null}
                        videoUrl={we.exercises?.video_url ?? null}
                        instructions={we.exercises?.instructions ?? null}
                        sets={we.sets}
                        reps={we.reps}
                        load={we.load}
                        restSeconds={we.rest_seconds}
                        method={we.method}
                      />
                    ))}
                  </div>
                ) : (
                  <PreviewExerciseCard
                    key={group.items[0].id}
                    exerciseName={group.items[0].exercises?.name ?? "Exercício"}
                    muscleGroup={group.items[0].exercises?.muscle_group ?? null}
                    videoUrl={group.items[0].exercises?.video_url ?? null}
                    instructions={group.items[0].exercises?.instructions ?? null}
                    sets={group.items[0].sets}
                    reps={group.items[0].reps}
                    load={group.items[0].load}
                    restSeconds={group.items[0].rest_seconds}
                    method={group.items[0].method}
                  />
                )
              )}
            </div>
          );
        })
      )}

      <Link
        href={`/treinos/${id}/editar`}
        className="no-print block text-sm text-blue hover:underline"
      >
        ← Voltar pra edição
      </Link>
    </div>
  );
}
