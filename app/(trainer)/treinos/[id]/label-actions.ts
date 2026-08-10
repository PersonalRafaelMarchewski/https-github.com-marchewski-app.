"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LabelFormState = { error: string | null };

const LABEL_LETTERS = ["A", "B", "C", "D", "E", "F"];

// Letra interna (A-F) só pra ter uma chave técnica única por bloco — o
// personal não vê mais isso em lugar nenhum, só o nome que ele escolhe.
async function nextFreeLabelLetter(workoutId: string): Promise<string> {
  const supabase = await createClient();
  const [{ data: fromExercises }, { data: fromLabels }] = await Promise.all([
    supabase.from("workout_exercises").select("label").eq("workout_id", workoutId),
    supabase.from("workout_labels").select("label").eq("workout_id", workoutId),
  ]);
  const used = new Set([
    ...(fromExercises ?? []).map((r) => r.label),
    ...(fromLabels ?? []).map((r) => r.label),
  ]);
  return LABEL_LETTERS.find((l) => !used.has(l)) ?? `B${Date.now()}`;
}

// Cria um bloco novo (vazio) já nomeado — aparece na lista de "Treino" do
// seletor de exercício assim que criado, pra já dar pra usar.
export async function createWorkoutLabel(workoutId: string, name: string) {
  const supabase = await createClient();
  const label = await nextFreeLabelLetter(workoutId);

  const { count } = await supabase
    .from("workout_labels")
    .select("label", { count: "exact", head: true })
    .eq("workout_id", workoutId);

  const { error } = await supabase.from("workout_labels").insert({
    workout_id: workoutId,
    label,
    name: name.trim() || null,
    order_index: count ?? 0,
  });

  if (error) {
    throw new Error("Não foi possível criar o bloco.");
  }

  revalidatePath(`/treinos/${workoutId}/editar`);
  revalidatePath(`/treinos/${workoutId}/visualizar`);
  return label;
}

// Nova ordem de exibição dos blocos (arrastar) — cria a linha em
// workout_labels pra quem ainda não tinha (ex: bloco que só existia
// implicitamente por ter exercício com aquela label, nunca nomeado).
export async function reorderWorkoutLabels(workoutId: string, orderedLabels: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedLabels.map((label, index) =>
      supabase
        .from("workout_labels")
        .upsert(
          { workout_id: workoutId, label, order_index: index, updated_at: new Date().toISOString() },
          { onConflict: "workout_id,label", ignoreDuplicates: false }
        )
    )
  );
  revalidatePath(`/treinos/${workoutId}/editar`);
  revalidatePath(`/treinos/${workoutId}/visualizar`);
}

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
