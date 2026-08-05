"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/password";

const AVATAR_BUCKET = "avatars";

export async function saveStudentAvatar(studentId: string, formData: FormData) {
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("profile_id")
    .eq("id", studentId)
    .single();

  if (!student?.profile_id) {
    throw new Error("Aluno não encontrado.");
  }

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) {
    throw new Error("Selecione uma foto.");
  }

  const admin = createAdminClient();
  const path = `${studentId}/avatar`;

  const { error: uploadError } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    throw new Error("Não foi possível enviar a foto.");
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", student.profile_id);

  if (profileError) {
    throw new Error("Foto enviada, mas houve erro ao salvar no perfil.");
  }

  revalidatePath(`/alunos/${studentId}`);
  revalidatePath(`/alunos/${studentId}/editar`);
  revalidatePath("/dashboard");
}

export async function removeStudentAvatar(studentId: string) {
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("profile_id")
    .eq("id", studentId)
    .single();

  if (!student?.profile_id) {
    throw new Error("Aluno não encontrado.");
  }

  const admin = createAdminClient();
  await admin.storage.from(AVATAR_BUCKET).remove([`${studentId}/avatar`]);

  const { error } = await admin
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", student.profile_id);

  if (error) {
    throw new Error("Não foi possível remover a foto.");
  }

  revalidatePath(`/alunos/${studentId}`);
  revalidatePath(`/alunos/${studentId}/editar`);
  revalidatePath("/dashboard");
}

export async function getSignedAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage.from(AVATAR_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

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
  const serviceType = String(formData.get("service_type") ?? "assessoria");
  const birthDate = String(formData.get("birth_date") ?? "").trim();

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
    .update({
      phone: phone || null,
      goal: goal || null,
      status,
      service_type: serviceType,
      birth_date: birthDate || null,
    })
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

// Apaga o aluno e tudo que pertence só a ele: treinos, avaliações (+ fotos),
// aulas da agenda, pagamentos, vídeos de exercício e o próprio acesso de
// login. Ação irreversível — a UI já exige confirmação explícita.
export async function deleteStudent(studentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("profile_id, trainer_id")
    .eq("id", studentId)
    .single();

  if (!student || student.trainer_id !== user?.id) {
    throw new Error("Aluno não encontrado.");
  }

  const admin = createAdminClient();

  const { data: workouts } = await admin
    .from("workouts")
    .select("id")
    .eq("student_id", studentId);
  const workoutIds = (workouts ?? []).map((w) => w.id);

  if (workoutIds.length > 0) {
    const { data: workoutExercises } = await admin
      .from("workout_exercises")
      .select("id")
      .in("workout_id", workoutIds);
    const workoutExerciseIds = (workoutExercises ?? []).map((we) => we.id);

    if (workoutExerciseIds.length > 0) {
      await admin.from("workout_logs").delete().in("workout_exercise_id", workoutExerciseIds);
    }
    await admin.from("workout_exercises").delete().in("workout_id", workoutIds);
    await admin.from("workouts").delete().in("id", workoutIds);
  }
  // rede de segurança: logs que não tenham sido pegos acima (ex: exercício já removido)
  await admin.from("workout_logs").delete().eq("student_id", studentId);

  const { data: evaluations } = await admin
    .from("evaluations")
    .select("id, photos")
    .eq("student_id", studentId);
  const photoPaths = (evaluations ?? []).flatMap((ev) => (ev.photos ?? []).filter(Boolean));
  if (photoPaths.length > 0) {
    await admin.storage.from("evaluation-photos").remove(photoPaths);
  }
  await admin.from("evaluations").delete().eq("student_id", studentId);

  const { data: videoFiles } = await admin.storage.from("exercise-videos").list(studentId);
  if (videoFiles && videoFiles.length > 0) {
    await admin.storage
      .from("exercise-videos")
      .remove(videoFiles.map((f) => `${studentId}/${f.name}`));
  }

  await admin.from("training_sessions").delete().eq("student_id", studentId);
  await admin.from("payments").delete().eq("student_id", studentId);

  if (student.profile_id) {
    await admin.from("push_subscriptions").delete().eq("profile_id", student.profile_id);
  }

  await admin.from("students").delete().eq("id", studentId);

  if (student.profile_id) {
    await admin.from("profiles").delete().eq("id", student.profile_id);
    await admin.auth.admin.deleteUser(student.profile_id);
  }

  revalidatePath("/dashboard");
  // Sem redirect() aqui de propósito: quem chama essa action (client) já
  // está dentro de um try/catch e faz a navegação depois que a promise
  // resolve — um redirect() no servidor seria capturado como erro ali.
}

export async function saveTrainerFeedback(
  logId: string,
  studentId: string,
  rating: number | null,
  text: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workout_logs")
    .update({ trainer_rating: rating, trainer_feedback_text: text || null })
    .eq("id", logId);

  if (error) {
    throw new Error("Não foi possível salvar o feedback.");
  }

  revalidatePath(`/alunos/${studentId}`);
}
