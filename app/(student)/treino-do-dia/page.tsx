import { createClient } from "@/lib/supabase/server";
import StudentCard from "@/components/student/StudentCard";
import FichaCarousel, { type Session } from "@/components/student/FichaCarousel";

export default async function TreinoDoDiaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  if (!student) {
    return <StudentCard className="text-blue">Nenhum treino vinculado à sua conta ainda.</StudentCard>;
  }

  const { data: activeWorkouts } = await supabase
    .from("workouts")
    .select("id, name")
    .eq("student_id", student.id)
    .eq("status", "active")
    .order("start_date", { ascending: false });

  if (!activeWorkouts || activeWorkouts.length === 0) {
    return <StudentCard className="text-blue">Nenhum treino ativo no momento.</StudentCard>;
  }

  const workoutIds = activeWorkouts.map((w) => w.id);
  const { data: allExercises } = await supabase
    .from("workout_exercises")
    .select(
      "id, workout_id, label, sets, reps, load, rest_seconds, method, order_index, exercises:exercise_id (name, muscle_group, video_url, instructions)"
    )
    .in("workout_id", workoutIds)
    .order("order_index");

  if (!allExercises || allExercises.length === 0) {
    return <StudentCard className="text-blue">Nenhum exercício cadastrado ainda.</StudentCard>;
  }

  // agrupa por sessão (treino + bloco) — cada uma vira um painel do
  // carrossel. Bloco não existe pro aluno: o que identifica cada ficha é
  // o NOME DO TREINO (cada treino é uma ficha), nunca a letra interna.
  const sessionMap = new Map<string, Session>();
  for (const we of allExercises as any[]) {
    const key = `${we.workout_id}:${we.label}`;
    if (!sessionMap.has(key)) {
      const wk = activeWorkouts.find((w) => w.id === we.workout_id)!;
      sessionMap.set(key, {
        workoutId: we.workout_id,
        workoutName: wk.name,
        label: we.label,
        exercises: [],
      });
    }
    sessionMap.get(key)!.exercises.push(we);
  }
  const sessions = [...sessionMap.values()];

  const today = new Date().toISOString().slice(0, 10);
  const allExerciseIds = (allExercises as any[]).map((e) => e.id);
  // actual_loads (carga por série) é coluna nova; se a migração ainda não
  // rodou, pedir ela derruba a consulta inteira, então tenta sem ela nesse
  // caso.
  let todayLogs: any[] | null = null;
  {
    const { data, error } = await supabase
      .from("workout_logs")
      .select(
        "id, workout_exercise_id, completed, difficulty_rating, feedback_text, video_path, actual_load, actual_loads, trainer_feedback_text, trainer_rating"
      )
      .eq("student_id", student.id)
      .eq("date", today)
      .in("workout_exercise_id", allExerciseIds);
    if (error) {
      const fallback = await supabase
        .from("workout_logs")
        .select(
          "id, workout_exercise_id, completed, difficulty_rating, feedback_text, video_path, actual_load, trainer_feedback_text, trainer_rating"
        )
        .eq("student_id", student.id)
        .eq("date", today)
        .in("workout_exercise_id", allExerciseIds);
      todayLogs = fallback.data;
    } else {
      todayLogs = data;
    }
  }

  const logByExercise: Record<string, NonNullable<typeof todayLogs>[number]> = {};
  for (const log of todayLogs ?? []) {
    logByExercise[log.workout_exercise_id] = log;
  }

  // se o aluno já registrou algo hoje numa sessão só, o carrossel abre nela
  const exerciseToSessionIndex = new Map(
    (allExercises as any[]).map((e) => [
      e.id,
      sessions.findIndex((s) => s.workoutId === e.workout_id && s.label === e.label),
    ])
  );
  const sessionIndexesToday = new Set(
    (todayLogs ?? []).map((l) => exerciseToSessionIndex.get(l.workout_exercise_id)).filter((i) => i !== undefined)
  );
  const initialIndex = sessionIndexesToday.size === 1 ? [...sessionIndexesToday][0]! : 0;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-navy">Fichas de treinamento</h1>
      <p className="mb-5 text-blue">
        {sessions.length > 1 ? "Arraste pros lados pra trocar de ficha." : "Sua ficha de hoje."}
      </p>

      <FichaCarousel
        sessions={sessions}
        logByExercise={logByExercise as any}
        studentId={student.id}
        today={today}
        initialIndex={initialIndex}
      />
    </div>
  );
}
