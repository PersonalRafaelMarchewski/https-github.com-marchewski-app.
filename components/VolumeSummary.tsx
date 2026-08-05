import Card from "@/components/Card";
import type { MuscleVolumeRow } from "@/lib/volume";

const WIDTH = 600;
const ROW_HEIGHT = 34;
const LABEL_WIDTH = 96;
const VALUE_WIDTH = 150;
const BAR_COLOR = "#ED5B35"; // orange — mesmo hue usado no ProgressChart

export default function VolumeSummary({
  title,
  rows,
  frequencyLabel,
  emptyMessage,
}: {
  title: string;
  rows: MuscleVolumeRow[];
  frequencyLabel: (frequency: number) => string;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <Card className="text-sm text-blue">
        <h3 className="mb-1 font-heading text-sm font-semibold text-navy">{title}</h3>
        {emptyMessage}
      </Card>
    );
  }

  const maxSets = Math.max(...rows.map((r) => r.totalSets), 1);
  const barAreaWidth = WIDTH - LABEL_WIDTH - VALUE_WIDTH;
  const chartHeight = rows.length * ROW_HEIGHT + 4;

  return (
    <Card>
      <h3 className="mb-3 font-heading text-sm font-semibold text-navy">{title}</h3>
      <svg viewBox={`0 0 ${WIDTH} ${chartHeight}`} className="w-full">
        {rows.map((r, i) => {
          const y = i * ROW_HEIGHT;
          const barWidth = Math.max((r.totalSets / maxSets) * barAreaWidth, 3);
          return (
            <g key={r.muscleGroup}>
              <text
                x={0}
                y={y + ROW_HEIGHT / 2}
                dominantBaseline="middle"
                className="fill-navy text-[12px] font-medium"
              >
                {r.muscleGroup}
              </text>
              <rect
                x={LABEL_WIDTH}
                y={y + 7}
                width={barAreaWidth}
                height={ROW_HEIGHT - 16}
                rx={4}
                className="fill-lightblue/15"
              />
              <rect
                x={LABEL_WIDTH}
                y={y + 7}
                width={barWidth}
                height={ROW_HEIGHT - 16}
                rx={4}
                fill={BAR_COLOR}
              />
              <text
                x={LABEL_WIDTH + barAreaWidth + 8}
                y={y + ROW_HEIGHT / 2}
                dominantBaseline="middle"
                className="fill-blue text-[11px]"
              >
                {r.totalSets} séries · {frequencyLabel(r.frequency)}
              </text>
            </g>
          );
        })}
      </svg>
    </Card>
  );
}
