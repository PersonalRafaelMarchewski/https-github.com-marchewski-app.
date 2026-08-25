import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import Card from "@/components/Card";
import { todayInBrazil } from "@/lib/date";
import { daysUntil, formatDueLabel } from "@/lib/dueDate";

// Aba "Avaliação física": todos os alunos ativos separados em Personal e
// Assessoria, cada um com a última avaliação (data e peso), a situação da
// reavaliação (vencida / agendada / sem próxima / nunca avaliado) e o
// atalho de nova avaliação — o controle que antes exigia entrar aluno por
// aluno pra descobrir quem estava devendo.
export default async function AvaliacoesPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: students } = await supabase
    .from("students")
    .select("id, service_type, profiles:profile_id (name)")
    .eq("trainer_id", user!.id)
    .eq("status", "active");

  const ids = (students ?? []).map((s: any) => s.id);
  const { data: evaluations } = ids.length
    ? await supabase
        .from("evaluations")
        .select("student_id, date, weight, next_assessment_date")
        .in("student_id", ids)
        .order("date", { ascending: false })
        .limit(1000)
    : { data: [] as any[] };

  // avaliação mais recente de cada aluno (a query vem ordenada por data)
  const latestByStudent = new Map<string, any>();
  for (const ev of (evaluations ?? []) as any[]) {
    if (!latestByStudent.has(ev.student_id)) latestByStudent.set(ev.student_id, ev);
  }

  const today = todayInBrazil();

  type Row = {
    id: string;
    name: string;
    serviceType: "personal" | "assessoria";
    last: { date: string; weight: number | null } | null;
    next: string | null;
    // ordem de urgência: 0 vencida · 1 nunca avaliado · 2 sem próxima · 3 agendada
    urgency: number;
  };

  const rows: Row[] = (students ?? []).map((s: any) => {
    const ev = latestByStudent.get(s.id) ?? null;
    const next = ev?.next_assessment_date ?? null;
    const urgency = !ev ? 1 : next && next <= today ? 0 : next ? 3 : 2;
    return {
      id: s.id,
      name: s.profiles?.name ?? "Aluno",
      serviceType: s.service_type === "personal" ? "personal" : "assessoria",
      last: ev ? { date: ev.date, weight: ev.weight ?? null } : null,
      next,
      urgency,
    };
  });

  const groups = (["personal", "assessoria"] as const).map((tipo) => ({
    tipo,
    label: tipo === "personal" ? "Personal" : "Assessoria",
    list: rows
      .filter((r) => r.serviceType === tipo)
      .sort((a, b) => a.urgency - b.urgency || (a.next ?? "9999").localeCompare(b.next ?? "9999") || a.name.localeCompare(b.name)),
  }));

  const fmt = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

  function StatusBadge({ r }: { r: Row }) {
    if (r.urgency === 0)
      return (
        <span className="rounded-full bg-orange/15 px-2.5 py-0.5 text-[11px] font-semibold text-orange">
          reavaliar — {formatDueLabel(daysUntil(r.next!)).toLowerCase()}
        </span>
      );
    if (r.urgency === 1)
      return (
        <span className="rounded-full bg-orange/15 px-2.5 py-0.5 text-[11px] font-semibold text-orange">
          nunca avaliado
        </span>
      );
    if (r.urgency === 2)
      return (
        <span className="rounded-full bg-lightblue/20 px-2.5 py-0.5 text-[11px] font-medium text-blue">
          sem próxima marcada
        </span>
      );
    return (
      <span className="rounded-full bg-lightblue/15 px-2.5 py-0.5 text-[11px] font-medium text-blue">
        agendada {fmt(r.next!)}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardList size={24} className="flex-none text-orange" />
        <h1 className="text-2xl font-bold text-navy">Avaliação física</h1>
      </div>
      <p className="-mt-4 text-sm text-blue">
        Vencidas e nunca avaliados aparecem primeiro. Toca no nome pra abrir o aluno, no + pra
        avaliar agora.
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {groups.map((g) => (
          <div key={g.tipo}>
            <h2 className="mb-3 font-heading font-semibold text-navy">
              {g.label}{" "}
              <span className="font-body text-xs font-normal text-blue">
                — {g.list.filter((r) => r.urgency <= 1).length} pra avaliar de {g.list.length}
              </span>
            </h2>
            {g.list.length === 0 ? (
              <Card className="text-blue">Nenhum aluno ativo nesse grupo.</Card>
            ) : (
              <div className="space-y-2">
                {g.list.map((r) => (
                  <Card
                    key={r.id}
                    className={`flex items-center gap-3 !py-3 ${r.urgency <= 1 ? "border-l-4 border-l-orange" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/alunos/${r.id}`}
                        className="block truncate font-medium text-navy hover:underline"
                      >
                        {r.name}
                      </Link>
                      <p className="text-xs text-blue">
                        {r.last
                          ? `última: ${fmt(r.last.date)}${r.last.weight ? ` · ${r.last.weight}kg` : ""}`
                          : "sem avaliação registrada"}
                      </p>
                    </div>
                    <StatusBadge r={r} />
                    <Link
                      href={`/alunos/${r.id}/avaliacoes/novo`}
                      aria-label={`Nova avaliação de ${r.name}`}
                      title="Nova avaliação"
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-orange text-white hover:bg-orange2"
                    >
                      <Plus size={16} />
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
