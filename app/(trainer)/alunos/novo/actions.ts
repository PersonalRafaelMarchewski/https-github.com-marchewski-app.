"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/password";
import { saveWithSchemaCacheRetry } from "@/lib/supabaseRetry";

export type CreateStudentState = {
  error: string | null;
  success: { studentId: string; email: string; password: string } | null;
};

export async function createStudent(
  _prevState: CreateStudentState,
  formData: FormData
): Promise<CreateStudentState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const serviceType = String(formData.get("service_type") ?? "assessoria");
  const birthDate = String(formData.get("birth_date") ?? "").trim();
  const level = String(formData.get("level") ?? "intermediario");
  const sex = String(formData.get("sex") ?? "").trim();
  const activityLevel = String(formData.get("activity_level") ?? "").trim();

  if (!name || !email) {
    return { error: "Nome e e-mail são obrigatórios.", success: null };
  }

  if (!birthDate) {
    return { error: "Data de nascimento é obrigatória.", success: null };
  }

  const supabase = await createClient();
  const {
    data: { user: trainer },
  } = await supabase.auth.getUser();

  if (!trainer) {
    return { error: "Não autenticado.", success: null };
  }

  const admin = createAdminClient();
  const password = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? "Não foi possível criar o acesso do aluno.", success: null };
  }

  const studentUserId = created.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: studentUserId,
    role: "student",
    name,
    email,
  });

  if (profileError) {
    return { error: "Acesso criado, mas houve erro ao criar o perfil.", success: null };
  }

  // usa o retry de schema cache: se "sex"/"activity_level" ainda não
  // existirem (migração pendente), tenta de novo sem esses campos em vez
  // de falhar — o resto do cadastro (que já criou o login do aluno) não
  // pode travar por causa de um campo novo e opcional
  const { data: student, error: studentError } = await saveWithSchemaCacheRetry(
    (payload) => supabase.from("students").insert(payload).select("id").single(),
    {
      trainer_id: trainer.id,
      profile_id: studentUserId,
      phone: phone || null,
      goal: goal || null,
      status: "active",
      service_type: serviceType,
      birth_date: birthDate,
      level,
      sex: sex || null,
      activity_level: activityLevel || null,
    }
  );

  if (studentError || !student) {
    return { error: `Perfil criado, mas houve erro ao vincular o aluno: ${studentError?.message}`, success: null };
  }

  return {
    error: null,
    success: { studentId: (student as { id: string }).id, email, password },
  };
}
