"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayInBrazil } from "@/lib/date";

async function getOwnStudentId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  return student?.id ?? null;
}

// Registra uma entrada livre no diário (alimento(s) + quantidade,
// independente das refeições prescritas) — o aluno pode preencher tudo
// que comeu no dia, não só o que o personal montou no plano.
export async function addDiaryEntry({
  studentId,
  label,
  items,
}: {
  studentId: string;
  label: string | null;
  items: { food_id: string; quantity_g: number }[];
}): Promise<{ data: { id: string } | null; error: string | null }> {
  const supabase = await createClient();
  const ownStudentId = await getOwnStudentId(supabase);

  if (!ownStudentId || ownStudentId !== studentId) {
    return { data: null, error: "Não autorizado." };
  }
  if (items.length === 0) {
    return { data: null, error: "Adiciona pelo menos um alimento." };
  }

  const { data: entry, error: entryError } = await supabase
    .from("diet_diary_entries")
    .insert({ student_id: studentId, date: todayInBrazil(), label })
    .select("id")
    .single();

  if (entryError || !entry) {
    return { data: null, error: entryError?.message ?? "Não foi possível salvar." };
  }

  const foodRows = items.map((item, i) => ({
    entry_id: entry.id,
    food_id: item.food_id,
    quantity_g: item.quantity_g,
    order_index: i,
  }));

  const { error: foodsError } = await supabase.from("diet_diary_entry_foods").insert(foodRows);
  if (foodsError) {
    // desfaz a entrada — melhor não deixar um registro "vazio" (sem
    // alimento nenhum) do que um erro parcial confuso pro aluno
    await supabase.from("diet_diary_entries").delete().eq("id", entry.id);
    return { data: null, error: foodsError.message };
  }

  revalidatePath("/nutricao");
  return { data: { id: entry.id }, error: null };
}

export async function deleteDiaryEntry(entryId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const ownStudentId = await getOwnStudentId(supabase);
  if (!ownStudentId) return { error: "Não autorizado." };

  const { error } = await supabase
    .from("diet_diary_entries")
    .delete()
    .eq("id", entryId)
    .eq("student_id", ownStudentId);

  if (error) return { error: error.message };
  revalidatePath("/nutricao");
  return { error: null };
}

export async function addWaterLog({
  studentId,
  amountMl,
}: {
  studentId: string;
  amountMl: number;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  const supabase = await createClient();
  const ownStudentId = await getOwnStudentId(supabase);
  if (!ownStudentId || ownStudentId !== studentId) {
    return { data: null, error: "Não autorizado." };
  }

  const { data, error } = await supabase
    .from("water_logs")
    .insert({ student_id: studentId, date: todayInBrazil(), amount_ml: amountMl })
    .select("id")
    .single();

  if (error || !data) return { data: null, error: error?.message ?? "Não foi possível salvar." };
  revalidatePath("/nutricao");
  return { data: { id: data.id }, error: null };
}
