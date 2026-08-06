import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import EditarTreinoMetaForm from "@/components/EditarTreinoMetaForm";
import WorkoutExerciseRow from "@/components/WorkoutExerciseRow";
import AddExerciseRow from "@/components/AddExerciseRow";
import VolumeSummary from "@/components/VolumeSummary";
import { summarizeVolumeByPlan } from "@/lib/volume";
import { groupExercisesByMethod } from "@/lib/workoutMethods";

export default async function EditarTreinoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, start_date, end_date, status, student_id, students:student_id (profiles:profile_id (name))")
    .eq("id", id)
    .single();

  if (!workout) {
    return <Card className="text-blue">Treino não encontrado.</Card>;
  }

  const { data: workoutExercises } = await supabase
    .from("workout_exercises")
    .select(
      "id, label, sets, reps, load, rest_seconds, method, order_index, exercises:exercise_id (name, muscle_group)"
    )
    .eq("workout_id", id)
    .order("label")
    .order("order_index");

  const volumeRows = summarizeVolumeByPlan(
    (workoutExercises ?? []).map((we: any) => ({
      muscleGroup: we.exercises?.muscle_group ?? null,
      label: we.label,
      sets: we.sets,
    }))
  );

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, muscle_group")
    .order("name");

  const studentName = (workout as any).students?.profiles?.name ?? "Aluno";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Editar treino</h1>
        <p className="text-blue">{studentName}</p>
      </div>

      <EditarTreinoMetaForm
        workoutId={id}
        studentId={workout.student_id}
        initialName={workout.name}
        initialStartDate={workout.start_date ?? ""}
        initialEndDate={workout.end_date ?? ""}
        initialStatus={workout.status}
      />

      <div className="space-y-5">
        <h2 className="font-heading font-semibold text-navy">Exercícios</h2>

        <VolumeSummary
          title="Volume por grupo muscular (nesse treino)"
          rows={volumeRows}
          frequencyLabel={(f) => `${f}x/sem`}
          emptyMessage="Adicione exercícios pra ver o volume e a frequência por grupo muscular."
        />

        {Object.entries(
          (workoutExercises ?? []).reduce<Record<string, any[]>>((acc, we: any) => {
            (acc[we.label] ??= []).push(we);
            return acc;
          }, {})
        ).map(([label, items]) => {
          const groups = groupExercisesByMethod(items);

          return (
            <div key={label} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy font-heading text-xs font-bold text-white">
                  {label}
                </span>
                <p className="font-heading text-sm font-semibold text-navy">Treino {label}</p>
              </div>

              {groups.map((group, gi) =>
                group.items.length > 1 ? (
                  <div
                    key={gi}
                    className="space-y-2 rounded-xl border border-orange/40 bg-orange/5 p-2"
                  >
                    <span className="ml-1 inline-block rounded-full bg-orange/15 px-2.5 py-1 text-xs font-semibold text-orange">
                      {group.method} · sem descanso entre eles
                    </span>
                    {group.items.map((we) => (
                      <WorkoutExerciseRow
                        key={we.id}
                        id={we.id}
                        workoutId={id}
                        exerciseName={we.exercises?.name ?? "Exercício"}
                        initialLabel={we.label}
                        initialSets={we.sets}
                        initialReps={we.reps}
                        initialLoad={we.load}
                        initialRestSeconds={we.rest_seconds}
                        initialMethod={we.method}
                      />
                    ))}
                  </div>
                ) : (
                  <WorkoutExerciseRow
                    key={group.items[0].id}
                    id={group.items[0].id}
                    workoutId={id}
                    exerciseName={group.items[0].exercises?.name ?? "Exercício"}
                    initialLabel={group.items[0].label}
                    initialSets={group.items[0].sets}
                    initialReps={group.items[0].reps}
                    initialLoad={group.items[0].load}
                    initialRestSeconds={group.items[0].rest_seconds}
                    initialMethod={group.items[0].method}
                  />
                )
              )}
            </div>
          );
        })}

        <AddExerciseRow workoutId={id} exercises={exercises ?? []} />
      </div>

      <Link href={`/alunos/${workout.student_id}`} className="text-sm text-blue hover:underline">
        ← Voltar
      </Link>
    </div>
  );
}
