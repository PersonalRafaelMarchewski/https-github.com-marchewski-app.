import Link from "next/link";
import { Clock, Eye, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import EditarTreinoMetaForm from "@/components/EditarTreinoMetaForm";
import WorkoutLabelHeader from "@/components/WorkoutLabelHeader";
import WorkoutExerciseList from "@/components/WorkoutExerciseList";
import AddExerciseRow from "@/components/AddExerciseRow";
import VolumeSummary from "@/components/VolumeSummary";
import { summarizeVolumeByPlan } from "@/lib/volume";
import { groupExercisesByMethod } from "@/lib/workoutMethods";
import { estimateBlockSeconds, formatDuration } from "@/lib/workoutTime";

export default async function EditarTreinoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: workout } = await supabase
    .from("workouts")
    .select(
      "id, name, start_date, end_date, status, student_id, planned_sessions, students:student_id (profiles:profile_id (name))"
    )
    .eq("id", id)
    .single();

  if (!workout) {
    return <Card className="text-blue">Treino não encontrado.</Card>;
  }

  const { count: completedSessions } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("workout_id", id);

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

  // nome/dia fixo por ficha (Treino A/B/C) — tabela nova, tolera não existir
  // ainda (fica tudo "sem nome / sem dia" até a migração rodar)
  const { data: labelMetaRows } = await supabase
    .from("workout_labels")
    .select("label, name, weekday")
    .eq("workout_id", id);
  const labelMeta = new Map(
    (labelMetaRows ?? []).map((l: any) => [l.label, { name: l.name, weekday: l.weekday }])
  );

  const studentName = (workout as any).students?.profiles?.name ?? "Aluno";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Editar treino</h1>
          <p className="text-blue">{studentName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/treinos/${id}/evolucao`}>
            <span className="flex items-center justify-center gap-1.5 rounded-lg border border-lightblue/50 px-3 py-1.5 text-sm font-medium text-navy hover:bg-lightblue/10">
              <TrendingUp size={16} />
              Evolução de carga
            </span>
          </Link>
          <Link href={`/treinos/${id}/visualizar`}>
            <span className="flex items-center justify-center gap-1.5 rounded-lg border border-lightblue/50 px-3 py-1.5 text-sm font-medium text-navy hover:bg-lightblue/10">
              <Eye size={16} />
              Ver como o aluno vê
            </span>
          </Link>
        </div>
      </div>

      <EditarTreinoMetaForm
        workoutId={id}
        studentId={workout.student_id}
        initialName={workout.name}
        initialStartDate={workout.start_date ?? ""}
        initialEndDate={workout.end_date ?? ""}
        initialStatus={workout.status}
        initialPlannedSessions={workout.planned_sessions}
        completedSessions={completedSessions ?? 0}
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
          const itemsWithMuscle = items.map((we: any) => ({
            ...we,
            muscleGroup: we.exercises?.muscle_group ?? null,
          }));
          const estimatedSeconds = estimateBlockSeconds(groupExercisesByMethod(itemsWithMuscle));
          const listItems = items.map((we: any) => ({
            id: we.id,
            label: we.label,
            method: we.method,
            sets: we.sets,
            reps: we.reps,
            load: we.load,
            rest_seconds: we.rest_seconds,
            exerciseName: we.exercises?.name ?? "Exercício",
            muscleGroup: we.exercises?.muscle_group ?? null,
          }));

          return (
            <div key={label} className="space-y-3">
              <WorkoutLabelHeader
                workoutId={id}
                label={label}
                initialName={labelMeta.get(label)?.name ?? null}
                initialWeekday={labelMeta.get(label)?.weekday ?? null}
              />

              <WorkoutExerciseList workoutId={id} items={listItems} />

              {items.length > 0 && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-navy">
                  <Clock size={14} className="text-orange" />
                  Tempo estimado do Treino {label}: ~{formatDuration(estimatedSeconds)}
                </p>
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
