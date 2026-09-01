import Link from "next/link";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import Card from "@/components/Card";
import SessionForm from "@/components/SessionForm";
import DeleteSessionButton from "@/components/DeleteSessionButton";
import AttendanceButtons from "@/components/AttendanceButtons";

const TZ = "America/Sao_Paulo";

function toLocalDateInput(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function toLocalTimeInput(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export default async function EditarAulaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  const [{ data: session }, { data: students }] = await Promise.all([
    // select("*"): inclui missed_reason sem quebrar a tela se a migração
    // migration-motivo-falta.sql ainda não tiver rodado
    supabase.from("training_sessions").select("*").eq("id", id).single(),
    supabase
      .from("students")
      .select("id, service_type, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .eq("status", "active"),
  ]);

  if (!session) {
    return <Card className="text-blue">Aula não encontrada.</Card>;
  }

  const studentOptions = (students ?? []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.name ?? "Aluno sem nome",
    serviceType: s.service_type ?? "assessoria",
  }));

  const durationMinutes = Math.round(
    (new Date(session.end_at).getTime() - new Date(session.start_at).getTime()) / 60_000
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy">Editar aula</h1>
        <div className="flex items-start gap-2">
          <AttendanceButtons
            sessionId={id}
            initialStatus={session.status}
            initialReason={(session as any).missed_reason ?? null}
          />
          <DeleteSessionButton sessionId={id} isRecurring={Boolean(session.recurrence_group_id)} />
        </div>
      </div>

      <SessionForm
        students={studentOptions}
        sessionId={id}
        isRecurring={Boolean(session.recurrence_group_id)}
        initialData={{
          studentId: session.student_id ?? "",
          title: session.title ?? "",
          date: toLocalDateInput(session.start_at),
          time: toLocalTimeInput(session.start_at),
          durationMinutes,
          reminderMinutesBefore: session.reminder_minutes_before,
          notes: session.notes ?? "",
          color: session.color ?? null,
        }}
      />

      <Link href="/agenda" className="text-sm text-blue hover:underline">
        ← Voltar pra agenda
      </Link>
    </div>
  );
}
