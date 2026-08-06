import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ExerciseCard from "@/components/ExerciseCard";
import Card from "@/components/Card";
import { groupExercisesByMethod } from "@/lib/workoutMethods";

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
    .select(
      "id, label, sets, reps, load, rest_seconds, method, order_index, exercises:exercise_id (name, muscle_group, video_url, instructions)"
    )
    .eq("workout_id", workout.id)
    .order("order_index");

  if (!allWorkoutExercises || allWorkoutExercises.length === 0) {
    return <Card className="text-blue">Nenhum exercício cadastrado nesse treino ainda.</Card>;
  }

  const labels = [...new Set(allWorkoutExercises.map((we) => we.label))].sort();

  // último treino concluído (pra saber qual é o próximo da rotação)
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

  const exercisesToday = allWorkoutExercises.filter((we) => we.label === currentLabel);

  const today = new Date().toISOString().slice(0, 10);
  const { data: logs } = await supabase
    .from("workout_logs")
    .select(
      "id, workout_exercise_id, completed, difficulty_rating, feedback_text, video_path, actual_load, trainer_feedback_text, trainer_rating"
    )
    .eq("student_id", student.id)
    .eq("date", today);

  const logByExercise = new Map((logs ?? []).map((l) => [l.workout_exercise_id, l]));
  const completedCount = exercisesToday.filter((we) => logByExercise.get(we.id)?.completed).length;
  const totalCount = exercisesToday.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-navy">Treino do dia</h1>

      <Card className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-heading font-semibold text-navy">{workout.name}</p>
            <p className="text-sm text-blue">{completedCount} de {totalCount} concluídos</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy font-heading text-sm font-bold text-white">
            {currentLabel}
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
            href="/treino-do-dia/concluido"
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
