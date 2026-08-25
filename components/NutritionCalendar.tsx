"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Macros } from "@/lib/nutrition";

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateLabel(key: string) {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

export type DayItem = {
  label: string; // ex: "Café da manhã" (prescrito) ou "13:40" (diário livre)
  source: "prescrito" | "diario";
  foods: string[]; // ex: ["Arroz tipo 1 cozido — 150g", ...]
  // ordem de exibição no dia: refeições prescritas usam o order_index do
  // plano (café da manhã primeiro), diário livre entra depois por horário
  sortKey?: number;
};

type Targets = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

// Barra "consumido/meta" pra um macro — mesma lógica do resumo do
// aluno (NutritionSummaryBar), mas com o visual do trainer (Card branco,
// sem o tom StudentCard) pra ficar consistente com o resto de /dietas.
function MacroBar({ label, unit, value, target }: { label: string; unit: string; value: number; target: number | null }) {
  if (target == null) {
    return (
      <div className="min-w-0 rounded-lg bg-lightblue/10 px-3 py-2">
        <p className="text-xs font-medium text-navy">{label}</p>
        <p className="truncate text-sm text-blue">{value}{unit}</p>
      </div>
    );
  }
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const over = value > target;
  return (
    <div className="min-w-0 rounded-lg bg-lightblue/10 px-3 py-2">
      <p className="text-xs font-medium text-navy">{label}</p>
      <p className="text-sm text-blue">
        {value}/{target}{unit}
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-lightblue/20">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-orange2" : "bg-gradient-to-r from-orange to-orange2"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Calendário do "recordatório" — mostra os dias em que o aluno registrou
// algo (refeição prescrita marcada como feita + diário livre), e ao tocar
// no dia detalha kcal/macros consumidos contra a meta do plano, com o que
// foi comido. Mesmo esqueleto visual do TrainingCalendar (treino), pra
// manter os dois calendários do app parecidos.
export default function NutritionCalendar({
  macrosByDate,
  itemsByDate,
  targets,
}: {
  macrosByDate: Record<string, Macros>;
  itemsByDate: Record<string, DayItem[]>;
  targets: Targets;
}) {
  const loggedSet = useMemo(() => new Set(Object.keys(macrosByDate)), [macrosByDate]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function changeMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1));
    setSelectedDate(null);
  }

  const hasAnyTarget = targets.calories != null || targets.protein != null || targets.carbs != null || targets.fat != null;
  const selectedMacros = selectedDate ? macrosByDate[selectedDate] : null;
  const selectedItems = selectedDate
    ? [...(itemsByDate[selectedDate] ?? [])].sort(
        (a, b) => (a.sortKey ?? 9999) - (b.sortKey ?? 9999)
      )
    : [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="font-heading text-sm font-semibold text-navy">
          {MONTH_LABELS[month]} {year}
        </p>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20"
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="text-xs font-medium text-blue">
            {d}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = toDateKey(year, month, day);
          const logged = loggedSet.has(key);
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;

          const className = `flex aspect-square items-center justify-center rounded-lg text-xs transition-all ${
            logged ? "bg-orange font-semibold text-white" : "bg-lightblue/10 text-navy"
          } ${isToday ? "ring-2 ring-navy ring-offset-1" : ""} ${isSelected ? "ring-2 ring-navy ring-offset-1" : ""}`;

          if (!logged) {
            return (
              <div key={i} className={className}>
                {day}
              </div>
            );
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDate(isSelected ? null : key)}
              className={`${className} cursor-pointer hover:opacity-90`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-blue">
        <span className="h-3 w-3 rounded bg-orange" />
        Dia com registro — toque pra ver o que foi comido
      </div>

      {selectedDate && (
        <div className="mt-4 rounded-lg border border-lightblue/30 bg-lightblue/5 p-3">
          <p className="mb-2 text-xs font-semibold text-navy">Recordatório de {formatDateLabel(selectedDate)}</p>

          {!selectedMacros ? (
            <p className="text-xs text-blue">Nada registrado nesse dia.</p>
          ) : (
            <>
              {hasAnyTarget ? (
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MacroBar label="Calorias" unit="kcal" value={selectedMacros.calories} target={targets.calories} />
                  <MacroBar label="Proteína" unit="g" value={selectedMacros.protein} target={targets.protein} />
                  <MacroBar label="Carbo" unit="g" value={selectedMacros.carbs} target={targets.carbs} />
                  <MacroBar label="Gordura" unit="g" value={selectedMacros.fat} target={targets.fat} />
                </div>
              ) : (
                <p className="mb-3 text-sm text-navy">
                  {selectedMacros.calories} kcal · {selectedMacros.protein}g proteína · {selectedMacros.carbs}g carbo ·{" "}
                  {selectedMacros.fat}g gordura
                </p>
              )}

              {selectedItems.length === 0 ? (
                <p className="text-xs text-blue">Sem detalhamento do que foi comido nesse dia.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedItems.map((item, idx) => (
                    <div key={idx} className="rounded-lg bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-navy">{item.label}</span>
                        <span
                          className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            item.source === "prescrito" ? "bg-navy/10 text-navy" : "bg-orange/10 text-orange2"
                          }`}
                        >
                          {item.source === "prescrito" ? "prescrito" : "diário livre"}
                        </span>
                      </div>
                      {item.foods.length > 0 && (
                        <p className="mt-0.5 text-xs text-blue">{item.foods.join(" · ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
