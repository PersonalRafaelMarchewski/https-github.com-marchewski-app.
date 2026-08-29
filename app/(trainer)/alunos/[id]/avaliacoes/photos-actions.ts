"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "evaluation-photos";

// Salva UMA foto por chamada (em vez de até 4 de uma vez). Isso mantém
// cada requisição bem pequena e longe do teto fixo de tamanho de
// requisição da Vercel (~4.5MB), que nenhuma configuração do Next.js
// consegue alterar.
export async function saveEvaluationPhoto(
  evaluationId: string,
  studentId: string,
  index: number,
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

  if (formData.get("remove") === "true") {
    if (photos[index]) {
      await admin.storage.from(BUCKET).remove([photos[index] as string]);
      photos[index] = null;
    }
  } else {
    const file = formData.get("photo") as File | null;
    if (file && file.size > 0) {
      if (photos[index]) {
        await admin.storage.from(BUCKET).remove([photos[index] as string]);
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${studentId}/${evaluationId}/${index}-${Date.now()}.${ext}`;
      const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        throw new Error(`Não foi possível enviar a foto ${index + 1}: ${uploadError.message}`);
      }
      photos[index] = path;
    }
  }

  const { error: updateError } = await supabase
    .from("evaluations")
    .update({ photos })
    .eq("id", evaluationId);

  if (updateError) {
    throw new Error("Foto enviada, mas houve erro ao salvar na avaliação.");
  }

  revalidatePath(`/alunos/${studentId}`);
  revalidatePath(`/alunos/${studentId}/avaliacoes/${evaluationId}/editar`);
}

// Laudo de bioimpedância (PDF ou imagem) — um por avaliação, no mesmo
// bucket privado das fotos. Mesma lógica da foto: envia ou remove, e
// guarda só o caminho em evaluations.bioimpedance_path.
export async function saveBioimpedance(evaluationId: string, studentId: string, formData: FormData) {
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .single();
  if (!student) throw new Error("Aluno não encontrado.");

  const { data: evaluation, error: readError } = await supabase
    .from("evaluations")
    .select("id, bioimpedance_path")
    .eq("id", evaluationId)
    .single();
  if (readError?.code === "42703" || readError?.message?.includes("bioimpedance_path")) {
    throw new Error("Falta rodar a migração migration-bioimpedancia.sql no Supabase.");
  }
  if (!evaluation) throw new Error("Avaliação não encontrada.");

  const admin = createAdminClient();
  let nextPath: string | null = evaluation.bioimpedance_path ?? null;

  if (formData.get("remove") === "true") {
    if (nextPath) await admin.storage.from(BUCKET).remove([nextPath]);
    nextPath = null;
  } else {
    const file = formData.get("file") as File | null;
    if (file && file.size > 0) {
      const okType = file.type === "application/pdf" || file.type.startsWith("image/");
      if (!okType) throw new Error("Anexe um PDF ou uma imagem.");
      if (nextPath) await admin.storage.from(BUCKET).remove([nextPath]);
      const ext = file.type === "application/pdf" ? "pdf" : file.name.split(".").pop() || "jpg";
      const path = `${studentId}/${evaluationId}/bioimpedancia-${Date.now()}.${ext}`;
      const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) {
        throw new Error(`Não foi possível enviar a bioimpedância: ${uploadError.message}`);
      }
      nextPath = path;
    }
  }

  const { error: updateError } = await supabase
    .from("evaluations")
    .update({ bioimpedance_path: nextPath })
    .eq("id", evaluationId);
  if (updateError) {
    throw new Error("Arquivo enviado, mas houve erro ao salvar na avaliação.");
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
