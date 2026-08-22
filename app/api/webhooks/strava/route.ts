import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  stravaConfigured,
  getValidAccessToken,
  fetchStravaActivity,
  describeActivity,
} from "@/lib/strava";
import { isCardioGroup } from "@/lib/cardio";

// Webhook do Strava. Dois papéis:
//
// GET  — validação da inscrição: quando a gente registra o webhook lá,
//        o Strava chama aqui com um challenge que precisa ser ecoado.
// POST — eventos: atividade nova do aluno → busca os detalhes, guarda em
//        strava_activities e marca o cardio do dia na ficha como feito,
//        com o resumo real ("Strava · Corrida · 5,2 km · 31min").
//        Aluno desautorizou o app no Strava → apaga a conexão.
//
// O Strava reentrega eventos sem resposta 200 em 2s, então qualquer
// falha interna ainda responde 200 — melhor perder um evento raro que
// receber o mesmo em loop. A idempotência vem do id da atividade ser a
// chave primária de strava_activities.

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const expected = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN?.trim();
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return NextResponse.json({ "hub.challenge": challenge });
  }
  return NextResponse.json({ error: "verificação inválida" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  if (!stravaConfigured()) return NextResponse.json({ ok: true });

  let event: any;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    const admin = createAdminClient();

    // aluno revogou o acesso lá no Strava
    if (event.object_type === "athlete" && event.updates?.authorized === "false") {
      await admin.from("strava_connections").delete().eq("strava_athlete_id", event.owner_id);
      return NextResponse.json({ ok: true });
    }

    if (event.object_type !== "activity" || event.aspect_type !== "create") {
      return NextResponse.json({ ok: true });
    }

    // de quem é essa atividade?
    const { data: conn } = await admin
      .from("strava_connections")
      .select("profile_id")
      .eq("strava_athlete_id", event.owner_id)
      .single();
    if (!conn) return NextResponse.json({ ok: true });

    const { data: student } = await admin
      .from("students")
      .select("id")
      .eq("profile_id", conn.profile_id)
      .single();
    if (!student) return NextResponse.json({ ok: true });

    const accessToken = await getValidAccessToken(event.owner_id);
    if (!accessToken) return NextResponse.json({ ok: true });

    const activity = await fetchStravaActivity(accessToken, event.object_id);
    if (!activity) return NextResponse.json({ ok: true });

    const activityDate = activity.start_date_local?.slice(0, 10) ?? null;

    // guarda a atividade — id do Strava é a PK, então evento reentregue
    // não duplica nada
    await admin.from("strava_activities").upsert(
      {
        id: activity.id,
        student_id: student.id,
        type: activity.type,
        name: activity.name,
        distance_m: activity.distance,
        moving_time_s: activity.moving_time,
        activity_date: activityDate,
      },
      { onConflict: "id" }
    );

    if (!activityDate) return NextResponse.json({ ok: true });

    // marca o cardio do dia na ficha: procura, nos treinos ativos do
    // aluno, um exercício de cardio ainda não concluído nessa data
    const { data: activeWorkouts } = await admin
      .from("workouts")
      .select("id")
      .eq("student_id", student.id)
      .eq("status", "active");
    const workoutIds = (activeWorkouts ?? []).map((w) => w.id);
    if (workoutIds.length === 0) return NextResponse.json({ ok: true });

    const { data: exercises } = await admin
      .from("workout_exercises")
      .select("id, order_index, exercises:exercise_id (muscle_group)")
      .in("workout_id", workoutIds)
      .order("order_index");
    const cardioExercises = (exercises ?? []).filter((we: any) =>
      isCardioGroup(we.exercises?.muscle_group)
    );
    if (cardioExercises.length === 0) return NextResponse.json({ ok: true });

    const cardioIds = cardioExercises.map((we: any) => we.id);
    const { data: logs } = await admin
      .from("workout_logs")
      .select("id, workout_exercise_id, completed")
      .eq("student_id", student.id)
      .eq("date", activityDate)
      .in("workout_exercise_id", cardioIds);
    const logByExercise = new Map((logs ?? []).map((l) => [l.workout_exercise_id, l]));

    // primeiro cardio da ficha sem registro concluído nessa data — se o
    // aluno já marcou na mão, não sobrescreve o registro dele
    const target = cardioExercises.find((we: any) => !logByExercise.get(we.id)?.completed);
    if (!target) return NextResponse.json({ ok: true });

    const summary = `Strava · ${describeActivity(activity)}`;
    const existing = logByExercise.get((target as any).id);
    if (existing) {
      await admin
        .from("workout_logs")
        .update({ completed: true, feedback_text: summary })
        .eq("id", existing.id);
    } else {
      await admin.from("workout_logs").insert({
        workout_exercise_id: (target as any).id,
        student_id: student.id,
        date: activityDate,
        completed: true,
        feedback_text: summary,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // responde 200 mesmo assim — ver comentário no topo
    return NextResponse.json({ ok: true });
  }
}
