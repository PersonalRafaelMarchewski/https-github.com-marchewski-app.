"use server";

import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateStudentState = {
  error: string | null;
  success: { studentId: string; email: string; password: string } | null;
};

function generateTempPassword() {
  return randomBytes(6).toString("base64url"); // 8 chars, url-safe
}

export async function createStudent(
  _prevState: CreateStudentState,
  formData: FormData
): Promise<CreateStudentState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();

  if (!name || !email) {
    return { error: "Nome e e-mail são obrigatórios.", success: null };
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

  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({
      trainer_id: trainer.id,
      profile_id: studentUserId,
      phone: phone || null,
      goal: goal || null,
      status: "active",
    })
    .select()
    .single();

  if (studentError || !student) {
    return { error: `Perfil criado, mas houve erro ao vincular o aluno: ${studentError?.message}`, success: null };
  }

  return { error: null, success: { studentId: student.id, email, password } };
}
