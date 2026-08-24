"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/password";
import { AVATAR_BUCKET, getSignedAvatarUrl } from "@/lib/avatar";
import { saveWithSchemaCacheRetry } from "@/lib/supabaseRetry";

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

  // senha temporária de novo — o aluno tem que trocar no próximo login,
  // mesmo motivo do cadastro (ela passa por tela/e-mail/WhatsApp)
  await saveWithSchemaCacheRetry(
    (payload) => admin.from("profiles").update(payload).eq("id", student.profile_id),
    { must_change_password: true }
  );

  return { error: null, password };
}

export type UpdateStudentState = { error: string | null };

export async function updateStudent(
  studentId: string,
  _prevState: UpdateStudentState,
  formData: FormData
): Promise<UpdateStudentState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const status = String(formData.get("status") ?? "active");
  const serviceType = String(formData.get("service_type") ?? "assessoria");
  // pagante sai/entra da lista "Quem pagou no mês" do Financeiro
  const isPayer = formData.get("is_payer") !== "false";
  // mensalidade em reais no form → centavos no banco; vazio = não definida
  const feeRaw = String(formData.get("monthly_fee") ?? "").trim().replace(",", ".");
  const monthlyFeeCents = feeRaw && Number(feeRaw) > 0 ? Math.round(Number(feeRaw) * 100) : null;
  const dueDayRaw = Number(formData.get("due_day"));
  const dueDay = Number.isInteger(dueDayRaw) && dueDayRaw >= 1 && dueDayRaw <= 28 ? dueDayRaw : null;
  const birthDate = String(formData.get("birth_date") ?? "").trim();
  const level = String(formData.get("level") ?? "intermediario");
  const sex = String(formData.get("sex") ?? "").trim();
  const activityLevel = String(formData.get("activity_level") ?? "").trim();

  if (!name) {
    return { error: "Nome é obrigatório." };
  }
  if (!email) {
    return { error: "E-mail é obrigatório." };
  }

  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("profile_id, profiles:profile_id (email)")
    .eq("id", studentId)
    .single();

  if (!student?.profile_id) {
    return { error: "Aluno não encontrado." };
  }

  const currentEmail = ((student as any).profiles?.email ?? "").toLowerCase();

  // usa o retry de schema cache: se "sex"/"activity_level" ainda não
  // existirem (migração pendente), salva o resto e só ignora esses campos
  const { error: studentError } = await saveWithSchemaCacheRetry(
    (payload) => supabase.from("students").update(payload).eq("id", studentId),
    {
      phone: phone || null,
      goal: goal || null,
      status,
      service_type: serviceType,
      is_payer: isPayer,
      monthly_fee_cents: monthlyFeeCents,
      due_day: dueDay,
      birth_date: birthDate || null,
      level,
      sex: sex || null,
      activity_level: activityLevel || null,
    }
  );

  if (studentError) {
    return { error: "Não foi possível salvar os dados do aluno." };
  }

  const admin = createAdminClient();

  // Se o e-mail mudou, atualiza o login de verdade (auth) antes do perfil —
  // se essa parte falhar (ex: e-mail já em uso por outra conta), não deixa
  // o perfil com um e-mail que não bate mais com o login.
  if (email !== currentEmail) {
    const { error: authError } = await admin.auth.admin.updateUserById(student.profile_id, {
      email,
    });

    if (authError) {
      return {
        error: authError.message.includes("already been registered")
          ? "Esse e-mail já está em uso por outra conta."
          : "Não foi possível atualizar o e-mail de login.",
      };
    }
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ name, email })
    .eq("id", student.profile_id);

  if (profileError) {
    return { error: "Dados salvos, mas houve erro ao atualizar o perfil." };
  }

  redirect(`/alunos/${studentId}`);
}

// Ordem de exibição escolhida à mão (arrastar) na lista de treinos do
// aluno — substitui a antiga ordenação por sigla (A/B/C). Tolera a coluna
// ainda não existir (migração pendente): a atualização falha em silêncio e
// a lista volta a mostrar a ordem salva no próximo carregamento.
export async function reorderWorkouts(studentId: string, orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((workoutId, index) =>
      supabase
        .from("workouts")
        .update({ display_order: index })
        .eq("id", workoutId)
        .eq("student_id", studentId)
    )
  );
  revalidatePath(`/alunos/${studentId}`);
}

