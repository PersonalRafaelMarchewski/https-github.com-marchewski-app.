import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/financeCategories";
import FinanceDashboard from "@/components/FinanceDashboard";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABELS = [
  "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez",
];

function asBusiness(v: unknown): Business {
  return v === "personal" ? "personal" : "assessoria";
}

export default async function FinancasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  // janela dos últimos 6 meses (incluindo o atual) pro gráfico
  const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [entriesRes, paymentsRes, settingsRes, studentsRes, latePaymentsRes] = await Promise.all([
    supabase
      .from("finance_entries")
      .select(
        "id, type, category, description, amount_cents, entry_date, student_id, business, students:student_id (profiles:profile_id (name))"
      )
      .gte("entry_date", chartStart.toISOString().slice(0, 10))
      .order("entry_date", { ascending: false }),
    supabase
      .from("payments")
      .select(
        "id, amount_cents, paid_at, status, student_id, students:student_id (service_type, profiles:profile_id (name))"
      )
      .in("status", ["paid", "active"])
      .gte("paid_at", chartStart.toISOString())
      .order("paid_at", { ascending: false }),
    supabase
      .from("finance_settings")
      .select("assessoria_goal_cents, personal_goal_cents")
      .eq("trainer_id", user!.id)
      .maybeSingle(),
    supabase
      .from("students")
      .select("id, service_type, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .eq("status", "active"),
    supabase
      .from("students")
      .select("id, subscription_status, service_type, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .in("subscription_status", ["past_due", "unpaid", "incomplete_expired"]),
  ]);

  const entries = (entriesRes.data as any[]) ?? [];
  const payments = (paymentsRes.data as any[]) ?? [];
  const goals = {
    assessoria: settingsRes.data?.assessoria_goal_cents ? settingsRes.data.assessoria_goal_cents / 100 : null,
    personal: settingsRes.data?.personal_goal_cents ? settingsRes.data.personal_goal_cents / 100 : null,
  };
  const studentOptions = (studentsRes.data ?? []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.name ?? "Aluno sem nome",
    serviceType: asBusiness(s.service_type),
  }));
  const lateStudents = (latePaymentsRes.data ?? []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.name ?? "Aluno sem nome",
    status: s.subscription_status as string,
    business: asBusiness(s.service_type),
  }));

  // soma lançamentos manuais + pagamentos Stripe já pagos, mês a mês e por
  // negócio (assessoria/personal), pros últimos 6 meses (gráfico) e
  // separadamente pro mês atual (resumo).
  const monthlyTotals = new Map<string, { income: number; expense: number }>();
  function addTotal(monthK: string, business: Business, type: "income" | "expense", cents: number) {
    const key = `${monthK}|${business}`;
    const cur = monthlyTotals.get(key) ?? { income: 0, expense: 0 };
    if (type === "income") cur.income += cents;
    else cur.expense += cents;
    monthlyTotals.set(key, cur);
  }
  for (const e of entries) {
    addTotal(monthKey(new Date(`${e.entry_date}T12:00:00`)), asBusiness(e.business), e.type, e.amount_cents);
  }
  for (const p of payments) {
    if (!p.paid_at) continue;
    addTotal(monthKey(new Date(p.paid_at)), asBusiness(p.students?.service_type), "income", p.amount_cents);
  }

  function totalsFor(monthK: string, business: Business) {
    return monthlyTotals.get(`${monthK}|${business}`) ?? { income: 0, expense: 0 };
  }

  const chartMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = monthKey(d);
    return {
      label: MONTH_LABELS[d.getMonth()],
      assessoria: totalsFor(key, "assessoria"),
      personal: totalsFor(key, "personal"),
    };
  });

  const currentMonthKey = monthKey(now);
  const currentTotals = {
    assessoria: totalsFor(currentMonthKey, "assessoria"),
    personal: totalsFor(currentMonthKey, "personal"),
  };

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
      studentId: e.student_id as string | null,
      studentName: e.students?.profiles?.name ?? null,
      business: asBusiness(e.business),
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
        studentId: null,
        studentName: p.students?.profiles?.name ?? null,
        business: asBusiness(p.students?.service_type),
      })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Finanças</h1>
      <FinanceDashboard
        currentTotals={currentTotals}
        chartMonths={chartMonths}
        goals={goals}
        listItems={listItems}
        lateStudents={lateStudents}
        studentOptions={studentOptions}
      />
    </div>
  );
}
