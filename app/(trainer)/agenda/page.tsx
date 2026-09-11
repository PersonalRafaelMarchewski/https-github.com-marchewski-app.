import WeekAgenda from "@/components/WeekAgenda";
import { createClient } from "@/lib/supabase/server";
import { todayInBrazil } from "@/lib/date";

// A agenda buscava TUDO do navegador depois de abrir (aulas, lembretes,
// contadores...), então todo primeiro acesso ficava no "Carregando..."
// esperando a rodada de consultas — no celular isso era a demora que o
// Rafa sentia. Agora o servidor já manda a página com as aulas do mês
// atual dentro; o componente só volta ao banco quando navega de período.
export default async function AgendaPage() {
  const supabase = await createClient();

  // mês atual no fuso do Brasil (o servidor da Vercel roda em UTC)
  const hoje = todayInBrazil();
  const [ano, mes] = hoje.split("-").map(Number);
  const monthKey = hoje.slice(0, 7);
  const inicioMes = new Date(Date.UTC(ano, mes - 1, 1, 3)); // 00:00 BR = 03:00 UTC
  const fimMes = new Date(Date.UTC(mes === 12 ? ano + 1 : ano, mes === 12 ? 0 : mes, 1, 3));
  const inicioMesDate = `${monthKey}-01`;
  const fimMesDate = new Date(fimMes.getTime() - 86_400_000).toISOString().slice(0, 10);

  const [{ data: sessions }, { data: reminders }] = await Promise.all([
    supabase
      .from("training_sessions")
      .select(
        "id, title, start_at, end_at, status, color, students:student_id (profiles:profile_id (name))"
      )
      .gte("start_at", inicioMes.toISOString())
      .lt("start_at", fimMes.toISOString())
      .order("start_at")
      .limit(2000),
    supabase
      .from("agenda_reminders")
      .select("id, title, start_date, end_date")
      .lte("start_date", fimMesDate)
      .gte("end_date", inicioMesDate),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Agenda</h1>
      <WeekAgenda
        initial={{
          monthKey,
          sessions: (sessions as any) ?? [],
          reminders: (reminders as any) ?? [],
        }}
      />
    </div>
  );
}
