import Link from "next/link";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import StudentCard from "@/components/student/StudentCard";
import AchievementBadge from "@/components/student/AchievementBadge";
import WorkoutShareCard from "@/components/WorkoutShareCard";
import WorkoutRatingWidget from "@/components/student/WorkoutRatingWidget";
import EditableDurationStat from "@/components/EditableDurationStat";
import { calculateStreak } from "@/lib/streak";
import { groupExercisesByMethod } from "@/lib/workoutMethods";
import { estimateBlockSeconds } from "@/lib/workoutTime";
import { todayInBrazil } from "@/lib/date";
import {
  STREAK_TIERS,
  WORKOUT_COUNT_TIERS,
  VOLUME_TIERS,
  finishedOnTime,
  detectPRs,
  type Tier,
} from "@/lib/achievements";

// Essa tela mostra dados que acabaram de ser registrados (carga, kg
// movidos, conquistas) — sem isso, o Next.js pode servir uma versão em
// cache com números desatualizados pro aluno.
export const dynamic = "force-dynamic";

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
  const user = await getAuthUser();

  const { data: student } = await supabase
    .from("students")
    .select("id")
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

  // bilateral_load (carga por lado) é coluna nova; se a migração ainda
  // não rodou, pedir ela derruba a consulta inteira — tenta sem ela.
  let exercisesInLabel: any[] | null = null;
  {
    const { data, error } = await supabase
      .from("workout_exercises")
      .select(
        "id, sets, reps, rest_seconds, method, exercises:exercise_id (name, muscle_group, bilateral_load)"
      )
      .eq("workout_id", workoutId)
      .eq("label", label);
    if (error) {
      const fallback = await supabase
        .from("workout_exercises")
        .select(
          "id, sets, reps, rest_seconds, method, exercises:exercise_id (name, muscle_group)"
        )
        .eq("workout_id", workoutId)
        .eq("label", label);
      exercisesInLabel = fallback.data;
    } else {
      exercisesInLabel = data;
    }
  }

  if (!exercisesInLabel || exercisesInLabel.length === 0) {
    return <StudentCard className="text-blue">Nenhum exercício cadastrado nesse treino ainda.</StudentCard>;
  }

  const exerciseIdsToday = exercisesInLabel.map((we) => we.id);

  const today = todayInBrazil();
  let logsToday: any[] | null = null;
  {
    const { data, error } = await supabase
      .from("workout_logs")
      .select(
        "workout_exercise_id, completed, created_at, actual_load, actual_loads, actual_reps, substituted_exercise:substituted_exercise_id (name)"
      )
      .eq("student_id", student.id)
      .eq("date", today)
      .in("workout_exercise_id", exerciseIdsToday);
    if (error) {
      const fallback = await supabase
        .from("workout_logs")
        .select("workout_exercise_id, completed, created_at, actual_load")
        .eq("student_id", student.id)
        .eq("date", today)
        .in("workout_exercise_id", exerciseIdsToday);
      logsToday = fallback.data;
    } else {
      logsToday = data;
    }
  }

  const completedLogs = (logsToday ?? []).filter((l) => l.completed);
  const totalCount = exerciseIdsToday.length;
  const completedCount = completedLogs.length;

  if (totalCount === 0 || completedCount === 0) {
    return (
      <StudentCard className="text-blue">
        Complete pelo menos um exercício do treino de hoje pra poder compartilhar.
      </StudentCard>
    );
  }

  const timestamps = completedLogs.map((l) => new Date(l.created_at).getTime());
  const computedMinutes =
    timestamps.length > 1
      ? Math.max(1, Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 60_000))
      : null;

  // se o aluno já corrigiu o tempo (lápis no card), o valor salvo na
  // sessão vence o calculado — duration_minutes é coluna nova, tolera a
  // migração pendente
  let savedMinutes: number | null = null;
  try {
    const { data: sessionRow } = await supabase
      .from("workout_sessions")
      .select("duration_minutes")
      .eq("workout_id", workoutId)
      .eq("student_id", student.id)
      .eq("label", label)
      .eq("session_date", today)
      .maybeSingle();
    savedMinutes = (sessionRow as any)?.duration_minutes ?? null;
  } catch {
    savedMinutes = null;
  }
  const durationMinutes = savedMinutes ?? computedMinutes;

  // carga por lado (halteres/articulada/unilateral): a contribuição do
  // exercício nos kg movidos dobra — são dois lados executando a carga
  // anotada. Vale também quando o aluno trocou por alternativa (usa o
  // flag do exercício prescrito — as alternativas são do mesmo tipo).
  const loadFactorByExerciseId = new Map(
    (exercisesInLabel ?? []).map((we: any) => [we.id, we.exercises?.bilateral_load ? 2 : 1])
  );

  // kilagem total, do jeito mais certo disponível pra cada exercício:
  // 1) carga x repetições de cada série (o kg de verdade levantado) quando
  //    o aluno registrou as duas coisas;
  // 2) senão, soma só a carga de cada série (sem saber quantas repetições,
  //    é a melhor aproximação);
  // 3) senão, cai pro cálculo antigo (carga única x séries) pra
  //    compatibilidade com logs de antes dessas colunas existirem.
  const setsByExerciseId = new Map(
    (exercisesInLabel ?? []).map((we) => [we.id, we.sets])
  );
  const totalKg = completedLogs.reduce((sum, log) => {
    const factor = loadFactorByExerciseId.get(log.workout_exercise_id) ?? 1;
    const actualLoads = (log as any).actual_loads as (number | null)[] | undefined;
    const actualReps = (log as any).actual_reps as (number | null)[] | undefined;

    if (actualLoads && actualLoads.some((v) => v != null)) {
      if (actualReps && actualReps.some((v) => v != null)) {
        return (
          sum +
          factor *
            actualLoads.reduce((s: number, loadValue, i) => {
              const repsValue = actualReps[i];
              if (loadValue == null || repsValue == null) return s;
              return s + Number(loadValue) * Number(repsValue);
            }, 0)
        );
      }
      return sum + factor * actualLoads.reduce((s: number, v) => s + (Number(v) || 0), 0);
    }
    const sets = setsByExerciseId.get(log.workout_exercise_id);
    const actualLoad = (log as any).actual_load;
    if (sets && actualLoad) return sum + factor * sets * Number(actualLoad);
    return sum;
  }, 0);

  // --- conquistas de hoje -------------------------------------------------
  // chegar nessa tela já é o aluno dizendo "terminei" (apertou o botão de
  // concluir) — então conta pra conquistas mesmo que não tenha feito
  // 100% dos exercícios da ficha.

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
  // e o "antes x depois" dos marcos (sequência, treinos, kg movidos).
  // actual_loads (carga por série) é coluna nova; se a migração ainda não
  // rodou, pedir ela derruba a consulta inteira, então tenta sem ela.
  let allLogs: any[] | null = null;
  {
    const { data, error } = await supabase
      .from("workout_logs")
      .select(
        "date, actual_load, actual_loads, workout_exercise_id, substituted_exercise:substituted_exercise_id (name), workout_exercises:workout_exercise_id (sets, exercises:exercise_id (name, bilateral_load))"
      )
      .eq("student_id", student.id)
      .eq("completed", true);
    if (error) {
      const fallback = await supabase
        .from("workout_logs")
        .select(
          "date, actual_load, workout_exercise_id, workout_exercises:workout_exercise_id (sets, exercises:exercise_id (name))"
        )
        .eq("student_id", student.id)
        .eq("completed", true);
      allLogs = fallback.data;
    } else {
      allLogs = data;
    }
  }

  const allLogsTyped = (allLogs ?? []) as any[];
  // se o aluno trocou por uma alternativa (máquina ocupada), o recorde
  // conta pro exercício que ele realmente fez, não pro prescrito
  const nameOf = (l: any) => l.substituted_exercise?.name ?? l.workout_exercises?.exercises?.name;
  const allTrainedDates = [...new Set(allLogsTyped.map((l) => l.date))];
  const trainedDatesBeforeToday = allTrainedDates.filter((d) => d !== today);

  const streakBefore = calculateStreak(trainedDatesBeforeToday);
  const streakAfter = calculateStreak(allTrainedDates);
  const workoutsCountBefore = trainedDatesBeforeToday.length;
  const workoutsCountAfter = allTrainedDates.length;

  const volumeOf = (logs: any[]) =>
    logs.reduce((sum, l) => {
      // carga por lado dobra a contribuição (mesma regra do totalKg acima)
      const factor = l.workout_exercises?.exercises?.bilateral_load ? 2 : 1;
      const perSetLoads: unknown[] = Array.isArray(l.actual_loads) ? l.actual_loads : [];
      const perSetSum = perSetLoads.reduce(
        (s: number, v) => (typeof v === "number" ? s + v : s),
        0
      );
      if (perSetSum > 0) return sum + factor * perSetSum;
      const sets = l.workout_exercises?.sets;
      if (sets && l.actual_load) return sum + factor * sets * Number(l.actual_load);
      return sum;
    }, 0);
  const volumeBefore = volumeOf(allLogsTyped.filter((l) => l.date !== today));
  const volumeAfter = volumeOf(allLogsTyped);

  const previousBestByExercise = new Map<string, number>();
  for (const l of allLogsTyped) {
    if (l.date >= today) continue;
    const name = nameOf(l);
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
      exerciseName:
        (l as any).substituted_exercise?.name ?? idToName.get(l.workout_exercise_id) ?? "Exercício",
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
          <p className="text-2xl font-bold text-navy">{completedCount}</p>
          <p className="text-xs text-blue">exercícios</p>
        </StudentCard>
        <EditableDurationStat
          minutes={durationMinutes}
          workoutId={workoutId}
          label={label}
          sessionDate={today}
        />
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

      <WorkoutRatingWidget workoutId={workoutId} label={label} sessionDate={today} />

      <WorkoutShareCard
        exerciseCount={completedCount}
        totalKg={totalKg > 0 ? totalKg : null}
        dateIso={today}
      />

      <Link href="/treino-do-dia" className="block text-center text-sm text-blue hover:underline">
        ← Voltar pro treino
      </Link>
    </div>
  );
}
