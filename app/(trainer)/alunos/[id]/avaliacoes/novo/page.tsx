import EvaluationForm from "@/components/EvaluationForm";

export default async function NovaAvaliacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: studentId } = await params;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Nova avaliação física</h1>
      <EvaluationForm studentId={studentId} />
    </div>
  );
}
