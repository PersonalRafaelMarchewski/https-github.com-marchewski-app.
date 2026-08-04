import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import EvaluationForm from "@/components/EvaluationForm";

export default async function EditarAvaliacaoPage({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { id: studentId, evalId } = await params;
  const supabase = await createClient();

  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("id, date, weight, body_fat, measurements, notes")
    .eq("id", evalId)
    .single();

  if (!evaluation) {
    return <Card className="text-blue">Avaliação não encontrada.</Card>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Editar avaliação física</h1>
      <EvaluationForm
        studentId={studentId}
        evaluationId={evaluation.id}
        initialData={{
          date: evaluation.date,
          weight: evaluation.weight,
          body_fat: evaluation.body_fat,
          measurements: evaluation.measurements as Record<string, number> | null,
          notes: evaluation.notes,
        }}
      />
    </div>
  );
}
