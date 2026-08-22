import { todayInBrazil } from "@/lib/date";

// Montagem dos dados da tela de execução de treino (fichas ativas +
// exercícios + alternativas + logs de hoje + histórico de sessões).
//
// Extraído de app/(student)/treino-do-dia/page.tsx palavra por palavra
// quando o "modo treino" do personal nasceu (o personal rodando o treino
// do aluno de personal no próprio celular): as duas telas mostram a MESMA
// ficha e precisam montar os dados do MESMO jeito — duplicar isso era
// garantia de divergência no primeiro ajuste.
//
// Quem chama decide de qual aluno: a tela do aluno passa o próprio
// student.id; a do personal passa o id do aluno escolhido (a RLS garante
// que só devolve dados de aluno da carteira de quem pergunta).

type AlternativeExercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  video_url: string | null;
  instructions: string | null;
};

export type TrainingData =
  | { status: "no-workouts" }
  | { status: "no-exercises" }
  | {
      status: "ok";
      sessions: any[];
      logByExercise: Record<string, any>;
      lastDoneBySession: Record<string, string | null>;
      initialIndex: number;
      today: string;
    };

export async function loadTrainingData(
  supabase: any,
  studentId: string
): Promise<TrainingData> {
  const { data: activeWorkouts } = await supabase
    .from("workouts")
    .select("id, name")
    .eq("student_id", studentId)
    .eq("status", "active")
    .order("start_date", { ascending: false });

  if (!activeWorkouts || activeWorkouts.length === 0) {
    return { status: "no-workouts" };
  }

  const workoutIds = activeWorkouts.map((w: any) => w.id);
  const { data: allExercises } = await supabase
    .from("workout_exercises")
    .select(
      "id, workout_id, label, sets, reps, load, rest_seconds, method, order_index, exercise_id, exercises:exercise_id (name, muscle_group, video_url, instructions)"
    )
    .in("workout_id", workoutIds)
    .order("order_index");

  if (!allExercises || allExercises.length === 0) {
    return { status: "no-exercises" };
  }

  // exercícios alternativos (ex: máquina ocupada) — tabela nova, tolera
  // não existir ainda (fica sem alternativa nenhuma até a migração rodar)
  const exerciseDetailsById = new Map<string, AlternativeExercise>();
  for (const we of allExercises as any[]) {
    if (we.exercise_id && we.exercises && !exerciseDetailsById.has(we.exercise_id)) {
      exerciseDetailsById.set(we.exercise_id, {
        id: we.exercise_id,
        name: we.exercises.name ?? "Exercício",
        muscle_group: we.exercises.muscle_group ?? null,
        video_url: we.exercises.video_url ?? null,
        instructions: we.exercises.instructions ?? null,
      });
    }
  }

  const prescribedExerciseIds = [...new Set((allExercises as any[]).map((e) => e.exercise_id))];
  const alternativesByExerciseId = new Map<string, AlternativeExercise[]>();
  try {
    const idsList = prescribedExerciseIds.join(",");
    const { data: altRows } = await supabase
      .from("exercise_alternatives")
      .select("exercise_id, alternative_exercise_id")
      .or(`exercise_id.in.(${idsList}),alternative_exercise_id.in.(${idsList})`);

    const missingIds = new Set<string>();
    for (const row of altRows ?? []) {
      if (!exerciseDetailsById.has(row.exercise_id)) missingIds.add(row.exercise_id);
      if (!exerciseDetailsById.has(row.alternative_exercise_id)) missingIds.add(row.alternative_exercise_id);
    }
    if (missingIds.size > 0) {
      const { data: extraExercises } = await supabase
        .from("exercises")
        .select("id, name, muscle_group, video_url, instructions")
        .in("id", [...missingIds]);
      for (const ex of extraExercises ?? []) {
        exerciseDetailsById.set(ex.id, ex as AlternativeExercise);
      }
    }

    for (const row of altRows ?? []) {
      const a = exerciseDetailsById.get(row.exercise_id);
      const b = exerciseDetailsById.get(row.alternative_exercise_id);
      if (!a || !b) continue;
      (alternativesByExerciseId.get(a.id) ?? alternativesByExerciseId.set(a.id, []).get(a.id)!).push(b);
      (alternativesByExerciseId.get(b.id) ?? alternativesByExerciseId.set(b.id, []).get(b.id)!).push(a);
    }
  } catch {
    // tabela ainda não existe (migração pendente) — segue sem alternativas
  }

  // agrupa por sessão (treino + bloco) — cada uma vira um painel do
  // carrossel. Bloco não existe pro aluno: o que identifica cada ficha é
  // o NOME DO TREINO (cada treino é uma ficha), nunca a letra interna.
  const sessionMap = new Map<string, any>();
  for (const we of allExercises as any[]) {
    const key = `${we.workout_id}:${we.label}`;
    if (!sessionMap.has(key)) {
      const wk = activeWorkouts.find((w: any) => w.id === we.workout_id)!;
      sessionMap.set(key, {
        workoutId: we.workout_id,
        workoutName: wk.name,
        label: we.label,
        exercises: [],
      });
    }
    sessionMap.get(key)!.exercises.push({
      ...we,
      alternatives: alternativesByExerciseId.get(we.exercise_id) ?? [],
    });
  }
  const sessions = [...sessionMap.values()];

  const today = todayInBrazil();

  // última vez que cada ficha (treino+bloco) foi CONCLUÍDA de verdade
  // (apertou "Concluir treino", não só marcou exercício avulso) — usado
  // pro seletor de fichas sugerir qual fazer hoje e avisar quando uma
  // ficha específica está ficando pra trás em relação às outras.
  const { data: sessionHistory } = await supabase
    .from("workout_sessions")
    .select("workout_id, label, session_date")
    .eq("student_id", studentId)
    .in("workout_id", workoutIds)
    .order("session_date", { ascending: false });

  const lastDoneBySession: Record<string, string | null> = {};
  for (const row of (sessionHistory ?? []) as any[]) {
    const key = `${row.workout_id}:${row.label}`;
    if (!(key in lastDoneBySession)) lastDoneBySession[key] = row.session_date;
  }

  const allExerciseIds = (allExercises as any[]).map((e) => e.id);
  // actual_loads (carga por série) é coluna nova; se a migração ainda não
  // rodou, pedir ela derruba a consulta inteira, então tenta sem ela nesse
  // caso.
  let todayLogs: any[] | null = null;
  {
    const { data, error } = await supabase
      .from("workout_logs")
      .select(
        "id, workout_exercise_id, completed, difficulty_rating, feedback_text, video_path, actual_load, actual_loads, actual_reps, substituted_exercise_id, trainer_feedback_text, trainer_rating"
      )
      .eq("student_id", studentId)
      .eq("date", today)
      .in("workout_exercise_id", allExerciseIds);
    if (error) {
      const fallback = await supabase
        .from("workout_logs")
        .select(
          "id, workout_exercise_id, completed, difficulty_rating, feedback_text, video_path, actual_load, trainer_feedback_text, trainer_rating"
        )
        .eq("student_id", studentId)
        .eq("date", today)
        .in("workout_exercise_id", allExerciseIds);
      todayLogs = fallback.data;
    } else {
      todayLogs = data;
    }
  }

  const logByExercise: Record<string, any> = {};
  for (const log of todayLogs ?? []) {
    logByExercise[log.workout_exercise_id] = {
      ...log,
      substituted_exercise: log.substituted_exercise_id
        ? (exerciseDetailsById.get(log.substituted_exercise_id) ?? null)
        : null,
    };
  }

  // se já registrou algo hoje numa sessão só, o carrossel abre nela
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

  return { status: "ok", sessions, logByExercise, lastDoneBySession, initialIndex, today };
}
