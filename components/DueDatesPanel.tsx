"use client";

import { useMemo, useState } from "react";
import { CalendarClock, MessageCircle, Check, CircleAlert } from "lucide-react";
import Card from "@/components/Card";
import { daysUntil, formatDueLabel } from "@/lib/dueDate";

type StudentRow = {
  id: string;
  name: string;
  serviceType: "assessoria" | "personal";
  feeCents?: number | null;
  dueDay?: number | null;
  phone?: string | null;
};
type IncomeEvent = { studentId: string; date: string; amountCents: number };

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// mesmo helper do painel de pagamentos: wa.me só com dígitos, DDI 55 implícito
function whatsappUrl(phone: string, message: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// Vencimentos: a janela da semana (quem vence nos próximos 7 dias +
// atrasados do mês) em destaque, e a lista completa dos alunos pagantes
// ordenada pelo dia de vencimento. Considera "pago no mês" a mesma regra
// do painel de pagamentos: receita ligada ao aluno no mês corrente.
export default function DueDatesPanel({
  students,
  events,
}: {
  students: StudentRow[];
  events: IncomeEvent[];
}) {
  const [open, setOpen] = useState(false);

  const { semana, comVencimento, semVencimento } = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const paid = new Set(events.filter((e) => e.date.startsWith(monthKey)).map((e) => e.studentId));

    type Row = StudentRow & {
      paid: boolean;
      dueDateStr: string | null;
      days: number | null; // negativos = atrasado
    };

    const rows: Row[] = students.map((s) => {
      if (!s.dueDay) return { ...s, paid: paid.has(s.id), dueDateStr: null, days: null };
      const due = new Date(now.getFullYear(), now.getMonth(), s.dueDay);
      const dueStr = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(s.dueDay).padStart(2, "0")}`;
      return { ...s, paid: paid.has(s.id), dueDateStr: dueStr, days: daysUntil(dueStr) };
    });

    const comVenc = rows
      .filter((r) => r.dueDay)
      .sort((a, b) => (a.dueDay ?? 99) - (b.dueDay ?? 99));
    const semVenc = rows.filter((r) => !r.dueDay).sort((a, b) => a.name.localeCompare(b.name));

    // janela da semana: quem AINDA NÃO PAGOU o mês e vence nos próximos 7
    // dias — mais os atrasados, que são a ação mais urgente
    const sem = comVenc
      .filter((r) => !r.paid && r.days !== null && r.days <= 7)
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

    return { semana: sem, comVencimento: comVenc, semVencimento: semVenc };
  }, [students, events]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-lightblue/50 bg-white px-3 py-1.5 text-sm font-medium text-navy hover:bg-lightblue/10"
      >
        <CalendarClock size={16} className="text-orange" />
        Vencimentos
        {semana.length > 0 && (
          <span className="rounded-full bg-orange px-2 py-0.5 text-[11px] font-bold text-white">
            {semana.length}
          </span>
        )}
      </button>
    );
  }

  const cobrar = (s: StudentRow) =>
    whatsappUrl(
      s.phone!,
      `Oi ${s.name.split(" ")[0]}! Tudo bem? 💪 Passando pra lembrar da mensalidade${s.feeCents ? ` (${brl(s.feeCents)})` : ""}${s.dueDay ? `, vencimento dia ${s.dueDay}` : ""}. Qualquer coisa me chama!`
    );

  return (
    <Card className="w-full space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarClock size={18} className="flex-none text-orange" />
        <h2 className="font-heading font-semibold text-navy">Vencimentos</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto text-sm text-blue hover:underline"
        >
          Fechar
        </button>
      </div>

      {/* janela da semana */}
      <div className="rounded-xl border border-orange/40 bg-orange/5 p-3">
        <p className="mb-2 font-heading text-sm font-semibold text-navy">
          Esta semana{" "}
          <span className="font-body text-xs font-normal text-blue">
            — vencem nos próximos 7 dias ou já venceram, sem pagamento no mês
          </span>
        </p>
        {semana.length === 0 ? (
          <p className="text-sm text-blue">Ninguém vencendo esta semana. 🎉</p>
        ) : (
          <ul className="space-y-1">
            {semana.map((s) => (
              <li
                key={s.id}
                className="flex items-baseline justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-sm text-navy"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <CircleAlert size={14} className="flex-none text-orange" />
                  <a href={`/alunos/${s.id}`} className="truncate font-medium hover:underline">
                    {s.name}
                  </a>
                </span>
                <span className="flex flex-none items-center gap-1.5 text-xs">
                  <span className={`font-semibold ${s.days! < 0 ? "text-orange" : "text-navy"}`}>
                    {s.feeCents ? brl(s.feeCents) + " · " : ""}
                    {formatDueLabel(s.days!)}
                  </span>
                  {s.phone && (
                    <a
                      href={cobrar(s)}
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
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* todos os alunos */}
      <div>
        <p className="mb-2 font-heading text-sm font-semibold text-navy">
          Todos os alunos{" "}
          <span className="font-body text-xs font-normal text-blue">— pelo dia de vencimento</span>
        </p>
        <ul className="space-y-1">
          {comVencimento.map((s) => (
            <li
              key={s.id}
              className={`flex items-baseline justify-between gap-2 rounded-lg px-3 py-1.5 text-sm text-navy ${
                s.paid ? "bg-lightblue/10" : s.days! < 0 ? "bg-orange/10" : "bg-lightblue/5"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-12 flex-none font-heading text-xs font-bold text-blue">
                  dia {s.dueDay}
                </span>
                <a href={`/alunos/${s.id}`} className="truncate hover:underline">
                  {s.name}
                </a>
                <span className="flex-none rounded-full bg-lightblue/15 px-2 py-0.5 text-[10px] font-medium text-blue">
                  {s.serviceType === "personal" ? "Personal" : "Assessoria"}
                </span>
              </span>
              <span className="flex flex-none items-center gap-1.5 text-xs">
                {s.paid ? (
                  <span className="flex items-center gap-1 font-medium text-blue">
                    <Check size={13} strokeWidth={3} /> pago
                  </span>
                ) : (
                  <>
                    <span className={`font-semibold ${s.days! < 0 ? "text-orange" : "text-navy"}`}>
                      {s.feeCents ? brl(s.feeCents) + " · " : ""}
                      {formatDueLabel(s.days!)}
                    </span>
                    {s.phone && (
                      <a
                        href={cobrar(s)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Cobrar ${s.name} no WhatsApp`}
                        className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#25D366] text-white hover:brightness-110"
                      >
                        <MessageCircle size={13} />
                      </a>
                    )}
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>

        {semVencimento.length > 0 && (
          <p className="mt-3 text-xs text-blue">
            Sem vencimento definido:{" "}
            {semVencimento.map((s, i) => (
              <span key={s.id}>
                {i > 0 && " · "}
                <a href={`/alunos/${s.id}/editar`} className="underline hover:text-navy">
                  {s.name.split(" ")[0]}
                </a>
              </span>
            ))}{" "}
            — preenche na edição de cada um pra entrarem aqui.
          </p>
        )}
      </div>
    </Card>
  );
}
