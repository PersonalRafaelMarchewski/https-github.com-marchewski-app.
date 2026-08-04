"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "evaluation-photos";

export async function saveEvaluationPhotos(
  evaluationId: string,
  studentId: string,
  formData: FormData
) {
  const supabase = await createClient();

  // garante que o treinador logado é dono desse aluno antes de tocar no storage
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .single();

  if (!student) {
    throw new Error("Aluno não encontrado.");
  }

  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("id, photos")
    .eq("id", evaluationId)
    .single();

  if (!evaluation) {
    throw new Error("Avaliação não encontrada.");
  }

  const admin = createAdminClient();
  const photos: (string | null)[] = Array.isArray(evaluation.photos)
    ? [...evaluation.photos]
    : [null, null, null, null];
  while (photos.length < 4) photos.push(null);

  for (let i = 0; i < 4; i++) {
    if (formData.get(`remove_${i}`) === "true" && photos[i]) {
      await admin.storage.from(BUCKET).remove([photos[i] as string]);
      photos[i] = null;
      continue;
    }

    const file = formData.get(`photo_${i}`) as File | null;
    if (file && file.size > 0) {
      if (photos[i]) {
        await admin.storage.from(BUCKET).remove([photos[i] as string]);
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${studentId}/${evaluationId}/${i}-${Date.now()}.${ext}`;
      const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        throw new Error(`Não foi possível enviar a foto ${i + 1}.`);
      }
      photos[i] = path;
    }
  }

  const { error: updateError } = await supabase
    .from("evaluations")
    .update({ photos })
    .eq("id", evaluationId);

  if (updateError) {
    throw new Error("Fotos enviadas, mas houve erro ao salvar na avaliação.");
  }

  revalidatePath(`/alunos/${studentId}`);
  revalidatePath(`/alunos/${studentId}/avaliacoes/${evaluationId}/editar`);
}

export async function getSignedPhotoUrls(paths: (string | null)[]): Promise<(string | null)[]> {
  const admin = createAdminClient();
  const results = await Promise.all(
    paths.map(async (path) => {
      if (!path) return null;
      const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    })
  );
  return results;
}
