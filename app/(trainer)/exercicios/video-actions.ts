"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "exercise-library-videos";

// Vídeo é grande demais pra passar pela Server Action normal, então o
// upload de verdade acontece direto do navegador pro Supabase Storage,
// usando uma signed URL gerada aqui — mesmo esquema já usado pro vídeo que
// o aluno grava do próprio set (só que esse bucket é público, porque o
// vídeo de demonstração é reaproveitado pra todos os alunos).
export async function getExerciseVideoUploadUrl(exerciseKey: string, extension: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sessão expirada, faça login de novo.");
  }

  const admin = createAdminClient();
  const safeExt = (extension || "mp4").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "mp4";
  const safeKey = (exerciseKey || "video").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 60) || "video";
  const path = `${user.id}/${safeKey}-${Date.now()}.${safeExt}`;

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error("Não foi possível preparar o upload do vídeo.");
  }

  return { path, token: data.token };
}
