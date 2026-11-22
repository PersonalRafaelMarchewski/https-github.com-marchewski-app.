"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "exercise-library-photos";

// Mesmo esquema do vídeo de demonstração (video-actions.ts): upload direto
// do navegador pro Storage com signed URL, bucket público porque a foto é
// reaproveitada pra todos os alunos que fazem esse exercício.
export async function getExercisePhotoUploadUrl(exerciseKey: string, extension: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sessão expirada, faça login de novo.");
  }

  const admin = createAdminClient();
  const safeExt = (extension || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
  const safeKey = (exerciseKey || "foto").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 60) || "foto";
  const path = `${user.id}/${safeKey}-${Date.now()}.${safeExt}`;

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error("Não foi possível preparar o upload da foto.");
  }

  return { path, token: data.token };
}
