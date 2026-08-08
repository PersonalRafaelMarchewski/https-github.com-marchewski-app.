"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, BUSINESS_OPTIONS } from "@/lib/financeCategories";

export type FinanceFormState = { error: string | null };

const BUSINESS_VALUES = BUSINESS_OPTIONS.map((b) => b.value);

export async function createFinanceEntry(
  _prevState: FinanceFormState,
  formData: FormData
): Promise<FinanceFormState> {
  const type = String(formData.get("type") ?? "") as "income" | "expense";
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amountReais = Number(formData.get("amount"));
  const entryDate = String(formData.get("entry_date") ?? "");
  const studentId = String(formData.get("student_id") ?? "") || null;
  let business = String(formData.get("business") ?? "");

  if (type !== "income" && type !== "expense") {
    return { error: "Tipo de lançamento inválido." };
  }
  const validCategories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (!validCategories.includes(category as any)) {
    return { error: "Categoria inválida." };
  }
  if (!amountReais || amountReais <= 0) {
    return { error: "Informe um valor válido." };
  }
  if (!entryDate) {
    return { error: "Informe a data." };
  }
  if (!BUSINESS_VALUES.includes(business as any)) {
    return { error: "Selecione Assessoria ou Personal." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login de novo." };

  // Se a receita está ligada a um aluno, o negócio é sempre o mesmo do
  // cadastro do aluno (evita cair em assessoria/personal errado por engano
  // no formulário).
  if (type === "income" && studentId) {
    const { data: student } = await supabase
      .from("students")
      .select("service_type")
      .eq("id", studentId)
      .single();
    if (student?.service_type === "personal" || student?.service_type === "assessoria") {
      business = student.service_type;
    }
  }

  const { error } = await supabase.from("finance_entries").insert({
    trainer_id: user.id,
    type,
    category,
    description: description || null,
    amount_cents: Math.round(amountReais * 100),
    entry_date: entryDate,
    student_id: type === "income" ? studentId : null,
    business,
  });

  if (error) {
    return { error: "Não foi possível salvar o lançamento." };
  }

  revalidatePath("/financas");
  return { error: null };
}

export async function deleteFinanceEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("finance_entries").delete().eq("id", id);
  if (error) {
    throw new Error("Não foi possível excluir o lançamento.");
  }
  revalidatePath("/financas");
}

export async function setBusinessGoal(
  business: "assessoria" | "personal",
  _prevState: FinanceFormState,
  formData: FormData
): Promise<FinanceFormState> {
  const amountReais = Number(formData.get("goal"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login de novo." };

  const goalCents = amountReais > 0 ? Math.round(amountReais * 100) : null;
  const column = business === "personal" ? "personal_goal_cents" : "assessoria_goal_cents";

  const { error } = await supabase
    .from("finance_settings")
    .upsert(
      { trainer_id: user.id, [column]: goalCents, updated_at: new Date().toISOString() },
      { onConflict: "trainer_id" }
    );

  if (error) {
    return { error: "Não foi possível salvar a meta." };
  }

  revalidatePath("/financas");
  return { error: null };
}
