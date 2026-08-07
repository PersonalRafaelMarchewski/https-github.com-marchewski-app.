import Link from "next/link";
import { PartyPopper, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ExerciseCard from "@/components/ExerciseCard";
import Card from "@/components/Card";
import { groupExercisesByMethod } from "@/lib/workoutMethods";

type WorkoutExerciseRow = {
  id: string;
  workout_id: string;
  label: string;
  sets: number | null;
  reps: string | null;
  load: string | null;
  rest_seconds: number | null;
  method: string | null;
  order_index: number | null;
  exercises: {
    name: string | null;
    muscle_group: string | null;
    video_url: string | null;
    instructions: string | null;
  } | null;
};

type Session = {
  workoutId: string;
  workoutName: string;
  label: string;
  exercises: WorkoutExerciseRow[];
};

export default async function TreinoDoDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string; l?: string }>;
}) {
  const { w: pickedWorkoutId, l: pickedLabel } = await searchParams;
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
    return <Card className="text-blue">Nenhum treino vinculado à sua conta ainda.</Card>;
  }

  const { data: activeWorkouts } = await supabase
    .from("workouts")
    .select("id, name")
    .eq("student_id", student.id)
    .eq("status", "active")
    .order("start_date", { ascending: false });

  if (!activeWorkouts || activeWorkouts.length === 0) {
    return <Card className="text-blue">Nenhum treino ativo no momento.</Card>;
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
    return <Card className="text-blue">Nenhum exercício cadastrado ainda.</Card>;
  }

  // agrupa por sessão (treino + bloco) — cada uma vira uma opção pro aluno escolher
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
  const { data: todayLogs } = await supabase
    .from("workout_logs")
    .select(
      "id, workout_exercise_id, completed, difficulty_rating, feedback_text, video_path, actual_load, trainer_feedback_text, trainer_rating"
    )
    .eq("student_id", student.id)
    .eq("date", today)
    .in("workout_exercise_id", allExerciseIds);

  const logByExercise = new Map((todayLogs ?? []).map((l) => [l.workout_exercise_id, l]));

  let chosen: Session | undefined =
    pickedWorkoutId && pickedLabel
      ? sessions.find((s) => s.workoutId === pickedWorkoutId && s.label === pickedLabel)
      : undefined;

  // só existindo uma ficha no total, nem precisa perguntar — vai direto pra ela
  if (!chosen && sessions.length === 1) {
    chosen = sessions[0];
  }

  // duas ou mais fichas ativas e nenhuma escolhida ainda: a página inicial
  // sempre lista todas, o aluno escolhe qual vai seguir. Sem "retomar
  // sozinho" nem botão de trocar — voltar aqui já mostra a lista de novo.
  if (!chosen) {
    return (
      <div>
        <h1 className="mb-1 text-2xl font-bold text-navy">Fichas de treinamento</h1>
        <p className="mb-6 text-blue">Escolha qual ficha você vai seguir agora.</p>
        <div className="space-y-3">
          {sessions.map((s) => {
            const doneCount = s.exercises.filter((e) => logByExercise.get(e.id)?.completed).length;
            return (
              <Link
                key={`${s.workoutId}:${s.label}`}
                href={`/treino-do-dia?w=${s.workoutId}&l=${s.label}`}
              >
                <Card className="flex items-center justify-between gap-3 hover:border-orange/50">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-navy font-heading text-sm font-bold text-white">
                      {s.label}
                    </span>
                    <div>
                      <p className="font-heading font-semibold text-navy">
                        Ficha {s.label} · {s.workoutName}
                      </p>
                      <p className="text-sm text-blue">
                        {s.exercises.length} exercícios
                        {doneCount > 0 ? ` · ${doneCount} já feito${doneCount === 1 ? "" : "s"} hoje` : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="flex-none text-lightblue" />
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  const exercisesToday = chosen.exercises;
  const completedCount = exercisesToday.filter((we) => logByExercise.get(we.id)?.completed).length;
  const totalCount = exercisesToday.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-navy">Ficha {chosen.label}</h1>

      <Card className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-heading font-semibold text-navy">{chosen.workoutName}</p>
            <p className="text-sm text-blue">
              {completedCount} de {totalCount} concluídos
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy font-heading text-sm font-bold text-white">
            {chosen.label}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-lightblue/20">
          <div
            className="h-full rounded-full bg-orange transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {totalCount > 0 && completedCount === totalCount && (
          <Link
            href={`/treino-do-dia/concluido?w=${chosen.workoutId}&l=${chosen.label}`}
            className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-blue"
          >
            <PartyPopper size={16} />
            Ver resumo e compartilhar
          </Link>
        )}
      </Card>

      <div className="space-y-3">
        {groupExercisesByMethod(exercisesToday).map((group, gi) => {
          const cards = group.items.map((we: any) => {
            const log = logByExercise.get(we.id);
            return (
              <ExerciseCard
                key={we.id}
                workoutExerciseId={we.id}
                studentId={student.id}
                date={today}
                exerciseName={we.exercises?.name ?? "Exercício"}
                muscleGroup={we.exercises?.muscle_group ?? null}
                videoUrl={we.exercises?.video_url ?? null}
                instructions={we.exercises?.instructions ?? null}
                sets={we.sets}
                reps={we.reps}
                load={we.load}
                restSeconds={we.rest_seconds}
                method={we.method}
                existingLogId={log?.id ?? null}
                initialCompleted={log?.completed ?? false}
                initialRating={log?.difficulty_rating ?? null}
                initialFeedback={log?.feedback_text ?? null}
                initialVideoPath={log?.video_path ?? null}
                initialActualLoad={log?.actual_load ?? null}
                trainerFeedbackText={log?.trainer_feedback_text ?? null}
                trainerRating={log?.trainer_rating ?? null}
              />
            );
          });

          if (group.items.length > 1) {
            return (
              <div key={gi} className="space-y-2 rounded-xl border border-orange/40 bg-orange/5 p-2">
                <span className="ml-1 inline-block rounded-full bg-orange/15 px-2.5 py-1 text-xs font-semibold text-orange">
                  {group.method} · sem descanso entre eles
                </span>
                {cards}
              </div>
            );
          }

          return cards;
        })}
      </div>
    </div>
  );
}
