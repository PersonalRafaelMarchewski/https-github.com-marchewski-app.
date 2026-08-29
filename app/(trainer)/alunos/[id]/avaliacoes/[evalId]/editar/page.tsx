import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import EvaluationForm from "@/components/EvaluationForm";
import { getSignedPhotoUrls } from "../../photos-actions";

export default async function EditarAvaliacaoPage({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { id: studentId, evalId } = await params;
  const supabase = await createClient();

  // select("*"): traz bioimpedance_path quando a coluna existe e não quebra
  // a tela enquanto a migração não foi rodada
  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("*")
    .eq("id", evalId)
    .single();

  if (!evaluation) {
    return <Card className="text-blue">Avaliação não encontrada.</Card>;
  }

  const photoPaths: (string | null)[] = Array.isArray(evaluation.photos)
    ? evaluation.photos
    : [null, null, null, null];
  const bioPath: string | null = (evaluation as any).bioimpedance_path ?? null;
  const [photoUrls, [bioimpedanceUrl]] = await Promise.all([
    getSignedPhotoUrls(photoPaths),
    getSignedPhotoUrls([bioPath]),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Editar avaliação física</h1>
      <EvaluationForm
        studentId={studentId}
        evaluationId={evaluation.id}
        photoUrls={photoUrls}
        bioimpedanceUrl={bioimpedanceUrl}
        initialData={{
          date: evaluation.date,
          weight: evaluation.weight,
          height: evaluation.height,
          body_fat: evaluation.body_fat,
          measurements: evaluation.measurements as Record<string, number> | null,
          notes: evaluation.notes,
          next_assessment_date: evaluation.next_assessment_date,
        }}
      />
    </div>
  );
}
