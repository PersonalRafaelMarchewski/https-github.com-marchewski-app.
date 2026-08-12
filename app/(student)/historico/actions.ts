"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Apaga um registro de treino executado (workout_logs) do próprio aluno.
// Não existe policy de DELETE pra workout_logs (só insert/update), então
// usa o client admin depois de confirmar que o registro é mesmo do aluno
// logado.
export async function deleteOwnWorkoutLog(logId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user?.id ?? "")
    .single();

  if (!student) {
    throw new Error("Aluno não encontrado.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("workout_logs")
    .delete()
    .eq("id", logId)
    .eq("student_id", student.id);

  if (error) {
    throw new Error("Não foi possível apagar o registro.");
  }

  revalidatePath("/historico");
  revalidatePath("/treino-do-dia");
  revalidatePath("/progresso");
}

// Apaga um treino concluído (workout_sessions) do próprio aluno — usado no
// histórico, que agora mostra o treino finalizado em vez de exercício por
// exercício. Sem policy de DELETE (só select/insert/update), mesmo padrão
// acima: client admin depois de confirmar que a sessão é do aluno logado.
export async function deleteOwnWorkoutSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user?.id ?? "")
    .single();

  if (!student) {
    throw new Error("Aluno não encontrado.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("student_id", student.id);

  if (error) {
    throw new Error("Não foi possível apagar o treino.");
  }

  revalidatePath("/historico");
  revalidatePath("/treino-do-dia");
  revalidatePath("/progresso");
}
