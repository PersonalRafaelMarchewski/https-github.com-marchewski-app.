"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/password";
import { sendWelcomeEmail } from "@/lib/email";

export type PublicSignupState = {
  error: string | null;
  success: { email: string; password: string; emailSent: boolean } | null;
};

export async function submitStudentSignup(
  _prevState: PublicSignupState,
  formData: FormData
): Promise<PublicSignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "").trim();
  const level = String(formData.get("level") ?? "intermediario");
  const goal = String(formData.get("goal") ?? "").trim();
  const anamnesisRaw = String(formData.get("anamnesis") ?? "{}");

  if (!name || !email) {
    return { error: "Nome e e-mail são obrigatórios.", success: null };
  }

  if (!birthDate) {
    return { error: "Data de nascimento é obrigatória.", success: null };
  }

  let anamnesis: Record<string, unknown> = {};
  try {
    anamnesis = JSON.parse(anamnesisRaw);
  } catch {
    // se vier corrompido, segue sem anamnese em vez de travar o cadastro
  }

  const admin = createAdminClient();

  // formulário público (link fixo) — assume o único personal cadastrado
  // no sistema como dono do novo aluno
  const { data: trainerProfile, error: trainerError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "trainer")
    .limit(1)
    .single();

  if (trainerError || !trainerProfile) {
    return { error: "Não foi possível identificar o personal. Fale direto com ele.", success: null };
  }

  const password = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return {
      error:
        createError?.message.includes("already been registered")
          ? "Esse e-mail já está cadastrado. Fale com o seu personal."
          : "Não foi possível criar seu acesso. Confere se o e-mail está certo.",
      success: null,
    };
  }

  const studentUserId = created.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: studentUserId,
    role: "student",
    name,
    email,
  });

  if (profileError) {
    return { error: "Acesso criado, mas houve erro ao salvar o perfil. Fale com o seu personal.", success: null };
  }

  const { error: studentError } = await admin.from("students").insert({
    trainer_id: trainerProfile.id,
    profile_id: studentUserId,
    phone: phone || null,
    goal: goal || null,
    status: "active",
    service_type: "assessoria",
    birth_date: birthDate,
    level,
    anamnesis,
  });

  if (studentError) {
    return {
      error: "Acesso criado, mas houve erro ao salvar seus dados. Fale com o seu personal.",
      success: null,
    };
  }

  const { sent } = await sendWelcomeEmail({ to: email, name, password });

  return { error: null, success: { email, password, emailSent: sent } };
}
