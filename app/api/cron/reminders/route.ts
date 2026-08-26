import { NextRequest, NextResponse } from "next/server";
import { requiredEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToProfile } from "@/lib/sendPush";
import { formatTimeInBrazil } from "@/lib/date";

// Chamada a cada minuto pelo pg_cron do Supabase (ver supabase/migration-agenda.sql).
// Manda o lembrete de aula pro aluno E pro personal assim que o horário
// configurado chegar — antes só avisava o aluno, o personal nunca recebia
// nada sobre a própria agenda.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${requiredEnv("CRON_SECRET")}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();

  // Tolerância de 2h: se o robô perder o minuto exato do lembrete (uma
  // instabilidade passageira, por exemplo), ele ainda tem uma segunda chance
  // de mandar o aviso atrasado, em vez de perder o lembrete pra sempre assim
  // que o horário da aula passa.
  const graceWindowStart = new Date(now - 2 * 60 * 60_000).toISOString();
  // Horizonte de 24h pra frente + ordenação + limite explícito. Sem isso,
  // a consulta trazia TODA aula futura sem lembrete — e com a agenda
  // recorrente criada semanas à frente, passava de 1000 linhas: a API
  // corta em 1000 SEM ordem definida, e a aula de HOJE à tarde ficava
  // fora do pacote. Era isso (não o pg_cron) que fazia os lembretes da
  // tarde nunca saírem e os raros atrasados chegarem 2h depois.
  const horizon = new Date(now + 24 * 60 * 60_000).toISOString();

  const { data: dueSessions, error } = await admin
    .from("training_sessions")
    .select(
      "id, title, start_at, reminder_minutes_before, trainer_id, students:student_id (profile_id, profiles:profile_id (name))"
    )
    .eq("reminder_sent", false)
    .eq("status", "scheduled")
    .gt("start_at", graceWindowStart)
    .lte("start_at", horizon)
    .order("start_at", { ascending: true })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const toSend = (dueSessions ?? []).filter((s: any) => {
    const startMs = new Date(s.start_at).getTime();
    const triggerMs = startMs - s.reminder_minutes_before * 60_000;
    return triggerMs <= now;
  });

  let sent = 0;
  for (const session of toSend as any[]) {
    const studentProfileId = session.students?.profile_id;
    const studentName = session.students?.profiles?.name ?? "aluno";
    const time = formatTimeInBrazil(session.start_at);

    if (studentProfileId) {
      await sendPushToProfile(studentProfileId, {
        title: "Lembrete de aula",
        body: session.title
          ? `${session.title} às ${time} de hoje.`
          : `Você tem aula hoje às ${time}.`,
        url: "/",
      });
    }

    if (session.trainer_id) {
      // sem aluno = compromisso pessoal do personal — o título é o evento
      const trainerBody = !session.students
        ? `${session.title ?? "Compromisso"} às ${time} de hoje.`
        : session.title
          ? `${session.title} (${studentName}) às ${time} de hoje.`
          : `Aula com ${studentName} às ${time} de hoje.`;
      await sendPushToProfile(session.trainer_id, {
        title: session.students ? "Lembrete de aula" : "Lembrete de compromisso",
        body: trainerBody,
        url: "/agenda",
      });
    }

    await admin.from("training_sessions").update({ reminder_sent: true }).eq("id", session.id);
    sent++;
  }

  return NextResponse.json({ sent });
}
