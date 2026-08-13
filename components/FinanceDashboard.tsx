"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import Card from "@/components/Card";
import { centsToBRL, type Business } from "@/lib/financeCategories";
import FinanceEntryForm from "@/components/FinanceEntryForm";
import FinanceEntryList from "@/components/FinanceEntryList";
import FinanceGoalForm from "@/components/FinanceGoalForm";
import FinanceChart from "@/components/FinanceChart";

type Totals = { income: number; expense: number };

type ChartMonth = { label: string; assessoria: Totals; personal: Totals };

type EntryItem = {
  id: string;
  kind: "manual" | "stripe";
  type: "income" | "expense";
  category: string;
  description: string | null;
  amountCents: number;
  date: string;
  studentId: string | null;
  studentName: string | null;
  business: Business;
};

type LateStudent = { id: string; name: string; status: string; business: Business };

type StudentOption = { id: string; name: string; serviceType: Business };

const TABS: { value: "tudo" | Business; label: string }[] = [
  { value: "tudo", label: "Tudo" },
  { value: "assessoria", label: "Assessoria" },
  { value: "personal", label: "Personal" },
];

function addTotals(a: Totals, b: Totals): Totals {
  return { income: a.income + b.income, expense: a.expense + b.expense };
}

export default function FinanceDashboard({
  currentTotals,
  chartMonths,
  goals,
  listItems,
  lateStudents,
  studentOptions,
}: {
  currentTotals: { assessoria: Totals; personal: Totals };
  chartMonths: ChartMonth[];
  goals: { assessoria: number | null; personal: number | null }; // em reais
  listItems: EntryItem[];
  lateStudents: LateStudent[];
  studentOptions: StudentOption[];
}) {
  const [tab, setTab] = useState<"tudo" | Business>("tudo");

  const totals = useMemo(() => {
    if (tab === "tudo") return addTotals(currentTotals.assessoria, currentTotals.personal);
    return currentTotals[tab];
  }, [tab, currentTotals]);

  const balance = totals.income - totals.expense;

  const goalReais =
    tab === "tudo"
      ? (goals.assessoria ?? 0) + (goals.personal ?? 0) || null
      : goals[tab];
  const goalProgress =
    goalReais && goalReais > 0 ? Math.min(100, Math.round((totals.income / 100 / goalReais) * 100)) : null;

  const chartData = useMemo(
    () =>
      chartMonths.map((m) => ({
        label: m.label,
        income: tab === "tudo" ? m.assessoria.income + m.personal.income : m[tab].income,
        expense: tab === "tudo" ? m.assessoria.expense + m.personal.expense : m[tab].expense,
      })),
    [chartMonths, tab]
  );

  const filteredItems = tab === "tudo" ? listItems : listItems.filter((i) => i.business === tab);
  const filteredLateStudents = tab === "tudo" ? lateStudents : lateStudents.filter((s) => s.business === tab);
  const defaultBusiness: Business = tab === "personal" ? "personal" : "assessoria";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              tab === t.value ? "bg-navy text-white" : "bg-lightblue/15 text-blue hover:bg-lightblue/25"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Cor com significado: verde = entrando, laranja = saindo (mesma
          leitura que "Lançamentos recentes" já usa pro +/- de cada item),
          navy só quando não há sinal claro (saldo zerado). Antes os 4
          cards eram todos navy chapado — dava pra ler o número, mas não
          pra bater o olho e já saber se o mês tá indo bem. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3">
          <p className="flex items-center gap-1 text-xs text-blue">
            <TrendingUp size={13} className="text-[#1f9d6b]" />
            Faturamento do mês
          </p>
          <p className="mt-1 text-lg font-bold text-[#1f9d6b]">{centsToBRL(totals.income)}</p>
        </Card>
        <Card className="p-3">
          <p className="flex items-center gap-1 text-xs text-blue">
            <TrendingDown size={13} className="text-orange" />
            Despesas do mês
          </p>
          <p className="mt-1 text-lg font-bold text-orange">{centsToBRL(totals.expense)}</p>
        </Card>
        <Card className="p-3">
          <p className="flex items-center gap-1 text-xs text-blue">
            {balance > 0 ? (
              <TrendingUp size={13} className="text-[#1f9d6b]" />
            ) : balance < 0 ? (
              <TrendingDown size={13} className="text-orange" />
            ) : (
              <Minus size={13} className="text-blue" />
            )}
            Saldo do mês
          </p>
          <p
            className={`mt-1 text-lg font-bold ${
              balance > 0 ? "text-[#1f9d6b]" : balance < 0 ? "text-orange" : "text-navy"
            }`}
          >
            {centsToBRL(balance)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="flex items-center gap-1 text-xs text-blue">
            <Target size={13} className="text-navy" />
            Meta do mês
          </p>
          {goalProgress !== null ? (
            <>
              <p className="mt-1 text-lg font-bold text-navy">{goalProgress}%</p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-lightblue/20">
                <div className="h-1.5 rounded-full bg-orange" style={{ width: `${goalProgress}%` }} />
              </div>
            </>
          ) : (
            <p className="mt-1 text-xs text-blue">Sem meta definida</p>
          )}
        </Card>
      </div>

      <Card className="space-y-3">
        {tab !== "personal" && (
          <FinanceGoalForm business="assessoria" label="Assessoria" currentGoalReais={goals.assessoria} />
        )}
        {tab !== "assessoria" && (
          <FinanceGoalForm business="personal" label="Personal" currentGoalReais={goals.personal} />
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-heading text-sm font-semibold text-navy">Últimos 6 meses</h2>
        <FinanceChart months={chartData} />
      </Card>

      {filteredLateStudents.length > 0 && (
        <div className="rounded-xl border border-orange/40 bg-peach/20 p-5 shadow-sm">
          <h2 className="mb-2 font-heading text-sm font-semibold text-navy">Alunos em atraso</h2>
          <ul className="space-y-1 text-sm text-navy">
            {filteredLateStudents.map((s) => (
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
        <FinanceEntryForm students={studentOptions} defaultBusiness={defaultBusiness} />
      </Card>

      <Card>
        <h2 className="mb-3 font-heading text-sm font-semibold text-navy">Lançamentos recentes</h2>
        <FinanceEntryList items={filteredItems} students={studentOptions} showBusinessTag={tab === "tudo"} />
      </Card>
    </div>
  );
}
