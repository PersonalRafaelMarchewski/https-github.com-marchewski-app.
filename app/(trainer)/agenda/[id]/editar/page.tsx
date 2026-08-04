import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import SessionForm from "@/components/SessionForm";
import DeleteButton from "@/components/DeleteButton";
import { deleteSession } from "@/app/(trainer)/agenda/actions";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: session }, { data: students }] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("id, student_id, title, start_at, end_at, reminder_minutes_before, notes")
      .eq("id", id)
      .single(),
    supabase
      .from("students")
      .select("id, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .eq("status", "active"),
  ]);

  if (!session) {
    return <Card className="text-blue">Aula não encontrada.</Card>;
  }

  const studentOptions = (students ?? []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.name ?? "Aluno sem nome",
  }));

  const durationMinutes = Math.round(
    (new Date(session.end_at).getTime() - new Date(session.start_at).getTime()) / 60_000
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Editar aula</h1>
        <DeleteButton
          action={deleteSession.bind(null, id)}
          confirmMessage="Excluir esta aula? Essa ação não pode ser desfeita."
        />
      </div>

      <SessionForm
        students={studentOptions}
        sessionId={id}
        initialData={{
          studentId: session.student_id,
          title: session.title ?? "",
          date: toLocalDateInput(session.start_at),
          time: toLocalTimeInput(session.start_at),
          durationMinutes,
          reminderMinutesBefore: session.reminder_minutes_before,
          notes: session.notes ?? "",
        }}
      />

      <Link href="/agenda" className="text-sm text-blue hover:underline">
        ← Voltar pra agenda
      </Link>
    </div>
  );
}
