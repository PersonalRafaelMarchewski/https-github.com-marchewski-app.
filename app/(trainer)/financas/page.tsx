import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import { centsToBRL } from "@/lib/financeCategories";
import FinanceEntryForm from "@/components/FinanceEntryForm";
import FinanceEntryList from "@/components/FinanceEntryList";
import FinanceGoalForm from "@/components/FinanceGoalForm";
import FinanceChart from "@/components/FinanceChart";

function monthRange(year: number, month: number) {
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 1),
  };
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABELS = [
  "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez",
];

export default async function FinancasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const { start: monthStart, end: monthEnd } = monthRange(now.getFullYear(), now.getMonth());
  // janela dos últimos 6 meses (incluindo o atual) pro gráfico
  const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [entriesRes, paymentsRes, settingsRes, studentsRes, latePaymentsRes] = await Promise.all([
    supabase
      .from("finance_entries")
      .select("id, type, category, description, amount_cents, entry_date, student_id, students:student_id (profiles:profile_id (name))")
      .gte("entry_date", chartStart.toISOString().slice(0, 10))
      .order("entry_date", { ascending: false }),
    supabase
      .from("payments")
      .select("id, amount_cents, paid_at, status, student_id, students:student_id (profiles:profile_id (name))")
      .in("status", ["paid", "active"])
      .gte("paid_at", chartStart.toISOString())
      .order("paid_at", { ascending: false }),
    supabase.from("finance_settings").select("monthly_goal_cents").eq("trainer_id", user!.id).maybeSingle(),
    supabase
      .from("students")
      .select("id, service_type, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .eq("status", "active"),
    supabase
      .from("students")
      .select("id, subscription_status, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .in("subscription_status", ["past_due", "unpaid", "incomplete_expired"]),
  ]);

  const entries = (entriesRes.data as any[]) ?? [];
  const payments = (paymentsRes.data as any[]) ?? [];
  const monthlyGoalCents = settingsRes.data?.monthly_goal_cents ?? null;
  const studentOptions = (studentsRes.data ?? []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.name ?? "Aluno sem nome",
  }));
  const lateStudents = (latePaymentsRes.data ?? []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.name ?? "Aluno sem nome",
    status: s.subscription_status as string,
  }));

  // soma lançamentos manuais + pagamentos Stripe já pagos, mês a mês, pros
  // últimos 6 meses (pro gráfico) e separadamente pro mês atual (resumo).
  const monthlyTotals = new Map<string, { income: number; expense: number }>();
  function addTotal(key: string, type: "income" | "expense", cents: number) {
    const cur = monthlyTotals.get(key) ?? { income: 0, expense: 0 };
    if (type === "income") cur.income += cents;
    else cur.expense += cents;
    monthlyTotals.set(key, cur);
  }
  for (const e of entries) {
    addTotal(monthKey(new Date(`${e.entry_date}T12:00:00`)), e.type, e.amount_cents);
  }
  for (const p of payments) {
    if (!p.paid_at) continue;
    addTotal(monthKey(new Date(p.paid_at)), "income", p.amount_cents);
  }

  const chartMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = monthKey(d);
    const totals = monthlyTotals.get(key) ?? { income: 0, expense: 0 };
    return { label: MONTH_LABELS[d.getMonth()], income: totals.income, expense: totals.expense };
  });

  const currentMonthKey = monthKey(now);
  const currentTotals = monthlyTotals.get(currentMonthKey) ?? { income: 0, expense: 0 };
  const balance = currentTotals.income - currentTotals.expense;
  const goalProgress =
    monthlyGoalCents && monthlyGoalCents > 0
      ? Math.min(100, Math.round((currentTotals.income / monthlyGoalCents) * 100))
      : null;

  // lista unificada de lançamentos recentes (manuais + pagamentos Stripe),
  // já ordenada por data
  const listItems = [
    ...entries.map((e) => ({
      id: e.id,
      kind: "manual" as const,
      type: e.type as "income" | "expense",
      category: e.category as string,
      description: e.description as string | null,
      amountCents: e.amount_cents as number,
      date: e.entry_date as string,
      studentName: e.students?.profiles?.name ?? null,
    })),
    ...payments
      .filter((p) => p.paid_at)
      .map((p) => ({
        id: p.id,
        kind: "stripe" as const,
        type: "income" as const,
        category: "Via Stripe",
        description: null,
        amountCents: p.amount_cents as number,
        date: String(p.paid_at).slice(0, 10),
        studentName: p.students?.profiles?.name ?? null,
      })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Finanças</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-blue">Faturamento do mês</p>
          <p className="mt-1 text-lg font-bold text-navy">{centsToBRL(currentTotals.income)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-blue">Despesas do mês</p>
          <p className="mt-1 text-lg font-bold text-navy">{centsToBRL(currentTotals.expense)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-blue">Saldo do mês</p>
          <p className={`mt-1 text-lg font-bold ${balance >= 0 ? "text-navy" : "text-orange"}`}>
            {centsToBRL(balance)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-blue">Meta do mês</p>
          {goalProgress !== null ? (
            <>
              <p className="mt-1 text-lg font-bold text-navy">{goalProgress}%</p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-lightblue/20">
                <div
                  className="h-1.5 rounded-full bg-orange"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            </>
          ) : (
            <p className="mt-1 text-xs text-blue">Sem meta definida</p>
          )}
        </Card>
      </div>

      <Card>
        <FinanceGoalForm currentGoalReais={monthlyGoalCents ? monthlyGoalCents / 100 : null} />
      </Card>

      <Card>
        <h2 className="mb-3 font-heading text-sm font-semibold text-navy">Últimos 6 meses</h2>
        <FinanceChart months={chartMonths} />
      </Card>

      {lateStudents.length > 0 && (
        <div className="rounded-xl border border-orange/40 bg-peach/20 p-5 shadow-sm">
          <h2 className="mb-2 font-heading text-sm font-semibold text-navy">Alunos em atraso</h2>
          <ul className="space-y-1 text-sm text-navy">
            {lateStudents.map((s) => (
              <li key={s.id}>
                <a href={`/alunos/${s.id}`} className="hover:underline">
                  {s.name}
                </a>{" "}
                <span className="text-xs text-orange">({s.status})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <h2 className="mb-3 font-heading text-sm font-semibold text-navy">Novo lançamento</h2>
        <FinanceEntryForm students={studentOptions} />
      </Card>

      <Card>
        <h2 className="mb-3 font-heading text-sm font-semibold text-navy">Lançamentos recentes</h2>
        <FinanceEntryList items={listItems} />
      </Card>
    </div>
  );
}
