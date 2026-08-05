import Card from "@/components/Card";
import type { MuscleVolumeRow } from "@/lib/volume";

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

  return (
    <Card>
      <h3 className="mb-3 font-heading text-sm font-semibold text-navy">{title}</h3>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.muscleGroup}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-navy">{r.muscleGroup}</span>
              <span className="flex-none text-blue">
                {r.totalSets} séries · {frequencyLabel(r.frequency)}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-lightblue/15">
              <div
                className="h-full rounded-full bg-orange"
                style={{ width: `${(r.totalSets / maxSets) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
