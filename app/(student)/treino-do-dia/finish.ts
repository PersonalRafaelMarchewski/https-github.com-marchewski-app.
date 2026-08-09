"use server";

import { createClient } from "@/lib/supabase/server";
import { sendPushToProfile } from "@/lib/sendPush";

// Chamado quando o aluno aperta "Concluir treino" — independente de ter
// feito todos os exercícios da ficha ou não. É essa ação explícita, e não
// a contagem de exercícios, que dispara o aviso pro personal.
export async function finishWorkoutSession(workoutId: string, label: string) {
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

  const { data: workout } = await supabase
    .from("workouts")
    .select("name")
    .eq("id", workoutId)
    .eq("student_id", student.id)
    .single();
  if (!workout) return;

  // não manda aviso se o aluno não fez nenhum exercício dessa ficha hoje
  const today = new Date().toISOString().slice(0, 10);
  const { data: exercises } = await supabase
    .from("workout_exercises")
    .select("id")
    .eq("workout_id", workoutId)
    .eq("label", label);
  const exerciseIds = (exercises ?? []).map((e) => e.id);
  if (exerciseIds.length === 0) return;

  const { data: logs } = await supabase
    .from("workout_logs")
    .select("completed")
    .eq("student_id", student.id)
    .eq("date", today)
    .in("workout_exercise_id", exerciseIds);
  const completedCount = (logs ?? []).filter((l) => l.completed).length;
  if (completedCount === 0) return;

  // registra a sessão do dia (alimenta a barra de progresso do programa e
  // o indicador de treinos concluídos) — se a tabela ainda não existir
  // (migração pendente), só ignora e segue o fluxo normal.
  await supabase
    .from("workout_sessions")
    .upsert(
      {
        workout_id: workoutId,
        student_id: student.id,
        label,
        session_date: today,
        completed_exercises: completedCount,
        total_exercises: exerciseIds.length,
      },
      { onConflict: "workout_id,label,session_date" }
    );

  const studentName = (student as any).profiles?.name ?? "Um aluno";

  await sendPushToProfile(student.trainer_id, {
    title: `${studentName} terminou o treino! 🎉`,
    body: `${workout.name} (Ficha ${label}) — ${completedCount} de ${exerciseIds.length} exercícios.`,
    url: `/alunos/${student.id}`,
  });
}

// Nota de satisfação (1-5) que o aluno dá na tela de resumo, depois de
// concluir o treino. Vira o indicador de "feedback dos treinos" pro
// personal (igual MFIT/Personal Fit mostram no próprio painel deles).
export async function rateWorkoutSession(
  workoutId: string,
  label: string,
  sessionDate: string,
  rating: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada, faça login de novo.");

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!student) throw new Error("Aluno não encontrado.");

  const { error } = await supabase
    .from("workout_sessions")
    .upsert(
      { workout_id: workoutId, student_id: student.id, label, session_date: sessionDate, rating },
      { onConflict: "workout_id,label,session_date" }
    );

  if (error) {
    throw new Error("Não foi possível salvar sua avaliação.");
  }
}
