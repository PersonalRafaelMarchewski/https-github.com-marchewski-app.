"use client";

import { formatTimeInBrazil } from "@/lib/date";
import { sumMacros } from "@/lib/nutrition";
import type { SavedDiaryEntry } from "@/components/student/DiaryEntryForm";

const WIDTH = 600;
const HEIGHT = 160;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;
const BAR_COLOR = "#ED5B35"; // orange — mesmo hue dos outros gráficos

// horário (no fuso do Brasil, não UTC do servidor) em que a entrada foi
// registrada — mesma classe de bug já corrigida antes nesta sessão
function hourInBrazil(iso: string): number {
  return Number(formatTimeInBrazil(iso).split(":")[0]);
}

// Calorias por hora do dia, pra ver em que horário a pessoa mais come —
// inspirado no gráfico "macros por horário" do app Alimente-se.
export default function MacroHourChart({ entries }: { entries: SavedDiaryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-center text-xs text-blue">Registra algo no diário pra ver o gráfico por horário.</p>;
  }

  const caloriesByHour = new Map<number, number>();
  for (const entry of entries) {
    const hour = hourInBrazil(entry.logged_at);
    const cals = sumMacros(entry.items).calories;
    caloriesByHour.set(hour, (caloriesByHour.get(hour) ?? 0) + cals);
  }

  const usedHours = [...caloriesByHour.keys()];
  const minHour = Math.max(0, Math.min(...usedHours) - 1);
  const maxHour = Math.min(23, Math.max(...usedHours) + 1);
  const hours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);

  const maxValue = Math.max(...hours.map((h) => caloriesByHour.get(h) ?? 0), 1);
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const groupWidth = plotWidth / hours.length;
  const barWidth = Math.min(20, groupWidth * 0.6);

  const y = (v: number) => PAD_TOP + (1 - v / maxValue) * plotHeight;
  const barHeight = (v: number) => (v / maxValue) * plotHeight;

  return (
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

      {hours.map((h, i) => {
        const value = caloriesByHour.get(h) ?? 0;
        const center = PAD_LEFT + groupWidth * (i + 0.5);
        return (
          <g key={h}>
            {value > 0 && (
              <rect
                x={center - barWidth / 2}
                y={y(value)}
                width={barWidth}
                height={Math.max(0, barHeight(value))}
                rx={3}
                fill={BAR_COLOR}
              />
            )}
            <text x={center} y={HEIGHT - 6} textAnchor="middle" className="fill-blue text-[9px]">
              {h}h
            </text>
          </g>
        );
      })}
    </svg>
  );
}
