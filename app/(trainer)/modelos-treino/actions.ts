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
