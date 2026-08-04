"use server";

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
