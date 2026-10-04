import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import PreviewExerciseCard from "@/components/PreviewExerciseCard";
import PrintButton from "@/components/PrintButton";
import { groupExercisesByMethod } from "@/lib/workoutMethods";

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

type Ficha = {
  key: string;
  title: string;
  weekday: number | null;
  items: any[];
};

export default async function PlanoSemanalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, profiles:profile_id (name)")
    .eq("id", id)
    .single();

  const studentName = (student as any)?.profiles?.name ?? "Aluno";

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, name")
    .eq("student_id", id)
    .eq("status", "active");

  const workoutIds = (workouts ?? []).map((w) => w.id);

  const { data: workoutExercises } = workoutIds.length
    ? await supabase
        .from("workout_exercises")
        .select(
          "id, workout_id, label, sets, reps, load, rest_seconds, method, order_index, exercises:exercise_id (name, muscle_group, video_url, instructions)"
        )
        .in("workout_id", workoutIds)
        .order("order_index")
    : { data: [] as any[] };

  const { data: labelRows } = workoutIds.length
    ? await supabase
        .from("workout_labels")
        .select("workout_id, label, name, weekday")
        .in("workout_id", workoutIds)
    : { data: [] as any[] };

  const workoutById = new Map((workouts ?? []).map((w) => [w.id, w]));
  const labelMeta = new Map(
    (labelRows ?? []).map((r: any) => [`${r.workout_id}:${r.label}`, { name: r.name as string | null, weekday: r.weekday as number | null }])
  );

  const labelsByWorkout = new Map<string, Set<string>>();
  const exercisesByWorkoutLabel = new Map<string, any[]>();
  for (const we of (workoutExercises ?? []) as any[]) {
    const key = `${we.workout_id}:${we.label}`;
    (labelsByWorkout.get(we.workout_id) ?? labelsByWorkout.set(we.workout_id, new Set()).get(we.workout_id)!).add(we.label);
    (exercisesByWorkoutLabel.get(key) ?? exercisesByWorkoutLabel.set(key, []).get(key)!).push(we);
  }

  const fichas: Ficha[] = [];
  for (const [workoutId, labelsSet] of labelsByWorkout) {
    const workout = workoutById.get(workoutId);
    if (!workout) continue;
    const labels = [...labelsSet].sort();
    for (const label of labels) {
      const key = `${workoutId}:${label}`;
      const meta = labelMeta.get(key);
      const title = meta?.name || (workout as any).name + (labels.length > 1 ? ` · Bloco ${label}` : "");
      fichas.push({
        key,
        title,
        weekday: meta?.weekday ?? null,
        items: (exercisesByWorkoutLabel.get(key) ?? []).sort(
          (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
        ),
      });
    }
  }

  const fichasPorDia = new Map<number, Ficha[]>();
  for (const ficha of fichas) {
    if (ficha.weekday == null) continue;
    (fichasPorDia.get(ficha.weekday) ?? fichasPorDia.set(ficha.weekday, []).get(ficha.weekday)!).push(ficha);
  }

  const fichasSemDia = fichas.filter((f) => f.weekday == null);
  const fichasOrdenadas = [
    ...WEEKDAY_ORDER.flatMap((d) => fichasPorDia.get(d) ?? []),
    ...fichasSemDia,
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <CalendarDays size={22} className="mt-0.5 flex-none text-blue" />
          <div>
            <h1 className="text-2xl font-bold text-navy">Plano semanal</h1>
            <p className="text-blue">{studentName}</p>
          </div>
        </div>
        <div className="no-print">
          <PrintButton />
        </div>
      </div>

      {fichas.length === 0 ? (
        <Card className="text-blue">Nenhum treino ativo ainda pra montar o plano.</Card>
      ) : (
        <>
          <Card>
            <p className="mb-3 font-heading text-sm font-semibold text-navy">Sugestão da semana</p>
            <div className="divide-y divide-lightblue/15">
              {WEEKDAY_ORDER.map((d) => {
                const dayFichas = fichasPorDia.get(d) ?? [];
                return (
                  <div key={d} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm text-navy">{WEEKDAY_LABELS[d]}</span>
                    <span
                      className={
                        dayFichas.length
                          ? "rounded-full bg-orange/15 px-3 py-1 text-sm font-semibold text-orange"
                          : "rounded-full bg-lightblue/15 px-3 py-1 text-sm font-medium text-blue"
                      }
                    >
                      {dayFichas.length ? dayFichas.map((f) => f.title).join(" + ") : "Descanso"}
                    </span>
                  </div>
                );
              })}
            </div>
            {fichasSemDia.length > 0 && (
              <p className="mt-3 text-xs text-blue">
                {fichasSemDia.map((f) => f.title).join(", ")} ainda sem dia definido — defina em
                "Editar treino" pra entrar nessa tabela.
              </p>
            )}
          </Card>

          {fichasOrdenadas.map((ficha) => {
            const groups = groupExercisesByMethod(ficha.items);
            return (
              <div key={ficha.key} className="space-y-3">
                <p className="font-heading text-sm font-semibold text-navy">
                  {ficha.title}
                  {ficha.weekday != null && (
                    <span className="ml-2 text-xs font-normal text-blue">
                      {WEEKDAY_LABELS[ficha.weekday]}
                    </span>
                  )}
                </p>

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
          })}
        </>
      )}

      <Link href={`/alunos/${id}`} className="no-print block text-sm text-blue hover:underline">
        ← Voltar
      </Link>
    </div>
  );
}
