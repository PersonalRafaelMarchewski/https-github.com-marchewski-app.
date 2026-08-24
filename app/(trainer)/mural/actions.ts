"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendPushToProfile } from "@/lib/sendPush";

type Audience = "all" | "personal" | "assessoria" | "student";

// Resolve quem recebe o push de um post: os alunos ATIVOS do personal que
// batem com o público escolhido. Devolve os profile_ids.
async function resolveRecipients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trainerId: string,
  audience: Audience,
  studentId: string | null
): Promise<string[]> {
  let query = supabase
    .from("students")
    .select("id, profile_id, service_type")
    .eq("trainer_id", trainerId)
    .eq("status", "active");
  if (audience === "student" && studentId) query = query.eq("id", studentId);
  else if (audience === "personal" || audience === "assessoria")
    query = query.eq("service_type", audience);

  const { data } = await query;
  return (data ?? []).map((s: any) => s.profile_id).filter(Boolean);
}

export async function createMuralPost(input: {
  audience: Audience;
  studentId: string | null;
  title: string;
  body: string;
  linkUrl: string;
  notify: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada, faça login de novo.");

  const body = input.body.trim();
  if (!body) throw new Error("Escreva a mensagem antes de publicar.");
  if (input.audience === "student" && !input.studentId) {
    throw new Error("Escolha o aluno que vai receber.");
  }

  const { error } = await supabase.from("mural_posts").insert({
    trainer_id: user.id,
    audience: input.audience,
    student_id: input.audience === "student" ? input.studentId : null,
    kind: "geral",
    title: input.title.trim() || null,
    body,
    link_url: input.linkUrl.trim() || null,
  });
  if (error) throw new Error("Não foi possível publicar — confere se a migração do mural já rodou.");

  if (input.notify) {
    const recipients = await resolveRecipients(
      supabase,
      user.id,
      input.audience,
      input.studentId
    );
    // best-effort: falha de push não desfaz o post (ele já está no mural)
    await Promise.all(
      recipients.map((profileId) =>
        sendPushToProfile(profileId, {
          title: input.title.trim() || "Recado do seu personal 📣",
          body: body.length > 140 ? body.slice(0, 137) + "..." : body,
          url: "/recados",
        }).catch(() => {})
      )
    );
  }

  revalidatePath("/mural");
}

export async function deleteMuralPost(postId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("mural_posts").delete().eq("id", postId);
  if (error) throw new Error("Não foi possível apagar o recado.");
  revalidatePath("/mural");
}

// "Avisar aluno das mudanças" na edição de treino: um push limpo depois
// que o personal terminou de mexer + registro no mural do aluno (a
// notificação some, o post fica).
export async function notifyWorkoutChanged(workoutId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada, faça login de novo.");

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, trainer_id, students:student_id (id, profile_id)")
    .eq("id", workoutId)
    .single();
  if (!workout || workout.trainer_id !== user.id) throw new Error("Treino não encontrado.");

  const student = (workout as any).students;
  const body = `Seu treino "${workout.name}" foi atualizado — abre as fichas pra ver as novidades.`;

  await supabase.from("mural_posts").insert({
    trainer_id: user.id,
    audience: "student",
    student_id: student?.id ?? null,
    kind: "treino",
    title: "Treino atualizado",
    body,
  });

  if (student?.profile_id) {
    await sendPushToProfile(student.profile_id, {
      title: "Seu treino foi atualizado 💪",
      body: `${workout.name} — dá uma olhada nas novidades.`,
      url: "/treino-do-dia",
    }).catch(() => {});
  }
}

// Idem pra dieta (edição do plano alimentar).
export async function notifyDietChanged(planId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada, faça login de novo.");

  const { data: plan } = await supabase
    .from("diet_plans")
    .select("id, name, trainer_id, students:student_id (id, profile_id)")
    .eq("id", planId)
    .single();
  if (!plan || plan.trainer_id !== user.id) throw new Error("Plano não encontrado.");

  const student = (plan as any).students;
  const body = `Sua dieta "${plan.name}" foi atualizada — confere as refeições novas em Nutrição.`;

  await supabase.from("mural_posts").insert({
    trainer_id: user.id,
    audience: "student",
    student_id: student?.id ?? null,
    kind: "dieta",
    title: "Dieta atualizada",
    body,
  });

  if (student?.profile_id) {
    await sendPushToProfile(student.profile_id, {
      title: "Sua dieta foi atualizada 🥗",
      body: `${plan.name} — confere as refeições em Nutrição.`,
      url: "/nutricao",
    }).catch(() => {});
  }
}
