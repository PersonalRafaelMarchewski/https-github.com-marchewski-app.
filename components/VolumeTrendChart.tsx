"use client";

import { useRef, useState } from "react";
import type { VolumeTrend } from "@/lib/volume";

// Mesma paleta de marca usada no resto do app (navy/blue/lightblue/orange/peach).
const COLORS = ["#ED5B35", "#1F2556", "#2F4599", "#8499CC", "#F3A888"];

const WIDTH = 600;
const HEIGHT = 220;
const PAD_LEFT = 28;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;

export default function VolumeTrendChart({ trend }: { trend: VolumeTrend }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const { weekLabels, series } = trend;

  if (weekLabels.length < 2 || series.length === 0) {
    return (
      <p className="text-sm text-blue">
        Ainda não há histórico suficiente pra mostrar a evolução do volume.
      </p>
    );
  }

  const maxValue = Math.max(...series.flatMap((s) => s.points), 1);
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const x = (i: number) => PAD_LEFT + (i / (weekLabels.length - 1)) * plotWidth;
  const y = (v: number) => PAD_TOP + (1 - v / maxValue) * plotHeight;

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    weekLabels.forEach((_, i) => {
      const dist = Math.abs(x(i) - relativeX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  return (
    <div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
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

          {weekLabels.map((label, i) => (
            <text
              key={i}
              x={x(i)}
              y={HEIGHT - 6}
              textAnchor="middle"
              className="fill-blue text-[9px]"
            >
              {label}
            </text>
          ))}

          {series.map((s, si) => {
            const color = COLORS[si % COLORS.length];
            const path = s.points.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
            return (
              <g key={s.muscleGroup}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {s.points.map((v, i) => (
                  <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={color} />
                ))}
              </g>
            );
          })}

          {hoverIndex !== null && (
            <line
              x1={x(hoverIndex)}
              x2={x(hoverIndex)}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="#1F2556"
              strokeOpacity={0.25}
              strokeWidth={1}
            />
          )}
        </svg>

        {hoverIndex !== null && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg bg-navy px-2 py-1.5 text-xs text-white shadow-lg"
            style={{
              left: `${(x(hoverIndex) / WIDTH) * 100}%`,
              transform:
                hoverIndex > weekLabels.length / 2
                  ? "translate(-100%, -8px)"
                  : "translate(4px, -8px)",
            }}
          >
            <p className="mb-0.5 font-semibold text-white/80">{weekLabels[hoverIndex]}</p>
            {series.map((s, si) => (
              <p key={s.muscleGroup} className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: COLORS[si % COLORS.length] }}
                />
                {s.muscleGroup}: {s.points[hoverIndex]}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {series.map((s, si) => (
          <div key={s.muscleGroup} className="flex items-center gap-1.5 text-xs text-navy">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS[si % COLORS.length] }}
            />
            {s.muscleGroup}
          </div>
        ))}
      </div>
    </div>
  );
}
