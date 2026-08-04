"use client";

import { useMemo, useRef, useState } from "react";

type Point = { date: string; value: number };

const WIDTH = 600;
const HEIGHT = 200;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const LINE_COLOR = "#ED5B35"; // orange — único hue validado p/ marca de dado

function formatDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    return [min - 1, min, min + 1];
  }
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

export default function ProgressChart({
  title,
  unit,
  data,
}: {
  title: string;
  unit: string;
  data: Point[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...data].sort((a, b) => a.date.localeCompare(b.date)),
    [data]
  );

  if (sorted.length < 2) {
    return (
      <div>
        <p className="mb-2 text-sm font-medium text-navy">{title}</p>
        <p className="text-sm text-blue">
          Precisa de pelo menos 2 avaliações registradas pra mostrar a evolução.
        </p>
      </div>
    );
  }

  const values = sorted.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valuePad = (maxValue - minValue) * 0.15 || 1;
  const yMin = minValue - valuePad;
  const yMax = maxValue + valuePad;

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const x = (i: number) => PAD_LEFT + (i / (sorted.length - 1)) * plotWidth;
  const y = (v: number) => PAD_TOP + (1 - (v - yMin) / (yMax - yMin)) * plotHeight;

  const linePath = sorted.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ");
  const yTicks = niceTicks(yMin, yMax, 4);

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    sorted.forEach((_, i) => {
      const dist = Math.abs(x(i) - relativeX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? sorted[hoverIndex] : null;
  const lastPoint = sorted[sorted.length - 1];

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-navy">{title}</p>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y(t)}
                y2={y(t)}
                stroke="#8499CC"
                strokeOpacity={0.25}
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-blue text-[10px]">
                {Math.round(t)}
              </text>
            </g>
          ))}

          <text x={x(0)} y={HEIGHT - 8} textAnchor="start" className="fill-blue text-[10px]">
            {formatDate(sorted[0].date)}
          </text>
          <text x={x(sorted.length - 1)} y={HEIGHT - 8} textAnchor="end" className="fill-blue text-[10px]">
            {formatDate(lastPoint.date)}
          </text>

          <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          <circle cx={x(sorted.length - 1)} cy={y(lastPoint.value)} r={4} fill={LINE_COLOR} stroke="white" strokeWidth={2} />
          <text
            x={x(sorted.length - 1)}
            y={y(lastPoint.value) - 10}
            textAnchor="end"
            className="fill-navy text-[11px] font-semibold"
          >
            {lastPoint.value}
            {unit}
          </text>

          {hovered && (
            <>
              <line
                x1={x(hoverIndex!)}
                x2={x(hoverIndex!)}
                y1={PAD_TOP}
                y2={HEIGHT - PAD_BOTTOM}
                stroke="#1F2556"
                strokeOpacity={0.3}
                strokeWidth={1}
              />
              <circle cx={x(hoverIndex!)} cy={y(hovered.value)} r={4} fill={LINE_COLOR} stroke="white" strokeWidth={2} />
            </>
          )}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg bg-navy px-2 py-1 text-xs text-white shadow-lg"
            style={{
              left: `${(x(hoverIndex!) / WIDTH) * 100}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="font-semibold">
              {hovered.value}
              {unit}
            </p>
            <p className="text-white/70">{formatDate(hovered.date)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
