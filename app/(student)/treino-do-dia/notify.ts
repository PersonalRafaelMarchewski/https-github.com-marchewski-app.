"use server";

import { createClient } from "@/lib/supabase/server";
import { sendPushToProfile } from "@/lib/sendPush";

// Chamado só na primeira vez que um exercício é marcado como concluído
// (nunca em edições de um exercício já concluído) — se esse exercício
// era o último que faltava da ficha, avisa o personal.
export async function notifyTrainerIfWorkoutCompleted(workoutExerciseId: string, date: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: student } = await supabase
    .from("students")
    .select("id, trainer_id, profiles:profile_id (name)")
    .eq("profile_id", user.id)
    .single();
  if (!student) return;

  const { data: we } = await supabase
    .from("workout_exercises")
    .select("workout_id, label, workouts:workout_id (name)")
    .eq("id", workoutExerciseId)
    .single();
  if (!we) return;

  const { data: siblings } = await supabase
    .from("workout_exercises")
    .select("id")
    .eq("workout_id", we.workout_id)
    .eq("label", we.label);
  const exerciseIds = (siblings ?? []).map((s) => s.id);
  if (exerciseIds.length === 0) return;

  const { data: logs } = await supabase
    .from("workout_logs")
    .select("completed")
    .eq("student_id", student.id)
    .eq("date", date)
    .in("workout_exercise_id", exerciseIds);

  const completedCount = (logs ?? []).filter((l) => l.completed).length;
  if (completedCount < exerciseIds.length) return; // ainda faltam exercícios

  const studentName = (student as any).profiles?.name ?? "Um aluno";
  const workoutName = (we as any).workouts?.name ?? "o treino";

  await sendPushToProfile(student.trainer_id, {
    title: `${studentName} terminou o treino! 🎉`,
    body: `${workoutName} (Ficha ${we.label}) concluído.`,
    url: `/alunos/${student.id}`,
  });
}
