"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LabelFormState = { error: string | null };

// Nome e dia da semana fixo de uma ficha (Treino A/B/C...) dentro do
// programa. Guardado à parte de workout_exercises porque uma ficha pode
// não ter nenhum exercício ainda quando o personal já quer nomear/marcar o
// dia dela.
export async function setWorkoutLabelMeta(
  workoutId: string,
  label: string,
  _prevState: LabelFormState,
  formData: FormData
): Promise<LabelFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const weekdayRaw = String(formData.get("weekday") ?? "");
  const weekday = weekdayRaw === "" ? null : Number(weekdayRaw);

  const supabase = await createClient();
  const { error } = await supabase.from("workout_labels").upsert(
    {
      workout_id: workoutId,
      label,
      name: name || null,
      weekday,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workout_id,label" }
  );

  if (error) {
    return { error: "Não foi possível salvar — confere se a migração já rodou." };
  }

  revalidatePath(`/treinos/${workoutId}/editar`);
  revalidatePath(`/treinos/${workoutId}/visualizar`);
  return { error: null };
}
