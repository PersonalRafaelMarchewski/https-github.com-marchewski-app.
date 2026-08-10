import Link from "next/link";
import { Eye, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import EditarTreinoMetaForm from "@/components/EditarTreinoMetaForm";
import WorkoutBlocksList, { type Block } from "@/components/WorkoutBlocksList";
import NewBlockButton from "@/components/NewBlockButton";
import AddExerciseRow from "@/components/AddExerciseRow";
import VolumeSummary from "@/components/VolumeSummary";
import { summarizeVolumeByPlan } from "@/lib/volume";
import { groupExercisesByMethod } from "@/lib/workoutMethods";
import { estimateBlockSeconds } from "@/lib/workoutTime";

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

  // nome/dia/ordem de cada bloco — order_index é coluna nova; se a
  // migração ainda não rodou, pedir ela faz a consulta inteira falhar
  // (não só essa coluna), então tenta sem ela nesse caso.
  let labelMetaRows: any[] | null = null;
  {
    const { data, error } = await supabase
      .from("workout_labels")
      .select("label, name, weekday, order_index")
      .eq("workout_id", id);
    if (error) {
      const fallback = await supabase
        .from("workout_labels")
        .select("label, name, weekday")
        .eq("workout_id", id);
      labelMetaRows = fallback.data;
    } else {
      labelMetaRows = data;
    }
  }
  const labelMeta = new Map(
    (labelMetaRows ?? []).map((l: any) => [
      l.label,
      { name: l.name, weekday: l.weekday, orderIndex: l.order_index },
    ])
  );

  // um bloco pode existir só em workout_labels ainda (criado vazio, sem
  // exercício nenhum) — junta as duas fontes pra não sumir da tela
  const exercisesByLabel = (workoutExercises ?? []).reduce<Record<string, any[]>>((acc, we: any) => {
    (acc[we.label] ??= []).push(we);
    return acc;
  }, {});
  const allLabels = [...new Set([...Object.keys(exercisesByLabel), ...labelMeta.keys()])];
  allLabels.sort((a, b) => {
    const orderA = labelMeta.get(a)?.orderIndex;
    const orderB = labelMeta.get(b)?.orderIndex;
    if (orderA != null && orderB != null && orderA !== orderB) return orderA - orderB;
    if (orderA != null && orderB == null) return -1;
    if (orderA == null && orderB != null) return 1;
    return a.localeCompare(b);
  });

  const blocks: Block[] = allLabels.map((label) => {
    const items = exercisesByLabel[label] ?? [];
    const itemsWithMuscle = items.map((we: any) => ({
      ...we,
      muscleGroup: we.exercises?.muscle_group ?? null,
    }));
    const meta = labelMeta.get(label);
    return {
      label,
      name: meta?.name ?? null,
      weekday: meta?.weekday ?? null,
      estimatedSeconds: estimateBlockSeconds(groupExercisesByMethod(itemsWithMuscle)),
      items: items.map((we: any) => ({
        id: we.id,
        label: we.label,
        method: we.method,
        sets: we.sets,
        reps: we.reps,
        load: we.load,
        rest_seconds: we.rest_seconds,
        exerciseName: we.exercises?.name ?? "Exercício",
        muscleGroup: we.exercises?.muscle_group ?? null,
      })),
    };
  });

  const blockOptions = blocks.map((b, i) => ({ label: b.label, name: b.name ?? `Bloco ${i + 1}` }));

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

        <WorkoutBlocksList workoutId={id} blocks={blocks} />

        <NewBlockButton workoutId={id} />

        <AddExerciseRow workoutId={id} exercises={exercises ?? []} blocks={blockOptions} />
      </div>

      <Link href={`/alunos/${workout.student_id}`} className="text-sm text-blue hover:underline">
        ← Voltar
      </Link>
    </div>
  );
}
