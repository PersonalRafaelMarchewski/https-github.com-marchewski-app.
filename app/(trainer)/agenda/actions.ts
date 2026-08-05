"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";

const MAX_OCCURRENCES = 52; // trava de segurança pra repetição semanal (~1 ano)

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

type SessionInput = {
  studentId: string;
  title: string;
  startAt: string; // ISO, já combinando data + hora escolhida pelo treinador
  durationMinutes: number;
  reminderMinutesBefore: number;
  notes: string;
  weekdays: number[]; // 0-6, vazio = não repete
  repeatUntil: string | null; // yyyy-mm-dd
};

function parseSessionForm(formData: FormData): SessionInput {
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const durationMinutes = Number(formData.get("duration_minutes")) || 60;
  const reminderValue = Number(formData.get("reminder_value")) || 60;
  const reminderUnit = String(formData.get("reminder_unit") ?? "minutos");
  const reminderMinutesBefore = reminderUnit === "horas" ? reminderValue * 60 : reminderValue;
  const weekdays = formData.getAll("weekdays").map((w) => Number(w));
  const repeatUntil = String(formData.get("repeat_until") ?? "") || null;

  return {
    studentId: String(formData.get("student_id") ?? ""),
    title: String(formData.get("title") ?? "").trim(),
    // Offset fixo -03:00: o Brasil não tem mais horário de verão desde 2019,
    // então America/Sao_Paulo é sempre UTC-3. Sem isso, o servidor (que roda
    // em UTC na Vercel) interpretava "08:00" como 08:00 UTC = 05:00 no
    // horário do Brasil — 3 horas adiantado do que o treinador escolheu.
    startAt: `${date}T${time}:00-03:00`,
    durationMinutes,
    reminderMinutesBefore,
    notes: String(formData.get("notes") ?? "").trim(),
    weekdays,
    repeatUntil,
  };
}

export type SessionFormState = { error: string | null };

export async function createSession(
  _prevState: SessionFormState,
  formData: FormData
): Promise<SessionFormState> {
  const input = parseSessionForm(formData);

  if (!input.studentId) return { error: "Selecione um aluno." };
  if (!formData.get("date") || !formData.get("time")) {
    return { error: "Informe a data e o horário da aula." };
  }
  if (input.weekdays.length > 0 && !input.repeatUntil) {
    return { error: "Escolheu os dias da semana — falta informar até quando repetir." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sessão expirada, faça login de novo." };

  const firstStart = new Date(input.startAt);
  if (Number.isNaN(firstStart.getTime())) {
    return { error: "Data ou horário inválido." };
  }

  const occurrenceDates: Date[] = [];

  if (input.weekdays.length > 0 && input.repeatUntil) {
    const until = new Date(`${input.repeatUntil}T23:59:59-03:00`);
    let cursor = new Date(firstStart);
    let guard = 0;
    while (cursor <= until && guard < MAX_OCCURRENCES) {
      if (input.weekdays.includes(cursor.getDay())) {
        occurrenceDates.push(new Date(cursor));
        guard++;
      }
      cursor = addDays(cursor, 1);
    }
    if (occurrenceDates.length === 0) occurrenceDates.push(firstStart);
  } else {
    occurrenceDates.push(firstStart);
  }

  const recurrenceGroupId = occurrenceDates.length > 1 ? randomUUID() : null;

  const rows = occurrenceDates.map((start) => {
    const end = new Date(start.getTime() + input.durationMinutes * 60_000);
    return {
      trainer_id: user.id,
      student_id: input.studentId,
      title: input.title || null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      reminder_minutes_before: input.reminderMinutesBefore,
      recurrence_group_id: recurrenceGroupId,
      notes: input.notes || null,
    };
  });

  const { error } = await supabase.from("training_sessions").insert(rows);

  if (error) {
    return { error: "Não foi possível criar a aula." };
  }

  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function updateSession(
  sessionId: string,
  _prevState: SessionFormState,
  formData: FormData
): Promise<SessionFormState> {
  const input = parseSessionForm(formData);

  if (!input.studentId) return { error: "Selecione um aluno." };
  if (!formData.get("date") || !formData.get("time")) {
    return { error: "Informe a data e o horário da aula." };
  }

  const start = new Date(input.startAt);
  if (Number.isNaN(start.getTime())) {
    return { error: "Data ou horário inválido." };
  }
  const end = new Date(start.getTime() + input.durationMinutes * 60_000);

  const supabase = await createClient();
  const { error } = await supabase
    .from("training_sessions")
    .update({
      student_id: input.studentId,
      title: input.title || null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      reminder_minutes_before: input.reminderMinutesBefore,
      reminder_sent: false,
      notes: input.notes || null,
    })
    .eq("id", sessionId);

  if (error) {
    return { error: "Não foi possível salvar a aula." };
  }

  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function deleteSession(sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("training_sessions").delete().eq("id", sessionId);

  if (error) {
    throw new Error("Não foi possível excluir a aula.");
  }

  revalidatePath("/agenda");
}

// Exclui esta aula e todas as futuras da mesma série recorrente (mesmo
// recurrence_group_id, a partir da data/hora desta aula).
export async function deleteFutureSessions(sessionId: string) {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("training_sessions")
    .select("recurrence_group_id, start_at")
    .eq("id", sessionId)
    .single();

  if (!session?.recurrence_group_id) {
    throw new Error("Essa aula não faz parte de uma série recorrente.");
  }

  const { error } = await supabase
    .from("training_sessions")
    .delete()
    .eq("recurrence_group_id", session.recurrence_group_id)
    .gte("start_at", session.start_at);

  if (error) {
    throw new Error("Não foi possível excluir as aulas futuras.");
  }

  revalidatePath("/agenda");
}

export async function markSessionDone(sessionId: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("training_sessions")
    .update({ status: done ? "done" : "scheduled" })
    .eq("id", sessionId);

  if (error) {
    throw new Error("Não foi possível atualizar a aula.");
  }

  revalidatePath("/agenda");
}
