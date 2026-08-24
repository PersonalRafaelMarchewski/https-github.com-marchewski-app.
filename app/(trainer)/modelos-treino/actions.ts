"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteWorkoutTemplate(templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("workout_templates").delete().eq("id", templateId);

  if (error) {
    throw new Error("Não foi possível apagar o modelo.");
  }

  revalidatePath("/modelos-treino");
  revalidatePath("/treinos/novo");
}

// Salva um treino JÁ MONTADO (da edição, dentro do painel do aluno) como
// modelo reutilizável — o caminho inverso do WorkoutTemplatePicker. Os
// labels (blocos A/B) e a ordem vêm juntos. A RLS já limita workouts ao
// dono, mas a posse é conferida explicitamente mesmo assim.
export async function saveWorkoutAsTemplate(workoutId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada, faça login de novo.");

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, trainer_id")
    .eq("id", workoutId)
    .single();
  if (!workout || workout.trainer_id !== user.id) {
    throw new Error("Treino não encontrado.");
  }

  const { data: exercises } = await supabase
    .from("workout_exercises")
    .select("exercise_id, label, sets, reps, load, rest_seconds, method, order_index")
    .eq("workout_id", workoutId)
    .order("order_index");
  if (!exercises || exercises.length === 0) {
    throw new Error("Esse treino ainda não tem exercícios pra virar modelo.");
  }

  const { data: template, error: templateError } = await supabase
    .from("workout_templates")
    .insert({ trainer_id: user.id, name: name.trim() || workout.name })
    .select("id")
    .single();
  if (templateError || !template) {
    throw new Error("Não foi possível criar o modelo.");
  }

  const { error: exercisesError } = await supabase
    .from("workout_template_exercises")
    .insert(exercises.map((e) => ({ template_id: template.id, ...e })));
  if (exercisesError) {
    // não deixa modelo vazio pra trás se a segunda etapa falhar
    await supabase.from("workout_templates").delete().eq("id", template.id);
    throw new Error("Não foi possível salvar os exercícios do modelo.");
  }

  revalidatePath("/modelos-treino");
  revalidatePath("/treinos/novo");
}
