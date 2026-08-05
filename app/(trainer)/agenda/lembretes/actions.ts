"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReminderFormState = { error: string | null };

function parseReminderForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDateRaw = String(formData.get("end_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  return {
    title,
    startDate,
    endDate: endDateRaw || startDate,
    notes,
  };
}

export async function createReminder(
  _prevState: ReminderFormState,
  formData: FormData
): Promise<ReminderFormState> {
  const input = parseReminderForm(formData);

  if (!input.title) return { error: "Escreva um título pro lembrete." };
  if (!input.startDate) return { error: "Informe a data." };
  if (input.endDate < input.startDate) {
    return { error: "A data final não pode ser antes da data inicial." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sessão expirada, faça login de novo." };

  const { error } = await supabase.from("agenda_reminders").insert({
    trainer_id: user.id,
    title: input.title,
    start_date: input.startDate,
    end_date: input.endDate,
    notes: input.notes || null,
  });

  if (error) {
    return { error: "Não foi possível criar o lembrete." };
  }

  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function updateReminder(
  reminderId: string,
  _prevState: ReminderFormState,
  formData: FormData
): Promise<ReminderFormState> {
  const input = parseReminderForm(formData);

  if (!input.title) return { error: "Escreva um título pro lembrete." };
  if (!input.startDate) return { error: "Informe a data." };
  if (input.endDate < input.startDate) {
    return { error: "A data final não pode ser antes da data inicial." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("agenda_reminders")
    .update({
      title: input.title,
      start_date: input.startDate,
      end_date: input.endDate,
      notes: input.notes || null,
    })
    .eq("id", reminderId);

  if (error) {
    return { error: "Não foi possível salvar o lembrete." };
  }

  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function deleteReminder(reminderId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("agenda_reminders").delete().eq("id", reminderId);

  if (error) {
    throw new Error("Não foi possível excluir o lembrete.");
  }

  revalidatePath("/agenda");
}
