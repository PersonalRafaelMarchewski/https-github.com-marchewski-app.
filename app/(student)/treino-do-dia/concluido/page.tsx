import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StudentCard from "@/components/student/StudentCard";
import AchievementBadge from "@/components/student/AchievementBadge";
import WorkoutShareCard from "@/components/WorkoutShareCard";
import { calculateStreak } from "@/lib/streak";
import { groupExercisesByMethod } from "@/lib/workoutMethods";
import { estimateBlockSeconds } from "@/lib/workoutTime";
import {
  STREAK_TIERS,
  WORKOUT_COUNT_TIERS,
  VOLUME_TIERS,
  finishedOnTime,
  detectPRs,
  type Tier,
} from "@/lib/achievements";

function newlyCrossed(tiers: Tier[], before: number, after: number): Tier[] {
  return tiers.filter((t) => before < t.threshold && after >= t.threshold);
}

export default async function TreinoConcluidoPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string; l?: string }>;
}) {
  const { w: workoutId, l: label } = await searchParams;
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
    return <StudentCard className="text-blue">Nenhum treino vinculado à sua conta ainda.</StudentCard>;
  }

  if (!workoutId || !label) {
    return (
      <StudentCard className="text-blue">
        Volte pro treino do dia e conclua os exercícios pra ver o resumo aqui.
      </StudentCard>
    );
  }

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name")
    .eq("id", workoutId)
    .eq("student_id", student.id)
    .single();

  if (!workout) {
    return <StudentCard className="text-blue">Treino não encontrado.</StudentCard>;
  }

  const { data: exercisesInLabel } = await supabase
    .from("workout_exercises")
    .select(
      "id, sets, reps, rest_seconds, method, exercises:exercise_id (name, muscle_group)"
    )
    .eq("workout_id", workoutId)
    .eq("label", label);

  if (!exercisesInLabel || exercisesInLabel.length === 0) {
    return <StudentCard className="text-blue">Nenhum exercício cadastrado nesse treino ainda.</StudentCard>;
  }

  const exerciseIdsToday = exercisesInLabel.map((we) => we.id);

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
      <StudentCard className="text-blue">
        Termine todos os exercícios do treino de hoje pra ver o resumo.
      </StudentCard>
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
    (exercisesInLabel ?? []).map((we) => [we.id, we.sets])
  );
  const totalKg = completedLogs.reduce((sum, log) => {
    const sets = setsByExerciseId.get(log.workout_exercise_id);
    const actualLoad = (log as any).actual_load;
    if (sets && actualLoad) return sum + sets * Number(actualLoad);
    return sum;
  }, 0);

  const studentName = (student as any).profiles?.name ?? "Aluno";

  // --- conquistas de hoje -------------------------------------------------

  // tempo esperado do bloco, pra comparar com o tempo real de execução
  const rowsWithMuscle = (exercisesInLabel as any[]).map((we) => ({
    sets: we.sets,
    reps: we.reps,
    rest_seconds: we.rest_seconds,
    method: we.method,
    muscleGroup: we.exercises?.muscle_group ?? null,
  }));
  const estimatedMinutes = estimateBlockSeconds(groupExercisesByMethod(rowsWithMuscle)) / 60;
  const onTime = durationMinutes != null && finishedOnTime(durationMinutes, estimatedMinutes);

  // histórico completo do aluno, pra saber recorde de carga por exercício
  // e o "antes x depois" dos marcos (sequência, treinos, kg movidos)
  const { data: allLogs } = await supabase
    .from("workout_logs")
    .select(
      "date, actual_load, workout_exercise_id, workout_exercises:workout_exercise_id (sets, exercises:exercise_id (name))"
    )
    .eq("student_id", student.id)
    .eq("completed", true);

  const allLogsTyped = (allLogs ?? []) as any[];
  const allTrainedDates = [...new Set(allLogsTyped.map((l) => l.date))];
  const trainedDatesBeforeToday = allTrainedDates.filter((d) => d !== today);

  const streakBefore = calculateStreak(trainedDatesBeforeToday);
  const streakAfter = calculateStreak(allTrainedDates);
  const workoutsCountBefore = trainedDatesBeforeToday.length;
  const workoutsCountAfter = allTrainedDates.length;

  function volumeOf(logs: any[]) {
    return logs.reduce((sum, l) => {
      const sets = l.workout_exercises?.sets;
      if (sets && l.actual_load) return sum + sets * Number(l.actual_load);
      return sum;
    }, 0);
  }
  const volumeBefore = volumeOf(allLogsTyped.filter((l) => l.date !== today));
  const volumeAfter = volumeOf(allLogsTyped);

  const previousBestByExercise = new Map<string, number>();
  for (const l of allLogsTyped) {
    if (l.date >= today) continue;
    const name = l.workout_exercises?.exercises?.name;
    if (!name || !l.actual_load) continue;
    const load = Number(l.actual_load);
    if (!previousBestByExercise.has(name) || load > previousBestByExercise.get(name)!) {
      previousBestByExercise.set(name, load);
    }
  }

  const idToName = new Map(
    (exercisesInLabel as any[]).map((we) => [we.id, we.exercises?.name ?? "Exercício"])
  );
  const todayLoads = completedLogs
    .filter((l) => (l as any).actual_load)
    .map((l) => ({
      exerciseName: idToName.get(l.workout_exercise_id) ?? "Exercício",
      load: Number((l as any).actual_load),
    }));
  const prExercises = detectPRs(todayLoads, previousBestByExercise);

  const newStreakTiers = newlyCrossed(STREAK_TIERS, streakBefore, streakAfter);
  const newCountTiers = newlyCrossed(WORKOUT_COUNT_TIERS, workoutsCountBefore, workoutsCountAfter);
  const newVolumeTiers = newlyCrossed(VOLUME_TIERS, volumeBefore, volumeAfter);
  const milestoneBadges = [...newStreakTiers, ...newCountTiers, ...newVolumeTiers];

  const hasAchievements = onTime || prExercises.length > 0 || milestoneBadges.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Treino concluído! 🎉</h1>

      <div className="grid grid-cols-3 gap-3 text-center">
        <StudentCard>
          <p className="text-2xl font-bold text-navy">{totalCount}</p>
          <p className="text-xs text-blue">exercícios</p>
        </StudentCard>
        <StudentCard>
          <p className="text-2xl font-bold text-navy">{durationMinutes ?? "-"}</p>
          <p className="text-xs text-blue">minutos</p>
        </StudentCard>
        <StudentCard>
          <p className="text-2xl font-bold text-navy">{totalKg > 0 ? Math.round(totalKg) : "-"}</p>
          <p className="text-xs text-blue">kg movidos</p>
        </StudentCard>
      </div>

      {hasAchievements && (
        <StudentCard glow>
          <p className="mb-3 font-heading font-semibold text-navy">Conquistas de hoje 🏅</p>
          <div className="flex flex-wrap gap-3">
            {onTime && (
              <AchievementBadge emoji="⏱️" label="Dentro do tempo" achieved size="sm" />
            )}
            {prExercises.map((name) => (
              <AchievementBadge key={name} emoji="💪" label={`Recorde: ${name}`} achieved size="sm" />
            ))}
            {milestoneBadges.map((t) => (
              <AchievementBadge key={t.label} emoji={t.emoji} label={t.label} achieved size="sm" />
            ))}
          </div>
        </StudentCard>
      )}

      <WorkoutShareCard
        studentName={studentName}
        workoutName={workout.name}
        label={label}
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
