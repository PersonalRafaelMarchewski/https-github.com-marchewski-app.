"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveWithSchemaCacheRetry } from "@/lib/supabaseRetry";

export async function createExercise(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const muscleGroup = String(formData.get("muscle_group") ?? "").trim();
  const videoUrl = String(formData.get("video_url") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const jointType = String(formData.get("joint_type") ?? "").trim();
  // carga por lado (halteres/articulada/unilateral): os totais de kg
  // movidos dobram a contribuição desses exercícios
  const bilateralLoad = formData.get("bilateral_load") === "true";

  if (!name) {
    throw new Error("Nome é obrigatório.");
  }

  const supabase = await createClient();
  // joint_type/bilateral_load toleram a migração ainda não ter rodado —
  // tenta com os campos novos e, se a API não conhecer, salva sem eles
  const { error } = await saveWithSchemaCacheRetry(
    (payload) => supabase.from("exercises").insert(payload),
    {
      name,
      muscle_group: muscleGroup || null,
      video_url: videoUrl || null,
      instructions: instructions || null,
      joint_type: jointType || null,
      bilateral_load: bilateralLoad,
    }
  );

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
  const jointType = String(formData.get("joint_type") ?? "").trim();
  const bilateralLoad = formData.get("bilateral_load") === "true";

  if (!name) {
    throw new Error("Nome é obrigatório.");
  }

  const supabase = await createClient();
  const { error } = await saveWithSchemaCacheRetry(
    (payload) => supabase.from("exercises").update(payload).eq("id", id),
    {
      name,
      muscle_group: muscleGroup || null,
      video_url: videoUrl || null,
      instructions: instructions || null,
      joint_type: jointType || null,
      bilateral_load: bilateralLoad,
    }
  );

  if (error) {
    throw new Error("Não foi possível salvar o exercício.");
  }

  revalidatePath("/exercicios");
}

// Substitui a lista inteira de alternativas de um exercício (ex: leg press
// e agachamento livre como alternativas do agachamento no Smith, pra usar
// quando a máquina estiver ocupada ou não existir na academia do aluno).
export async function setExerciseAlternatives(exerciseId: string, alternativeIds: string[]) {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("exercise_alternatives")
    .delete()
    .eq("exercise_id", exerciseId);

  if (deleteError) {
    throw new Error("Não foi possível salvar as alternativas — confere se a migração já rodou.");
  }

  const ids = alternativeIds.filter((id) => id !== exerciseId);
  if (ids.length > 0) {
    const { error: insertError } = await supabase
      .from("exercise_alternatives")
      .insert(ids.map((alternative_exercise_id) => ({ exercise_id: exerciseId, alternative_exercise_id })));

    if (insertError) {
      throw new Error("Não foi possível salvar as alternativas.");
    }
  }

  revalidatePath("/exercicios");
}

// Desativa/reativa um exercício — some do seletor ao montar treino novo
// (ver treinos/novo e treinos/[id]/editar), mas continua existindo pra
// quem já tem ele prescrito e no histórico. Alternativa ao apagar, que
// falha se o exercício já estiver em alguma ficha.
export async function toggleExerciseActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await saveWithSchemaCacheRetry(
    (payload) => supabase.from("exercises").update(payload).eq("id", id),
    { active }
  );

  if (error) {
    throw new Error("Não foi possível salvar — confere se a migração já rodou.");
  }

  revalidatePath("/exercicios");
  revalidatePath("/treinos/novo");
}

export async function deleteExercise(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("exercises").delete().eq("id", id);

  if (error) {
    throw new Error("Não foi possível remover: esse exercício já está sendo usado em algum treino.");
  }

  revalidatePath("/exercicios");
}
