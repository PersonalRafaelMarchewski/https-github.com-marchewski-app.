import { NextRequest, NextResponse } from "next/server";
import { requiredEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToProfile } from "@/lib/sendPush";

const TZ = "America/Sao_Paulo";

// Chamada uma vez por dia pelo pg_cron do Supabase (ver
// supabase/migration-birthday-reminder.sql). Avisa o personal quando algum
// aluno faz aniversário hoje, e manda um "feliz aniversário" pro aluno.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${requiredEnv("CRON_SECRET")}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-"); // ["MM", "DD"]
  const todayMonthDay = `${todayParts[0]}-${todayParts[1]}`;

  const { data: students, error } = await admin
    .from("students")
    .select("id, birth_date, trainer_id, profile_id, profiles:profile_id (name)")
    .eq("status", "active")
    .not("birth_date", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const birthdayStudents = (students ?? []).filter((s: any) => {
    if (!s.birth_date) return false;
    return String(s.birth_date).slice(5, 10) === todayMonthDay;
  });

  const byTrainer = new Map<string, string[]>();
  for (const s of birthdayStudents as any[]) {
    const name = s.profiles?.name ?? "Aluno";
    const list = byTrainer.get(s.trainer_id) ?? [];
    list.push(name);
    byTrainer.set(s.trainer_id, list);
  }

  for (const [trainerId, names] of byTrainer) {
    await sendPushToProfile(trainerId, {
      title: "🎂 Aniversário de aluno",
      body:
        names.length === 1
          ? `Hoje é aniversário de ${names[0]}! Que tal mandar uma mensagem?`
          : `Hoje é aniversário de ${names.join(", ")}!`,
      url: "/dashboard",
    });
  }

  for (const s of birthdayStudents as any[]) {
    if (s.profile_id) {
      await sendPushToProfile(s.profile_id, {
        title: "🎉 Feliz aniversário!",
        body: "A equipe Marchewski Assessoria Esportiva deseja um ótimo dia pra você!",
        url: "/",
      });
    }
  }

  return NextResponse.json({ birthdaysToday: birthdayStudents.length, trainersNotified: byTrainer.size });
}
