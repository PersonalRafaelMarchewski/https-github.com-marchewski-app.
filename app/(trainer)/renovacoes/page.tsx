import Link from "next/link";
import { KanbanSquare, AlertTriangle } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import Card from "@/components/Card";
import SnoozeRenewalButton from "@/components/SnoozeRenewalButton";
import UnsnoozeRenewalButton from "@/components/UnsnoozeRenewalButton";
import { todayInBrazil } from "@/lib/date";
import { daysUntil, formatDueLabel } from "@/lib/dueDate";

// Painel de renovação — um quadro estilo Trello (colunas = urgência,
// cartões = alunos) pra saber quem precisa de ficha nova. Cada coluna é uma
// janela de tempo a partir do vencimento da ficha ATIVA mais próxima do
// aluno (menor end_date entre os treinos ativos dele); o alerta visual
// (laranja/vermelho) cobre os 7 dias antes do vencimento, como pedido.
// "Adiar 7 dias" tira o cartão do caminho sem precisar renovar agora —
// funciona como adiar um cartão no Trello, mas aqui é 100% automático:
// assim que uma ficha nova com vencimento mais distante é criada pro
// aluno, o cartão sai sozinho das colunas urgentes (nada de arrastar).
export default async function RenovacoesPage() {
  const supabase = await createClient();
  const user = await getAuthUser();
  const hoje = todayInBrazil();

  const [{ data: students }, { data: workouts }, { data: snoozes }] = await Promise.all([
    supabase
      .from("students")
      .select("id, service_type, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .eq("status", "active"),
    supabase
      .from("workouts")
      .select("student_id, name, end_date")
      .eq("trainer_id", user!.id)
      .eq("status", "active"),
    supabase.from("renewal_snoozes").select("student_id, snoozed_until").eq("trainer_id", user!.id),
  ]);

  const snoozeByStudent = new Map((snoozes ?? []).map((s: any) => [s.student_id, s.snoozed_until]));

  // menor end_date entre as fichas ativas de cada aluno — é a próxima vez
  // que ele fica sem treino se nada mudar
  const proximoVencimento = new Map<string, { end_date: string; fichas: string[] }>();
  for (const w of (workouts ?? []) as any[]) {
    const atual = proximoVencimento.get(w.student_id);
    if (!atual || w.end_date < atual.end_date) {
      proximoVencimento.set(w.student_id, { end_date: w.end_date, fichas: [w.name] });
    } else if (w.end_date === atual.end_date) {
      atual.fichas.push(w.name);
    }
  }

  type Card = {
    id: string;
    name: string;
    serviceType: "personal" | "assessoria";
    endDate: string | null;
    fichas: string[];
    days: number | null;
    snoozedUntil: string | null;
  };

  const cards: Card[] = (students ?? []).map((s: any) => {
    const info = proximoVencimento.get(s.id);
    return {
      id: s.id,
      name: s.profiles?.name ?? "Aluno",
      serviceType: s.service_type === "personal" ? "personal" : "assessoria",
      endDate: info?.end_date ?? null,
      fichas: info?.fichas ?? [],
      days: info ? daysUntil(info.end_date) : null,
      snoozedUntil: (snoozeByStudent.get(s.id) as string | undefined) ?? null,
    };
  });

  // domingo→sábado desta semana, no fuso do Brasil — mesma convenção da agenda
  const [ano, mes, dia] = hoje.split("-").map(Number);
  const inicioSemana = new Date(ano, mes - 1, dia);
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
  function limiteSemana(offset: number) {
    const d = new Date(inicioSemana);
    d.setDate(d.getDate() + offset * 7 + 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const fimSemana0 = limiteSemana(0); // sábado desta semana
  const fimSemana1 = limiteSemana(1); // sábado da semana que vem
  const fimSemana2 = limiteSemana(2); // sábado de daqui 2 semanas

  const adiadas: Card[] = [];
  const semFicha: Card[] = [];
  const vencidas: Card[] = [];
  const estaSemana: Card[] = [];
  const semanaQueVem: Card[] = [];
  const duasSemanas: Card[] = [];
  const depois: Card[] = [];

  for (const c of cards) {
    if (c.snoozedUntil && c.snoozedUntil >= hoje) {
      adiadas.push(c);
    } else if (!c.endDate) {
      semFicha.push(c);
    } else if (c.endDate < hoje) {
      vencidas.push(c);
    } else if (c.endDate <= fimSemana0) {
      estaSemana.push(c);
    } else if (c.endDate <= fimSemana1) {
      semanaQueVem.push(c);
    } else if (c.endDate <= fimSemana2) {
      duasSemanas.push(c);
    } else {
      depois.push(c);
    }
  }

  const byDate = (a: Card, b: Card) => (a.endDate ?? "").localeCompare(b.endDate ?? "") || a.name.localeCompare(b.name);
  [vencidas, estaSemana, semanaQueVem, duasSemanas, depois, adiadas].forEach((col) => col.sort(byDate));
  semFicha.sort((a, b) => a.name.localeCompare(b.name));

  const columns: { key: string; label: string; cards: Card[]; tone: "danger" | "warn" | "neutral" | "muted" }[] = [
    { key: "sem-ficha", label: "Sem ficha ativa", cards: semFicha, tone: "danger" },
    { key: "vencidas", label: "Vencidas", cards: vencidas, tone: "danger" },
    { key: "esta-semana", label: "Esta semana", cards: estaSemana, tone: "warn" },
    { key: "semana-vem", label: "Semana que vem", cards: semanaQueVem, tone: "neutral" },
    { key: "2-semanas", label: "Em 2 semanas", cards: duasSemanas, tone: "neutral" },
    { key: "depois", label: "Depois", cards: depois, tone: "neutral" },
    { key: "adiadas", label: "Adiadas", cards: adiadas, tone: "muted" },
  ];

  const toneStyles: Record<string, { header: string; badge: string }> = {
    danger: { header: "bg-[#B3261E]/10 text-[#B3261E]", badge: "bg-[#B3261E]/12 text-[#B3261E]" },
    warn: { header: "bg-orange/12 text-orange", badge: "bg-orange/15 text-orange" },
    neutral: { header: "bg-lightblue/15 text-navy", badge: "bg-lightblue/15 text-blue" },
    muted: { header: "bg-lightblue/10 text-blue", badge: "bg-lightblue/10 text-blue" },
  };

  const totalUrgente = semFicha.length + vencidas.length + estaSemana.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <KanbanSquare size={24} className="flex-none text-orange" />
        <h1 className="text-2xl font-bold text-navy">Renovações</h1>
      </div>
      <p className="-mt-4 text-sm text-blue">
        Um quadro por vencimento de ficha — quando o treino ativo mais próximo de vencer chega a 7
        dias, o card entra na zona de alerta. Tudo automático: assim que você criar a ficha nova pro
        aluno, o card some sozinho dessas colunas.
      </p>

      {totalUrgente > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-[#B3261E]/10 px-4 py-2.5 text-sm font-medium text-[#B3261E]">
          <AlertTriangle size={16} className="flex-none" />
          {totalUrgente} aluno{totalUrgente > 1 ? "s" : ""} precisando de atenção agora (sem ficha,
          vencida ou vencendo esta semana).
        </div>
      )}

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {columns.map((col) => {
            const tone = toneStyles[col.tone];
            return (
              <div key={col.key} className="w-64 flex-none">
                <div className={`mb-2 flex items-center justify-between rounded-lg px-3 py-1.5 ${tone.header}`}>
                  <span className="text-sm font-heading font-semibold">{col.label}</span>
                  <span className="text-xs font-semibold">{col.cards.length}</span>
                </div>
                <div className="space-y-2">
                  {col.cards.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-lightblue/40 px-3 py-4 text-center text-xs text-blue">
                      Vazio
                    </p>
                  ) : (
                    col.cards.map((c) => (
                      <Card key={c.id} className="!p-3 space-y-1.5">
                        <Link href={`/alunos/${c.id}`} className="block truncate font-medium text-navy hover:underline">
                          {c.name}
                        </Link>
                        <p className="text-[11px] text-blue">
                          {c.serviceType === "personal" ? "Personal" : "Assessoria"}
                          {c.fichas.length > 0 ? ` · ${c.fichas.join(", ")}` : ""}
                        </p>
                        {col.key === "sem-ficha" ? (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.badge}`}>
                            Nenhuma ficha ativa
                          </span>
                        ) : col.key === "adiadas" ? (
                          <span className="inline-block rounded-full bg-lightblue/10 px-2 py-0.5 text-[11px] font-medium text-blue">
                            Volta em {daysUntil(c.snoozedUntil as string)} dia
                            {daysUntil(c.snoozedUntil as string) === 1 ? "" : "s"}
                          </span>
                        ) : (
                          c.days != null && (
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.badge}`}>
                              {formatDueLabel(c.days)}
                            </span>
                          )
                        )}
                        <div className="flex items-center justify-between pt-1">
                          {col.key === "adiadas" ? (
                            <UnsnoozeRenewalButton studentId={c.id} />
                          ) : col.key !== "depois" ? (
                            <SnoozeRenewalButton studentId={c.id} studentName={c.name} />
                          ) : (
                            <span />
                          )}
                          <Link
                            href={`/alunos/${c.id}`}
                            className="text-[11px] font-semibold text-orange hover:underline"
                          >
                            Abrir
                          </Link>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
