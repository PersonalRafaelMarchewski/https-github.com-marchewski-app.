"use server";

import { createClient } from "@/lib/supabase/server";
import { todayInBrazil } from "@/lib/date";

// Versão do "Concluir treino" pro modo treino do personal — irmã da
// finishWorkoutSession do aluno (app/(student)/treino-do-dia/finish.ts),
// com duas diferenças de propósito:
//
// 1. O aluno é o da URL, não o do login (o personal está logado como ele
//    mesmo). A posse é conferida aqui (trainer_id = quem chama) ALÉM da
//    RLS — cinto e suspensório, igual ao resto do app.
// 2. NÃO manda push de "fulano terminou o treino" — o aviso existe pro
//    personal saber do treino que ele não viu; aqui foi ele que rodou.
export async function finishWorkoutAsTrainer(
  studentId: string,
  workoutId: string,
  label: string,
  durationMinutes?: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // só segue se o aluno é da carteira de quem está chamando
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("trainer_id", user.id)
    .single();
  if (!student) return;

  const { data: workout } = await supabase
    .from("workouts")
    .select("id")
    .eq("id", workoutId)
    .eq("student_id", student.id)
    .single();
  if (!workout) return;

  // não registra sessão se nenhum exercício dessa ficha foi feito hoje
  const today = todayInBrazil();
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
  // o indicador de treinos concluídos) — mesma escrita que o aluno faria
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
        // duração real do cronômetro, quando quem rodou o treino deu play
        ...(durationMinutes != null && durationMinutes >= 1 && durationMinutes <= 600
          ? { duration_minutes: Math.round(durationMinutes) }
          : {}),
      },
      { onConflict: "workout_id,label,session_date" }
    );
}
