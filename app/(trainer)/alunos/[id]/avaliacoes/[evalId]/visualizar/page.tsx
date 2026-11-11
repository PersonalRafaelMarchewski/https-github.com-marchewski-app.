import Link from "next/link";
import { ChevronLeft, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import EvaluationDetail from "@/components/student/EvaluationDetail";
import { getSignedPhotoUrls } from "../../photos-actions";

export default async function VisualizarAvaliacaoPage({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { id: studentId, evalId } = await params;
  const supabase = await createClient();

  // select("*"): RLS já garante que só vem avaliação de aluno do próprio
  // treinador logado — mesma política de app/(trainer)/alunos/[id]/page.tsx
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
    <div className="space-y-4">
      <Link href={`/alunos/${studentId}`} className="inline-flex items-center gap-1 text-sm text-blue">
        <ChevronLeft size={16} />
        Voltar pro aluno
      </Link>

      <Card className="flex items-center gap-2 bg-navy text-white">
        <Eye size={18} />
        <p className="text-sm">
          Prévia — é exatamente assim que o aluno vê essa avaliação dentro do app.
        </p>
      </Card>

      <EvaluationDetail
        date={evaluation.date}
        weight={evaluation.weight}
        height={evaluation.height}
        bodyFat={evaluation.body_fat}
        measurements={evaluation.measurements as Record<string, number> | null}
        notes={evaluation.notes}
        nextAssessmentDate={evaluation.next_assessment_date}
        photoUrls={photoUrls.filter(Boolean) as string[]}
        bioimpedanceUrl={bioimpedanceUrl}
      />
    </div>
  );
}
