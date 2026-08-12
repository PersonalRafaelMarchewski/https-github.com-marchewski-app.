import { NextRequest, NextResponse } from "next/server";
import { requiredEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToProfile } from "@/lib/sendPush";
import { formatTimeInBrazil } from "@/lib/date";

// Chamada a cada minuto pelo pg_cron do Supabase (ver supabase/migration-agenda.sql).
// Manda o lembrete de aula pro aluno assim que o horário configurado chegar.
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

  const { data: dueSessions, error } = await admin
    .from("training_sessions")
    .select(
      "id, title, start_at, reminder_minutes_before, students:student_id (profile_id)"
    )
    .eq("reminder_sent", false)
    .eq("status", "scheduled")
    .gt("start_at", graceWindowStart);

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
    const profileId = session.students?.profile_id;

    if (profileId) {
      const time = formatTimeInBrazil(session.start_at);

      await sendPushToProfile(profileId, {
        title: "Lembrete de aula",
        body: session.title
          ? `${session.title} às ${time} de hoje.`
          : `Você tem aula hoje às ${time}.`,
        url: "/",
      });
    }

    await admin.from("training_sessions").update({ reminder_sent: true }).eq("id", session.id);
    sent++;
  }

  return NextResponse.json({ sent });
}
