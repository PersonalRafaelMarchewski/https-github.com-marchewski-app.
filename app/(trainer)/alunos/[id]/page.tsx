import Link from "next/link";
import { Plus, Pencil, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import Button from "@/components/Button";
import ResetPasswordButton from "@/components/ResetPasswordButton";
import DeleteButton from "@/components/DeleteButton";
import DeleteStudentButton from "@/components/DeleteStudentButton";
import ProgressChart from "@/components/ProgressChart";
import PaymentForm from "@/components/PaymentForm";
import TrainingCalendar from "@/components/TrainingCalendar";
import TrainerFeedbackCard from "@/components/TrainerFeedbackCard";
import VolumeSummary from "@/components/VolumeSummary";
import VolumeTrendChart from "@/components/VolumeTrendChart";
import { summarizeVolumeByHistory, summarizeVolumeTrend } from "@/lib/volume";
import { daysUntil, formatDueLabel } from "@/lib/dueDate";
import { deleteWorkout, deleteEvaluation } from "./actions";
import { getSignedAvatarUrl } from "@/lib/avatar";
import { getSignedPhotoUrls } from "./avaliacoes/photos-actions";
import { getSignedVideoUrl } from "@/app/(student)/treino-do-dia/video-actions";
import { measurementLabel } from "@/lib/evaluationFields";
import { levelLabel } from "@/lib/level";

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  completed: "Concluído",
  draft: "Rascunho",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  active: "Ativa",
  canceled: "Cancelada",
  failed: "Falhou",
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

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(
      "id, goal, phone, status, birth_date, level, anamnesis, subscription_status, profiles:profile_id (name, email, avatar_url)"
    )
    .eq("id", id)
    .single();

  if (studentError) {
    // Não interrompe a página inteira — treinos, calendário etc. abaixo não
    // dependem desse registro e continuam funcionando normalmente. Só avisa
    // que nome/foto/objetivo desse bloco não puderam ser carregados.
    console.error("Erro ao carregar dados básicos do aluno:", studentError);
  }

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, name, status, start_date, end_date")
    .eq("student_id", id)
    .order("start_date", { ascending: false });

  const workoutIds = (workouts ?? []).map((w) => w.id);
  const { data: allWorkoutExercises } = workoutIds.length
    ? await supabase.from("workout_exercises").select("workout_id, label").in("workout_id", workoutIds)
    : { data: [] as { workout_id: string; label: string }[] };

  const workoutLabels = new Map<string, string[]>();
  for (const we of allWorkoutExercises ?? []) {
    const list = workoutLabels.get(we.workout_id) ?? [];
    if (!list.includes(we.label)) list.push(we.label);
    workoutLabels.set(we.workout_id, list.sort());
  }

  const { data: logs } = await supabase
    .from("workout_logs")
    .select(
      "id, date, completed, difficulty_rating, feedback_text, video_path, trainer_feedback_text, trainer_rating, workout_exercises:workout_exercise_id (exercises:exercise_id (name))"
    )
    .eq("student_id", id)
    .order("date", { ascending: false })
    .limit(10);

  const logVideoUrls = new Map<string, string | null>();
  for (const log of logs ?? []) {
    if (log.video_path) {
      logVideoUrls.set(log.id, await getSignedVideoUrl(log.video_path));
    }
  }

  const { data: trainedLogs } = await supabase
    .from("workout_logs")
    .select("date")
    .eq("student_id", id)
    .eq("completed", true);

  const trainedDates = [...new Set((trainedLogs ?? []).map((l) => l.date))];

  // Volume e frequência reais por grupo muscular, com base no que o aluno
  // efetivamente concluiu (workout_logs). Busca 6 semanas de uma vez: os
  // últimos 7 dias viram o resumo/gráfico de barras, e as 6 semanas inteiras
  // alimentam o gráfico de evolução.
  const TREND_WEEKS = 6;
  const trendSince = new Date();
  trendSince.setDate(trendSince.getDate() - (TREND_WEEKS * 7 - 1));
  const trendSinceDate = `${trendSince.getFullYear()}-${String(trendSince.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(trendSince.getDate()).padStart(2, "0")}`;

  const { data: volumeLogs } = await supabase
    .from("workout_logs")
    .select(
      "date, workout_exercises:workout_exercise_id (sets, exercises:exercise_id (muscle_group))"
    )
    .eq("student_id", id)
    .eq("completed", true)
    .gte("date", trendSinceDate);

  const volumeItems = (volumeLogs ?? []).map((log: any) => ({
    muscleGroup: log.workout_exercises?.exercises?.muscle_group ?? null,
    date: log.date,
    sets: log.workout_exercises?.sets ?? null,
  }));

  const sevenDaysAgoDate = new Date();
  sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 6);
  const sinceDate = `${sevenDaysAgoDate.getFullYear()}-${String(
    sevenDaysAgoDate.getMonth() + 1
  ).padStart(2, "0")}-${String(sevenDaysAgoDate.getDate()).padStart(2, "0")}`;

  const realVolumeRows = summarizeVolumeByHistory(
    volumeItems.filter((item) => item.date >= sinceDate)
  );
  const volumeTrend = summarizeVolumeTrend(volumeItems, TREND_WEEKS);

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("id, date, weight, height, body_fat, measurements, notes, photos")
    .eq("student_id", id)
    .order("date", { ascending: false });

  const evaluationPhotoUrls = new Map<string, (string | null)[]>();
  for (const ev of evaluations ?? []) {
    const paths = Array.isArray(ev.photos) ? ev.photos : [];
    if (paths.some(Boolean)) {
      evaluationPhotoUrls.set(ev.id, await getSignedPhotoUrls(paths));
    }
  }

  const { data: payments } = await supabase
    .from("payments")
    .select("id, type, amount_cents, status, description, created_at")
    .eq("student_id", id)
    .order("created_at", { ascending: false });

  const profile = (student as any)?.profiles;
  const avatarSignedUrl = await getSignedAvatarUrl(profile?.avatar_url);

  return (
    <div className="space-y-8">
      {studentError && (
        <Card className="text-orange">
          Não foi possível carregar nome, foto e objetivo desse aluno agora — o resto da página
          (treinos, calendário, avaliações) continua normal.
        </Card>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-full bg-peach/40 text-navy">
            {avatarSignedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSignedUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <User size={28} />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-navy">{profile?.name ?? "Aluno"}</h1>
              {student?.status === "inactive" && (
                <span className="rounded-full bg-orange/20 px-2 py-0.5 text-xs font-medium text-orange">
                  Inativo
                </span>
              )}
              {student && (
                <span className="rounded-full bg-lightblue/15 px-2 py-0.5 text-xs font-medium text-blue">
                  {levelLabel(student.level)}
                </span>
              )}
            </div>
            <p className="text-blue">{profile?.email}</p>
            {student?.goal && <p className="mt-1 text-sm text-blue">Objetivo: {student.goal}</p>}
            {student?.birth_date && (
              <p className="mt-1 text-sm text-blue">
                Aniversário:{" "}
                {new Date(`${student.birth_date}T12:00:00`).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                })}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/alunos/${id}/editar`}>
            <Button
              variant="secondary"
              className="flex min-h-[44px] items-center gap-2 !px-4 text-sm"
            >
              <Pencil size={16} />
              Editar
            </Button>
          </Link>
          <ResetPasswordButton studentId={id} studentEmail={profile?.email ?? ""} />
          <DeleteStudentButton studentId={id} studentName={profile?.name ?? "este aluno"} />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading font-semibold text-navy">Treinos</h2>
          {student?.status === "active" && (
            <Link href={`/treinos/novo?student=${id}`}>
              <Button variant="secondary" className="flex items-center gap-2 !px-3 !py-1.5 text-sm">
                <Plus size={16} />
                Montar treino
              </Button>
            </Link>
          )}
        </div>
        {!workouts || workouts.length === 0 ? (
          <Card className="text-blue">Nenhum treino criado ainda.</Card>
        ) : (
          <div className="space-y-2">
            {workouts.map((w) => (
              <Card key={w.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-navy">{w.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm text-blue">
                      {w.start_date ?? "?"} até {w.end_date ?? "?"}
                    </p>
                    {w.end_date && w.status === "active" && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          daysUntil(w.end_date) <= 7
                            ? "bg-orange/15 text-orange"
                            : "bg-lightblue/15 text-blue"
                        }`}
                      >
                        {formatDueLabel(daysUntil(w.end_date))}
                      </span>
                    )}
                  </div>
                  {(workoutLabels.get(w.id) ?? []).length > 0 && (
                    <div className="mt-1.5 flex gap-1">
                      {workoutLabels.get(w.id)!.map((label) => (
                        <span
                          key={label}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      w.status === "active"
                        ? "bg-orange/15 text-orange"
                        : "bg-lightblue/20 text-blue"
                    }`}
                  >
                    {STATUS_LABELS[w.status] ?? w.status}
                  </span>
                  <Link
                    href={`/treinos/${w.id}/editar`}
                    className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20"
                    aria-label="Editar treino"
                  >
                    <Pencil size={16} />
                  </Link>
                  <DeleteButton
                    action={deleteWorkout.bind(null, w.id, id)}
                    confirmMessage={`Excluir o treino "${w.name}"? Essa ação não pode ser desfeita.`}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-heading font-semibold text-navy">Calendário de treinos</h2>
        <Card>
          <TrainingCalendar trainedDates={trainedDates} />
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-heading font-semibold text-navy">
          Volume e frequência (últimos 7 dias)
        </h2>
        <VolumeSummary
          title="Por grupo muscular, com base no que foi treinado de verdade"
          rows={realVolumeRows}
          frequencyLabel={(f) => `${f}x/semana`}
          emptyMessage="Nenhum treino concluído registrado nos últimos 7 dias."
        />

        <Card className="mt-3">
          <h3 className="mb-3 font-heading text-sm font-semibold text-navy">
            Evolução do volume (últimas 6 semanas)
          </h3>
          <VolumeTrendChart trend={volumeTrend} />
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-heading font-semibold text-navy">Últimos feedbacks</h2>
        {!logs || logs.length === 0 ? (
          <Card className="text-blue">Nenhum feedback registrado ainda.</Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log: any) => (
              <TrainerFeedbackCard
                key={log.id}
                logId={log.id}
                studentId={id}
                exerciseName={log.workout_exercises?.exercises?.name ?? "Exercício"}
                date={log.date}
                completed={log.completed}
                difficultyRating={log.difficulty_rating}
                feedbackText={log.feedback_text}
                videoSignedUrl={logVideoUrls.get(log.id) ?? null}
                initialTrainerRating={log.trainer_rating}
                initialTrainerFeedback={log.trainer_feedback_text}
              />
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
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <ProgressChart
                  title="Peso"
                  unit="kg"
                  data={evaluations
                    .filter((ev) => ev.weight != null)
                    .map((ev) => ({ date: ev.date, value: ev.weight as number }))}
                />
              </Card>
              <Card>
                <ProgressChart
                  title="% Gordura"
                  unit="%"
                  data={evaluations
                    .filter((ev) => ev.body_fat != null)
                    .map((ev) => ({ date: ev.date, value: ev.body_fat as number }))}
                />
              </Card>
            </div>
            <div className="space-y-2">
            {evaluations.map((ev) => {
              const measurements = (ev.measurements as Record<string, number> | null) ?? {};
              const measurementEntries = Object.entries(measurements);
              const photoUrls = (evaluationPhotoUrls.get(ev.id) ?? []).filter(Boolean) as string[];
              return (
                <Card key={ev.id}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-navy">
                      {ev.weight ? `${ev.weight}kg` : "Peso não informado"}
                      {ev.height ? ` · ${ev.height}cm` : ""}
                      {ev.body_fat ? ` · ${ev.body_fat}% gordura` : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-blue">{ev.date}</span>
                      <Link
                        href={`/alunos/${id}/avaliacoes/${ev.id}/editar`}
                        className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20"
                        aria-label="Editar avaliação"
                      >
                        <Pencil size={16} />
                      </Link>
                      <DeleteButton
                        action={deleteEvaluation.bind(null, ev.id, id)}
                        confirmMessage="Excluir essa avaliação? Essa ação não pode ser desfeita."
                      />
                    </div>
                  </div>
                  {measurementEntries.length > 0 && (
                    <p className="mt-1 text-sm text-blue">
                      {measurementEntries
                        .map(([k, v]) => {
                          const { label, unit } = measurementLabel(k);
                          return `${label}: ${v}${unit}`;
                        })
                        .join(" · ")}
                    </p>
                  )}
                  {ev.notes && <p className="mt-1 text-sm italic text-navy">"{ev.notes}"</p>}
                  {photoUrls.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {photoUrls.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={url}
                          alt={`Foto ${i + 1}`}
                          className="h-14 w-14 rounded-lg border border-lightblue/30 object-cover"
                        />
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
            </div>
          </>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-heading font-semibold text-navy">Pagamentos</h2>
          {student?.subscription_status === "active" && (
            <span className="rounded-full bg-peach/40 px-2 py-0.5 text-xs font-medium text-navy">
              Assinatura ativa
            </span>
          )}
        </div>

        <div className="mb-4">
          <PaymentForm studentId={id} />
        </div>

        {!payments || payments.length === 0 ? (
          <Card className="text-blue">Nenhuma cobrança gerada ainda.</Card>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <Card key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-navy">
                    {p.description ?? (p.type === "subscription" ? "Mensalidade" : "Pagamento único")}
                  </p>
                  <p className="text-sm text-blue">
                    R$ {(p.amount_cents / 100).toFixed(2)} ·{" "}
                    {p.type === "subscription" ? "recorrente" : "único"}
                  </p>
                </div>
                <span className="rounded-full bg-lightblue/20 px-3 py-1 text-xs font-medium text-blue">
                  {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                </span>
              </Card>
            ))}
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
