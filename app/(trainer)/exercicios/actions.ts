"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createExercise(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const muscleGroup = String(formData.get("muscle_group") ?? "").trim();
  const videoUrl = String(formData.get("video_url") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();

  if (!name) {
    throw new Error("Nome é obrigatório.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("exercises").insert({
    name,
    muscle_group: muscleGroup || null,
    video_url: videoUrl || null,
    instructions: instructions || null,
  });

  if (error) {
    throw new Error("Não foi possível criar o exercício.");
  }

  revalidatePath("/exercicios");
}

export async function updateExercise(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const muscleGroup = String(formData.get("muscle_group") ?? "").trim();
  const videoUrl = String(formData.get("video_url") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();

  if (!name) {
    throw new Error("Nome é obrigatório.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("exercises")
    .update({
      name,
      muscle_group: muscleGroup || null,
      video_url: videoUrl || null,
      instructions: instructions || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error("Não foi possível salvar o exercício.");
  }

  revalidatePath("/exercicios");
}

export async function deleteExercise(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("exercises").delete().eq("id", id);

  if (error) {
    throw new Error("Não foi possível remover: esse exercício já está sendo usado em algum treino.");
  }

  revalidatePath("/exercicios");
}
