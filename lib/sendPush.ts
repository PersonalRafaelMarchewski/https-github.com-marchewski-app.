import "server-only";
import webpush from "@/lib/webpush";
import { createAdminClient } from "@/lib/supabase/admin";

export async function sendPushToProfile(
  profileId: string,
  payload: { title: string; body: string; url?: string }
) {
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", profileId);

  if (!subs || subs.length === 0) return;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          {
            // urgency high: pede ao entregador (FCM etc.) furar a economia
            // de bateria — sem isso, notificação de madrugada fica presa
            // até o aparelho acordar (lembrete das 4h30 chegando 6h).
            urgency: "high",
            // validade de 1h: lembrete de aula que não conseguiu chegar em
            // 1h é descartado — melhor não chegar do que chegar depois da
            // aula, confundindo o aluno.
            TTL: 3600,
          }
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}
