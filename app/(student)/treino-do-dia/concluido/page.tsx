import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import WorkoutShareCard from "@/components/WorkoutShareCard";

export default async function TreinoConcluidoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("id, profiles:profile_id (name)")
    .eq("profile_id", user!.id)
    .single();

  if (!student) {
    return <Card className="text-blue">Nenhum treino vinculado à sua conta ainda.</Card>;
  }

  const { data: activeWorkouts } = await supabase
    .from("workouts")
    .select("id, name")
    .eq("student_id", student.id)
    .eq("status", "active")
    .order("start_date", { ascending: false });

  const workout = activeWorkouts?.[0];

  if (!workout) {
    return <Card className="text-blue">Nenhum treino ativo no momento.</Card>;
  }

  const { data: allWorkoutExercises } = await supabase
    .from("workout_exercises")
    .select("id, label, sets")
    .eq("workout_id", workout.id);

  if (!allWorkoutExercises || allWorkoutExercises.length === 0) {
    return <Card className="text-blue">Nenhum exercício cadastrado nesse treino ainda.</Card>;
  }

  const labels = [...new Set(allWorkoutExercises.map((we) => we.label))].sort();

  const { data: lastLog } = await supabase
    .from("workout_logs")
    .select("date, created_at, workout_exercises:workout_exercise_id (label)")
    .eq("student_id", student.id)
    .eq("completed", true)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastLabel = (lastLog as any)?.workout_exercises?.label as string | undefined;
  const lastIndex = lastLabel ? labels.indexOf(lastLabel) : -1;
  const currentLabel = lastIndex >= 0 ? labels[(lastIndex + 1) % labels.length] : labels[0];
  const exerciseIdsToday = allWorkoutExercises
    .filter((we) => we.label === currentLabel)
    .map((we) => we.id);

  const today = new Date().toISOString().slice(0, 10);
  const { data: logsToday } = await supabase
    .from("workout_logs")
    .select("workout_exercise_id, completed, created_at, actual_load")
    .eq("student_id", student.id)
    .eq("date", today)
    .in("workout_exercise_id", exerciseIdsToday);

  const completedLogs = (logsToday ?? []).filter((l) => l.completed);
  const totalCount = exerciseIdsToday.length;
  const completedCount = completedLogs.length;

  if (totalCount === 0 || completedCount < totalCount) {
    return (
      <Card className="text-blue">
        Termine todos os exercícios do treino de hoje pra ver o resumo.
      </Card>
    );
  }

  const timestamps = completedLogs.map((l) => new Date(l.created_at).getTime());
  const durationMinutes =
    timestamps.length > 1
      ? Math.max(1, Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 60_000))
      : null;

  // kilagem total: soma da carga real (registrada pelo aluno) × séries
  // de cada exercício concluído hoje — exercícios sem carga registrada
  // não entram na conta.
  const setsByExerciseId = new Map(
    (allWorkoutExercises ?? []).map((we) => [we.id, we.sets])
  );
  const totalKg = completedLogs.reduce((sum, log) => {
    const sets = setsByExerciseId.get(log.workout_exercise_id);
    const actualLoad = (log as any).actual_load;
    if (sets && actualLoad) return sum + sets * Number(actualLoad);
    return sum;
  }, 0);

  const studentName = (student as any).profiles?.name ?? "Aluno";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Treino concluído! 🎉</h1>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Card>
          <p className="text-2xl font-bold text-navy">{totalCount}</p>
          <p className="text-xs text-blue">exercícios</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-navy">{durationMinutes ?? "-"}</p>
          <p className="text-xs text-blue">minutos</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-navy">{totalKg > 0 ? Math.round(totalKg) : "-"}</p>
          <p className="text-xs text-blue">kg movidos</p>
        </Card>
      </div>

      <WorkoutShareCard
        studentName={studentName}
        workoutName={workout.name}
        label={currentLabel}
        exerciseCount={totalCount}
        durationMinutes={durationMinutes}
        totalKg={totalKg > 0 ? totalKg : null}
        dateIso={today}
      />

      <Link href="/treino-do-dia" className="block text-center text-sm text-blue hover:underline">
        ← Voltar pro treino
      </Link>
    </div>
  );
}
