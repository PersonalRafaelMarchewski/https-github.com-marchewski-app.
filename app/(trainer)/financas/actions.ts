"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/financeCategories";

export type FinanceFormState = { error: string | null };

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login de novo." };

  const { error } = await supabase.from("finance_entries").insert({
    trainer_id: user.id,
    type,
    category,
    description: description || null,
    amount_cents: Math.round(amountReais * 100),
    entry_date: entryDate,
    student_id: type === "income" ? studentId : null,
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

export async function setMonthlyGoal(
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

  const { error } = await supabase
    .from("finance_settings")
    .upsert(
      { trainer_id: user.id, monthly_goal_cents: goalCents, updated_at: new Date().toISOString() },
      { onConflict: "trainer_id" }
    );

  if (error) {
    return { error: "Não foi possível salvar a meta." };
  }

  revalidatePath("/financas");
  return { error: null };
}
