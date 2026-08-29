"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/supabase/server";
import { sendPushToProfile } from "@/lib/sendPush";

// Página pública /depoimentos: além de abrir o WhatsApp com a mensagem
// pronta, o depoimento fica gravado (aba "Depoimentos" do personal) e o
// personal recebe push. Sem login obrigatório, então grava com a chave de
// serviço; se a pessoa abriu logada no app, o aluno fica identificado.
// Best-effort: qualquer falha aqui não impede o WhatsApp de abrir.
export async function saveTestimonial(input: {
  displayName: string;
  trainingTime: string;
  rating: number;
  body: string;
  authorized: boolean;
}): Promise<{ saved: boolean }> {
  const displayName = input.displayName.trim().slice(0, 120);
  const body = input.body.trim().slice(0, 600);
  const rating = Math.round(Number(input.rating));
  if (!displayName || body.length < 20 || !(rating >= 1 && rating <= 5)) {
    return { saved: false };
  }

  const admin = createAdminClient();

  // único personal do sistema (mesma premissa do cadastro público)
  const { data: trainer } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "trainer")
    .limit(1)
    .single();
  if (!trainer) return { saved: false };

  // identifica o aluno quando a página foi aberta logada no app
  let studentId: string | null = null;
  try {
    const user = await getAuthUser();
    if (user) {
      const { data: student } = await admin
        .from("students")
        .select("id")
        .eq("profile_id", user.id)
        .eq("trainer_id", trainer.id)
        .maybeSingle();
      studentId = student?.id ?? null;
    }
  } catch {
    // sem sessão: segue sem identificar
  }

  const { error } = await admin.from("testimonials").insert({
    trainer_id: trainer.id,
    student_id: studentId,
    display_name: displayName,
    training_time: input.trainingTime.trim().slice(0, 60) || null,
    rating,
    body,
    authorized: Boolean(input.authorized),
  });
  if (error) {
    console.error("Depoimento não gravado:", error.message);
    return { saved: false };
  }

  try {
    await sendPushToProfile(trainer.id, {
      title: "Novo depoimento ⭐",
      body: `${displayName} deixou um depoimento (${rating}/5).`,
      url: "/depoimentos-recebidos",
    });
  } catch {
    // push é bônus
  }

  revalidatePath("/depoimentos-recebidos");
  return { saved: true };
}
