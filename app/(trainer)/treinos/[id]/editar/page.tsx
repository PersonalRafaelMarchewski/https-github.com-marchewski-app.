import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import EditarTreinoMetaForm from "@/components/EditarTreinoMetaForm";
import WorkoutExerciseRow from "@/components/WorkoutExerciseRow";
import AddExerciseRow from "@/components/AddExerciseRow";

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
    .select("id, label, sets, reps, load, rest_seconds, order_index, exercises:exercise_id (name)")
    .eq("workout_id", id)
    .order("label")
    .order("order_index");

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

      <div>
        <h2 className="mb-3 font-heading font-semibold text-navy">Exercícios</h2>
        <div className="space-y-3">
          {(workoutExercises ?? []).map((we: any) => (
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

        <div className="mt-3">
          <AddExerciseRow workoutId={id} exercises={exercises ?? []} />
        </div>
      </div>

      <Link href={`/alunos/${workout.student_id}`} className="text-sm text-blue hover:underline">
        ← Voltar
      </Link>
    </div>
  );
}