// Apagar treino: se ele já foi executado alguma vez, os workout_logs
// apontam pros exercícios dele (FK sem cascata) e o banco recusa apagar —
// a versão antiga ignorava esse erro e falhava em silêncio ("não apaga").
// Agora segue a mesma corrente do apagar-aluno logo abaixo: confere a
// posse, apaga logs → exercícios → treino com o client admin, e LANÇA o
// erro se algo falhar (o DeleteButton mostra a mensagem). Sessões e
// labels do treino caem sozinhos (FK com on delete cascade).
export async function deleteWorkout(workoutId: string, studentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("id, trainer_id")
    .eq("id", studentId)
    .single();
  if (!student || student.trainer_id !== user?.id) {
    throw new Error("Aluno não encontrado.");
  }

  const admin = createAdminClient();

  const { data: workout } = await admin
    .from("workouts")
    .select("id")
    .eq("id", workoutId)
    .eq("student_id", studentId)
    .single();
  if (!workout) {
    throw new Error("Treino não encontrado.");
  }

  const { data: workoutExercises } = await admin
    .from("workout_exercises")
    .select("id")
    .eq("workout_id", workoutId);
  const exerciseIds = (workoutExercises ?? []).map((we) => we.id);

  if (exerciseIds.length > 0) {
    const { error } = await admin
      .from("workout_logs")
      .delete()
      .in("workout_exercise_id", exerciseIds);
    if (error) throw new Error("Não foi possível apagar o histórico do treino.");
  }

  const { error: exercisesError } = await admin
    .from("workout_exercises")
    .delete()
    .eq("workout_id", workoutId);
  if (exercisesError) throw new Error("Não foi possível apagar os exercícios do treino.");

  const { error: workoutError } = await admin.from("workouts").delete().eq("id", workoutId);
  if (workoutError) throw new Error("Não foi possível apagar o treino.");

  revalidatePath(`/alunos/${studentId}`);
}

// Apaga um registro de treino executado (workout_logs) de um aluno seu.
// Não existe policy de DELETE pra workout_logs, então confirma a posse do
// aluno primeiro (via RLS normal) e só depois usa o client admin pra apagar.
export async function deleteWorkoutLog(logId: string, studentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("trainer_id", user?.id ?? "")
    .maybeSingle();

  if (!student) {
    throw new Error("Aluno não encontrado.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("workout_logs")
    .delete()
    .eq("id", logId)
    .eq("student_id", studentId);

  if (error) {
    throw new Error("Não foi possível apagar o registro.");
  }

  revalidatePath(`/alunos/${studentId}`);
}

export async function deleteEvaluation(evaluationId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("evaluations").delete().eq("id", evaluationId);
  if (error) throw new Error("Não foi possível apagar a avaliação.");
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

  // tabelas que nasceram DEPOIS dessa corrente e não têm cascade — sem
  // apagar aqui, o delete final do aluno falhava mudo (mesma classe do bug
  // do apagar-treino). Refeições/alimentos das dietas e alimentos do diário
  // caem em cascata dos pais.
  await admin.from("diet_diary_entries").delete().eq("student_id", studentId);
  await admin.from("water_logs").delete().eq("student_id", studentId);
  await admin.from("diet_logs").delete().eq("student_id", studentId);
  await admin.from("diet_plans").delete().eq("student_id", studentId);
  await admin.from("mural_posts").delete().eq("student_id", studentId);

  if (student.profile_id) {
    await admin.from("push_subscriptions").delete().eq("profile_id", student.profile_id);
  }

  const { error: studentDeleteError } = await admin.from("students").delete().eq("id", studentId);
  if (studentDeleteError) {
    // antes o erro era engolido e a tela fingia sucesso com o aluno ainda lá
    throw new Error("Não foi possível apagar o aluno — algum dado ainda aponta pra ele. Me avisa que eu investigo.");
  }

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
