"use client";

import { centsToBRL } from "@/lib/financeCategories";

const WIDTH = 600;
const HEIGHT = 220;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;

const INCOME_COLOR = "#1F2556"; // navy
const EXPENSE_COLOR = "#ED5B35"; // orange

type MonthTotal = { label: string; income: number; expense: number };

export default function FinanceChart({ months }: { months: MonthTotal[] }) {
  const maxValue = Math.max(...months.flatMap((m) => [m.income, m.expense]), 1);
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const groupWidth = plotWidth / months.length;
  const barWidth = Math.min(22, groupWidth * 0.32);

  const y = (v: number) => PAD_TOP + (1 - v / maxValue) * plotHeight;
  const barHeight = (v: number) => (v / maxValue) * plotHeight;

  const allZero = months.every((m) => m.income === 0 && m.expense === 0);

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        {[0, 0.5, 1].map((f, i) => (
          <line
            key={i}
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={PAD_TOP + (1 - f) * plotHeight}
            y2={PAD_TOP + (1 - f) * plotHeight}
            stroke="#8499CC"
            strokeOpacity={0.2}
            strokeWidth={1}
          />
        ))}

        {months.map((m, i) => {
          const groupCenter = PAD_LEFT + groupWidth * (i + 0.5);
          return (
            <g key={i}>
              <rect
                x={groupCenter - barWidth - 2}
                y={y(m.income)}
                width={barWidth}
                height={Math.max(0, barHeight(m.income))}
                rx={2}
                fill={INCOME_COLOR}
              />
              <rect
                x={groupCenter + 2}
                y={y(m.expense)}
                width={barWidth}
                height={Math.max(0, barHeight(m.expense))}
                rx={2}
                fill={EXPENSE_COLOR}
              />
              <text
                x={groupCenter}
                y={HEIGHT - 6}
                textAnchor="middle"
                className="fill-blue text-[9px] capitalize"
              >
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>

      {allZero && (
        <p className="mt-1 text-center text-xs text-blue">Ainda sem lançamentos nesse período.</p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-navy">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INCOME_COLOR }} />
          Receita
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: EXPENSE_COLOR }} />
          Despesa
        </div>
      </div>

      <p className="mt-2 text-xs text-blue">
        Total no período: receita {centsToBRL(months.reduce((s, m) => s + m.income, 0))} · despesa{" "}
        {centsToBRL(months.reduce((s, m) => s + m.expense, 0))}
      </p>
    </div>
  );
}
