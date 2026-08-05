"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "exercise-videos";

// Vídeos são grandes demais pra passar pela Server Action normal (estouraria
// o limite de tamanho de requisição, o mesmo problema que já tivemos com as
// fotos de avaliação — só que pior, vídeo pesa muito mais). Por isso o
// upload de verdade acontece direto do navegador pro Supabase Storage,
// usando uma signed URL gerada aqui com a service_role key.
export async function getVideoUploadUrl(workoutExerciseId: string, extension: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sessão expirada, faça login de novo.");
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!student) {
    throw new Error("Aluno não encontrado.");
  }

  const admin = createAdminClient();
  const safeExt = (extension || "mp4").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "mp4";
  const path = `${student.id}/${workoutExerciseId}-${Date.now()}.${safeExt}`;

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error("Não foi possível preparar o upload do vídeo.");
  }

  return { path, token: data.token };
}

export async function getSignedVideoUrl(path: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
