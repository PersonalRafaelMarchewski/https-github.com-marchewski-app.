"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayInBrazil } from "@/lib/date";

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// "Adiar 7 dias": tira o aluno das colunas urgentes do painel por uma
// semana, sem precisar criar a ficha nova agora — like adiar um cartão no
// Trello. Some sozinho quando o prazo passa (a query filtra por data).
export async function snoozeRenewal(studentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada, faça login de novo.");

  const { error } = await supabase.from("renewal_snoozes").upsert(
    {
      student_id: studentId,
      trainer_id: user.id,
      snoozed_until: addDays(todayInBrazil(), 7),
    },
    { onConflict: "student_id" }
  );

  if (error) {
    const semTabela = error.code === "42P01" || error.message.includes("renewal_snoozes");
    throw new Error(
      semTabela
        ? "Falta rodar a migração migration-renovacoes.sql no Supabase."
        : "Não foi possível adiar."
    );
  }

  revalidatePath("/renovacoes");
}

// Traz o aluno de volta pras colunas urgentes antes do prazo do adiamento acabar.
export async function unsnoozeRenewal(studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("renewal_snoozes").delete().eq("student_id", studentId);
  if (error) {
    throw new Error("Não foi possível desfazer o adiamento.");
  }
  revalidatePath("/renovacoes");
}
