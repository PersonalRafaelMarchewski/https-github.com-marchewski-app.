"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, UserCheck, Check, CircleAlert, MessageCircle } from "lucide-react";
import Card from "@/components/Card";

type StudentRow = {
  id: string;
  name: string;
  serviceType: "assessoria" | "personal";
  feeCents?: number | null;
  dueDay?: number | null;
  phone?: string | null;
};

// wa.me exige DDI+DDD+numero só com dígitos — telefone salvo costuma vir
// como "(15) 99161-6955"; sem DDI, assume Brasil (55)
function whatsappUrl(phone: string, message: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
// receitas ligadas a um aluno (lançamento manual OU pagamento Stripe)
type IncomeEvent = { studentId: string; date: string; amountCents: number };

const MONTH_LABELS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// "Quem pagou no mês": botão dentro do Financeiro que abre a lista de
// alunos ativos separados em Assessoria e Personal, cada um marcado como
// pago (com valor e dia) ou pendente no mês escolhido. Considera "pago"
// quem tem receita ligada a ele no mês — lançamento manual com aluno
// selecionado ou pagamento via Stripe.
export default function MonthlyPaymentsPanel({
  students,
  events,
}: {
  students: StudentRow[];
  events: IncomeEvent[];
}) {
  const [open, setOpen] = useState(false);
  // 0 = mês atual; 1 = mês passado... (limite de 5 pra trás — a página só
  // carrega 6 meses de lançamentos)
  const [monthsBack, setMonthsBack] = useState(0);

  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const targetKey = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;

  const { groups, paidCount, totalCount } = useMemo(() => {
    const paidByStudent = new Map<string, { totalCents: number; lastDay: number }>();
    for (const ev of events) {
      if (!ev.date.startsWith(targetKey)) continue;
      const cur = paidByStudent.get(ev.studentId) ?? { totalCents: 0, lastDay: 0 };
      cur.totalCents += ev.amountCents;
      cur.lastDay = Math.max(cur.lastDay, Number(ev.date.slice(8, 10)));
      paidByStudent.set(ev.studentId, cur);
    }

    const build = (serviceType: StudentRow["serviceType"]) => {
      const list = students
        .filter((s) => s.serviceType === serviceType)
        .map((s) => ({ ...s, paid: paidByStudent.get(s.id) ?? null }))
        .sort((a, b) => {
          // pendentes primeiro (são a ação a tomar), depois por nome
          if (!!a.paid !== !!b.paid) return a.paid ? 1 : -1;
          return a.name.localeCompare(b.name);
        });
      return { list, paid: list.filter((s) => s.paid).length };
    };

    const assessoria = build("assessoria");
    const personal = build("personal");
    return {
      groups: [
        { label: "Assessoria", ...assessoria },
        { label: "Personal", ...personal },
      ],
      paidCount: assessoria.paid + personal.paid,
      totalCount: students.length,
    };
  }, [students, events, targetKey]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-lightblue/50 bg-white px-3 py-1.5 text-sm font-medium text-navy hover:bg-lightblue/10"
      >
        <UserCheck size={16} className="text-orange" />
        Quem pagou no mês
      </button>
    );
  }

  return (
    <Card className="w-full space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <UserCheck size={18} className="flex-none text-orange" />
        <h2 className="font-heading font-semibold text-navy">Quem pagou no mês</h2>
        <span className="rounded-full bg-lightblue/15 px-2.5 py-0.5 text-xs font-medium text-blue">
          {paidCount} de {totalCount} pagaram
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto text-sm text-blue hover:underline"
        >
          Fechar
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMonthsBack((m) => Math.min(5, m + 1))}
          disabled={monthsBack >= 5}
          className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20 disabled:opacity-30"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="min-w-[150px] text-center font-heading text-sm font-semibold capitalize text-navy">
          {MONTH_LABELS[target.getMonth()]} de {target.getFullYear()}
        </p>
        <button
          type="button"
          onClick={() => setMonthsBack((m) => Math.max(0, m - 1))}
          disabled={monthsBack <= 0}
          className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20 disabled:opacity-30"
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.label} className="space-y-2">
            <p className="font-heading text-sm font-semibold text-navy">
              {g.label}{" "}
              <span className="font-body text-xs font-normal text-blue">
                — {g.paid}/{g.list.length} pagaram
              </span>
            </p>
            {g.list.length === 0 ? (
              <p className="text-sm text-blue">Nenhum aluno ativo nesse grupo.</p>
            ) : (
              <ul className="space-y-1">
                {g.list.map((s) => (
                  <li
                    key={s.id}
                    className={`flex items-baseline justify-between gap-2 rounded-lg px-3 py-1.5 text-sm ${
                      s.paid ? "bg-lightblue/10 text-navy" : "bg-orange/10 text-navy"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      {s.paid ? (
                        <Check size={14} strokeWidth={3} className="flex-none text-blue" />
                      ) : (
                        <CircleAlert size={14} className="flex-none text-orange" />
                      )}
                      <a href={`/alunos/${s.id}`} className="truncate hover:underline">
                        {s.name}
                      </a>
                    </span>
                    {s.paid ? (
                      <span className="flex-none text-xs text-blue">
                        {brl(s.paid.totalCents)} · dia {s.paid.lastDay}
                      </span>
                    ) : (
                      <span className="flex flex-none items-center gap-1.5 text-xs">
                        <span className="font-semibold text-orange">
                          {(() => {
                            const partes: string[] = [];
                            if (s.feeCents) partes.push(brl(s.feeCents));
                            if (s.dueDay) {
                              const atrasado = monthsBack === 0 && now.getDate() > s.dueDay;
                              partes.push(atrasado ? `atrasado (dia ${s.dueDay})` : `vence dia ${s.dueDay}`);
                            }
                            return partes.length ? partes.join(" · ") : "pendente";
                          })()}
                        </span>
                        {s.phone && (
                          <a
                            href={whatsappUrl(
                              s.phone,
                              `Oi ${s.name.split(" ")[0]}! Tudo bem? 💪 Passando pra lembrar da mensalidade de ${MONTH_LABELS[target.getMonth()]}${s.feeCents ? ` (${brl(s.feeCents)})` : ""}${s.dueDay ? `, vencimento dia ${s.dueDay}` : ""}. Qualquer coisa me chama!`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Cobrar ${s.name} no WhatsApp`}
                            title="Cobrar no WhatsApp"
                            className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#25D366] text-white hover:brightness-110"
                          >
                            <MessageCircle size={13} />
                          </a>
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-blue">
        Conta como pago quem tem receita ligada a ele no mês — lançamento manual com o aluno
        selecionado ou pagamento via Stripe. Recebeu por fora? Lança a receita escolhendo o
        aluno que ele aparece aqui como pago.
      </p>
    </Card>
  );
}
