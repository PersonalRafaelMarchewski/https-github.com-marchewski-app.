"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function TrainingCalendar({ trainedDates }: { trainedDates: string[] }) {
  const trainedSet = useMemo(() => new Set(trainedDates), [trainedDates]);

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
  }

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

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="text-xs font-medium text-blue">
            {d}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = toDateKey(year, month, day);
          const trained = trainedSet.has(key);
          const isToday = key === todayKey;

          return (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center rounded-lg text-xs ${
                trained ? "bg-orange font-semibold text-white" : "bg-lightblue/10 text-navy"
              } ${isToday ? "ring-2 ring-navy ring-offset-1" : ""}`}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-blue">
        <span className="h-3 w-3 rounded bg-orange" />
        Dia treinado
      </div>
    </div>
  );
}
