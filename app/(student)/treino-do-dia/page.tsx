import { createClient } from "@/lib/supabase/server";
import ExerciseCard from "@/components/ExerciseCard";
import Card from "@/components/Card";

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

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name")
    .eq("student_id", student.id)
    .eq("status", "active")
    .maybeSingle();

  if (!workout) {
    return <Card className="text-blue">Nenhum treino ativo no momento.</Card>;
  }

  const { data: allWorkoutExercises } = await supabase
    .from("workout_exercises")
    .select(
      "id, label, sets, reps, load, rest_seconds, order_index, exercises:exercise_id (name, muscle_group, video_url, instructions)"
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
    .select("id, workout_exercise_id, completed, difficulty_rating, feedback_text")
    .eq("student_id", student.id)
    .eq("date", today);

  const logByExercise = new Map((logs ?? []).map((l) => [l.workout_exercise_id, l]));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-navy">Treino do dia</h1>
      <p className="mb-6 text-blue">
        {workout.name} — Treino {currentLabel}
      </p>

      <div className="space-y-3">
        {exercisesToday.map((we: any) => {
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
              existingLogId={log?.id ?? null}
              initialCompleted={log?.completed ?? false}
              initialRating={log?.difficulty_rating ?? null}
              initialFeedback={log?.feedback_text ?? null}
            />
          );
        })}
      </div>
    </div>
  );
}
