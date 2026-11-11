import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import StudentCard from "@/components/student/StudentCard";
import EvaluationDetail from "@/components/student/EvaluationDetail";
import { getSignedPhotoUrls } from "@/app/(trainer)/alunos/[id]/avaliacoes/photos-actions";

export default async function AvaliacaoDetalhePage({
  params,
}: {
  params: Promise<{ evalId: string }>;
}) {
  const { evalId } = await params;
  const supabase = await createClient();

  // select("*"): RLS já garante que só vem avaliação do próprio aluno logado
  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("*")
    .eq("id", evalId)
    .single();

  if (!evaluation) {
    return <StudentCard className="text-blue">Avaliação não encontrada.</StudentCard>;
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
      <Link href="/historico" className="inline-flex items-center gap-1 text-sm text-blue">
        <ChevronLeft size={16} />
        Voltar pro histórico
      </Link>
      <h1 className="text-2xl font-bold text-navy">Avaliação física</h1>
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
