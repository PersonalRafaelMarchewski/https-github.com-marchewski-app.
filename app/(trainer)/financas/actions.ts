"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, BUSINESS_OPTIONS } from "@/lib/financeCategories";

export type FinanceFormState = { error: string | null };

const BUSINESS_VALUES = BUSINESS_OPTIONS.map((b) => b.value);

type ParsedEntry = {
  type: "income" | "expense";
  category: string;
  description: string | null;
  amountCents: number;
  entryDate: string;
  studentId: string | null;
  business: string;
};

function parseFinanceForm(formData: FormData): ParsedEntry | { error: string } {
  const type = String(formData.get("type") ?? "") as "income" | "expense";
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amountReais = Number(formData.get("amount"));
  const entryDate = String(formData.get("entry_date") ?? "");
  const studentId = String(formData.get("student_id") ?? "") || null;
  const business = String(formData.get("business") ?? "");

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

  return {
    type,
    category,
    description: description || null,
    amountCents: Math.round(amountReais * 100),
    entryDate,
    studentId: type === "income" ? studentId : null,
    business,
  };
}

export async function createFinanceEntry(
  _prevState: FinanceFormState,
  formData: FormData
): Promise<FinanceFormState> {
  const parsed = parseFinanceForm(formData);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login de novo." };

  const business = await resolveBusiness(supabase, parsed);

  const { error } = await supabase.from("finance_entries").insert({
    trainer_id: user.id,
    type: parsed.type,
    category: parsed.category,
    description: parsed.description,
    amount_cents: parsed.amountCents,
    entry_date: parsed.entryDate,
    student_id: parsed.studentId,
    business,
  });

  if (error) {
    return { error: "Não foi possível salvar o lançamento." };
  }

  revalidatePath("/financas");
  return { error: null };
}

export async function updateFinanceEntry(
  id: string,
  _prevState: FinanceFormState,
  formData: FormData
): Promise<FinanceFormState> {
  const parsed = parseFinanceForm(formData);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();
  const business = await resolveBusiness(supabase, parsed);

  const { error } = await supabase
    .from("finance_entries")
    .update({
      type: parsed.type,
      category: parsed.category,
      description: parsed.description,
      amount_cents: parsed.amountCents,
      entry_date: parsed.entryDate,
      student_id: parsed.studentId,
      business,
    })
    .eq("id", id);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath("/financas");
  return { error: null };
}

// Se a receita está ligada a um aluno, o negócio é sempre o mesmo do
// cadastro do aluno (evita cair em assessoria/personal errado por engano
// no formulário).
async function resolveBusiness(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parsed: ParsedEntry
): Promise<string> {
  if (parsed.type !== "income" || !parsed.studentId) return parsed.business;

  const { data: student } = await supabase
    .from("students")
    .select("service_type")
    .eq("id", parsed.studentId)
    .single();

  if (student?.service_type === "personal" || student?.service_type === "assessoria") {
    return student.service_type;
  }
  return parsed.business;
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
