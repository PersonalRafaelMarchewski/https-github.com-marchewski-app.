"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/password";

export type ResetPasswordResult = { error: string | null; password: string | null };

export async function resetStudentPassword(studentId: string): Promise<ResetPasswordResult> {
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("profile_id")
    .eq("id", studentId)
    .single();

  if (!student?.profile_id) {
    return { error: "Aluno não encontrado.", password: null };
  }

  const password = generateTempPassword();
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.updateUserById(student.profile_id, { password });

  if (error) {
    return { error: error.message, password: null };
  }

  return { error: null, password };
}

export type UpdateStudentState = { error: string | null };

export async function updateStudent(
  studentId: string,
  _prevState: UpdateStudentState,
  formData: FormData
): Promise<UpdateStudentState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const status = String(formData.get("status") ?? "active");

  if (!name) {
    return { error: "Nome é obrigatório." };
  }

  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("profile_id")
    .eq("id", studentId)
    .single();

  if (!student?.profile_id) {
    return { error: "Aluno não encontrado." };
  }

  const { error: studentError } = await supabase
    .from("students")
    .update({ phone: phone || null, goal: goal || null, status })
    .eq("id", studentId);

  if (studentError) {
    return { error: "Não foi possível salvar os dados do aluno." };
  }

  const admin = createAdminClient();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ name })
    .eq("id", student.profile_id);

  if (profileError) {
    return { error: "Dados salvos, mas houve erro ao atualizar o nome." };
  }

  redirect(`/alunos/${studentId}`);
}

export async function deleteWorkout(workoutId: string, studentId: string) {
  const supabase = await createClient();
  await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
  await supabase.from("workouts").delete().eq("id", workoutId);
  revalidatePath(`/alunos/${studentId}`);
}

export async function deleteEvaluation(evaluationId: string, studentId: string) {
  const supabase = await createClient();
  await supabase.from("evaluations").delete().eq("id", evaluationId);
  revalidatePath(`/alunos/${studentId}`);
}
