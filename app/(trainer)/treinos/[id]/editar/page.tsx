import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import EditarTreinoMetaForm from "@/components/EditarTreinoMetaForm";
import WorkoutExerciseRow from "@/components/WorkoutExerciseRow";
import AddExerciseRow from "@/components/AddExerciseRow";
import VolumeSummary from "@/components/VolumeSummary";
import { summarizeVolumeByPlan } from "@/lib/volume";

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
      "id, label, sets, reps, load, rest_seconds, order_index, exercises:exercise_id (name, muscle_group)"
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

  const { data: exercises } = await supabase.from("exercises").select("id, name").order("name");

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
          frequencyLabel={(f) => `${f}x/semana no plano`}
          emptyMessage="Adicione exercícios pra ver o volume e a frequência por grupo muscular."
        />

        {Object.entries(
          (workoutExercises ?? []).reduce<Record<string, any[]>>((acc, we: any) => {
            (acc[we.label] ??= []).push(we);
            return acc;
          }, {})
        ).map(([label, items]) => (
          <div key={label} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy font-heading text-xs font-bold text-white">
                {label}
              </span>
              <p className="font-heading text-sm font-semibold text-navy">Treino {label}</p>
            </div>
            {items.map((we) => (
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
              />
            ))}
          </div>
        ))}

        <AddExerciseRow workoutId={id} exercises={exercises ?? []} />
      </div>

      <Link href={`/alunos/${workout.student_id}`} className="text-sm text-blue hover:underline">
        ← Voltar
      </Link>
    </div>
  );
}
