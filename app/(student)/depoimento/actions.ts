"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendPushToProfile } from "@/lib/sendPush";

export type TestimonialState = {
  error: string | null;
  success: {
    displayName: string;
    trainingTime: string;
    rating: number;
    body: string;
    authorized: boolean;
  } | null;
};

// O aluno logado envia o depoimento; a RLS garante que só entra com o
// student_id dele e o trainer_id do personal dele. O personal recebe push
// e vê tudo na aba "Depoimentos".
export async function submitTestimonial(
  _prev: TestimonialState,
  formData: FormData
): Promise<TestimonialState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const trainingTime = String(formData.get("training_time") ?? "").trim();
  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();
  const authorized = formData.get("authorized") === "on";

  const faltam: string[] = [];
  if (!displayName) faltam.push("seu nome");
  if (!trainingTime) faltam.push("há quanto tempo treina");
  if (!(rating >= 1 && rating <= 5)) faltam.push("a nota");
  if (body.length < 20) faltam.push("um depoimento com pelo menos 20 caracteres");
  if (faltam.length) return { error: `Falta preencher: ${faltam.join(", ")}.`, success: null };
  if (body.length > 600) return { error: "O depoimento pode ter no máximo 600 caracteres.", success: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login de novo.", success: null };

  const { data: student } = await supabase
    .from("students")
    .select("id, trainer_id")
    .eq("profile_id", user.id)
    .single();
  if (!student) return { error: "Não encontramos seu cadastro de aluno.", success: null };

  const { error } = await supabase.from("testimonials").insert({
    trainer_id: student.trainer_id,
    student_id: student.id,
    display_name: displayName,
    training_time: trainingTime,
    rating,
    body,
    authorized,
  });

  if (error) {
    const semTabela = error.code === "42P01" || error.message.includes("testimonials");
    return {
      error: semTabela
        ? "O envio de depoimentos ainda não foi ativado. Avisa o Rafael!"
        : "Não foi possível enviar agora. Tenta de novo em instantes.",
      success: null,
    };
  }

  // avisa o personal na hora — best-effort, não trava o envio
  try {
    await sendPushToProfile(student.trainer_id, {
      title: "Novo depoimento ⭐",
      body: `${displayName} deixou um depoimento (${rating}/5).`,
      url: "/depoimentos",
    });
  } catch {
    // segue sem travar
  }

  revalidatePath("/depoimentos");
  return {
    error: null,
    success: { displayName, trainingTime, rating, body, authorized },
  };
}
