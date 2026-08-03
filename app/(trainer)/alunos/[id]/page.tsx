import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import Button from "@/components/Button";

const MEASUREMENT_LABELS: Record<string, string> = {
  cintura: "Cintura",
  quadril: "Quadril",
  peito: "Peito",
  braco: "Braço",
  coxa: "Coxa",
};

const ANAMNESE_FIELDS: { key: string; label: string; detailKey?: string }[] = [
  { key: "possui_doenca", label: "Possui doença diagnosticada", detailKey: "qual_doenca" },
  { key: "toma_medicamento", label: "Toma medicamento", detailKey: "qual_medicamento" },
  { key: "fez_cirurgia", label: "Já fez cirurgia", detailKey: "qual_cirurgia" },
  { key: "tem_dor_lesao", label: "Dor ou lesão", detailKey: "qual_dor_lesao" },
  { key: "pratica_atividade", label: "Já praticou atividade física", detailKey: "qual_atividade" },
  { key: "fumante", label: "Fumante" },
  { key: "consome_alcool", label: "Consome álcool" },
];

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, goal, phone, status, anamnesis, profiles:profile_id (name, email)")
    .eq("id", id)
    .single();

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, name, status, start_date, end_date")
    .eq("student_id", id)
    .order("start_date", { ascending: false });

  const { data: logs } = await supabase
    .from("workout_logs")
    .select(
      "id, date, completed, difficulty_rating, feedback_text, workout_exercises:workout_exercise_id (exercises:exercise_id (name))"
    )
    .eq("student_id", id)
    .order("date", { ascending: false })
    .limit(10);

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("id, date, weight, body_fat, measurements, notes")
    .eq("student_id", id)
    .order("date", { ascending: false });

  const profile = (student as any)?.profiles;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">{profile?.name ?? "Aluno"}</h1>
        <p className="text-blue">{profile?.email}</p>
        {student?.goal && <p className="mt-1 text-sm text-blue">Objetivo: {student.goal}</p>}
      </div>

      <div>
        <h2 className="mb-3 font-heading font-semibold text-navy">Treinos</h2>
        {!workouts || workouts.length === 0 ? (
          <Card className="text-blue">Nenhum treino criado ainda.</Card>
        ) : (
          <div className="space-y-2">
            {workouts.map((w) => (
              <Card key={w.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-navy">{w.name}</p>
                  <p className="text-sm text-blue">
                    {w.start_date ?? "?"} até {w.end_date ?? "?"}
                  </p>
                </div>
                <span className="rounded-full bg-lightblue/20 px-3 py-1 text-xs font-medium text-blue">
                  {w.status}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-heading font-semibold text-navy">Últimos feedbacks</h2>
        {!logs || logs.length === 0 ? (
          <Card className="text-blue">Nenhum feedback registrado ainda.</Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log: any) => (
              <Card key={log.id}>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-navy">
                    {log.workout_exercises?.exercises?.name ?? "Exercício"}
                  </p>
                  <span className="text-sm text-blue">{log.date}</span>
                </div>
                <p className="mt-1 text-sm text-blue">
                  {log.completed ? "Concluído" : "Não concluído"}
                  {log.difficulty_rating ? ` · dificuldade ${log.difficulty_rating}/5` : ""}
                </p>
                {log.feedback_text && (
                  <p className="mt-1 text-sm italic text-navy">"{log.feedback_text}"</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading font-semibold text-navy">Avaliações físicas</h2>
          <Link href={`/alunos/${id}/avaliacoes/novo`}>
            <Button variant="secondary" className="flex items-center gap-2 !px-3 !py-1.5 text-sm">
              <Plus size={16} />
              Nova avaliação
            </Button>
          </Link>
        </div>
        {!evaluations || evaluations.length === 0 ? (
          <Card className="text-blue">Nenhuma avaliação registrada ainda.</Card>
        ) : (
          <div className="space-y-2">
            {evaluations.map((ev) => {
              const measurements = (ev.measurements as Record<string, number> | null) ?? {};
              const measurementEntries = Object.entries(measurements);
              return (
                <Card key={ev.id}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-navy">
                      {ev.weight ? `${ev.weight}kg` : "Peso não informado"}
                      {ev.body_fat ? ` · ${ev.body_fat}% gordura` : ""}
                    </p>
                    <span className="text-sm text-blue">{ev.date}</span>
                  </div>
                  {measurementEntries.length > 0 && (
                    <p className="mt-1 text-sm text-blue">
                      {measurementEntries
                        .map(([k, v]) => `${MEASUREMENT_LABELS[k] ?? k}: ${v}cm`)
                        .join(" · ")}
                    </p>
                  )}
                  {ev.notes && <p className="mt-1 text-sm italic text-navy">"{ev.notes}"</p>}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-heading font-semibold text-navy">Anamnese</h2>
        {!student?.anamnesis ? (
          <Card className="text-blue">Aluno ainda não preencheu a anamnese.</Card>
        ) : (
          <Card className="space-y-2">
            {ANAMNESE_FIELDS.map((f) => {
              const anamnesis = student.anamnesis as Record<string, any>;
              const value = anamnesis[f.key];
              const detail = f.detailKey ? anamnesis[f.detailKey] : null;
              return (
                <p key={f.key} className="text-sm text-navy">
                  <span className="font-medium">{f.label}:</span> {value ? "Sim" : "Não"}
                  {value && detail ? ` — ${detail}` : ""}
                </p>
              );
            })}
            {student.anamnesis.qualidade_sono && (
              <p className="text-sm text-navy">
                <span className="font-medium">Qualidade do sono:</span>{" "}
                {student.anamnesis.qualidade_sono}
              </p>
            )}
            {student.anamnesis.observacoes && (
              <p className="mt-2 text-sm italic text-navy">"{student.anamnesis.observacoes}"</p>
            )}
          </Card>
        )}
      </div>

      <Link href="/dashboard" className="text-sm text-blue hover:underline">
        ← Voltar
      </Link>
    </div>
  );
}
