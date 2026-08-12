import Link from "next/link";
import { PartyPopper } from "lucide-react";
import Card from "@/components/Card";
import type { CompletedWorkout } from "@/lib/recentActivity";
import { formatTimeInBrazil } from "@/lib/date";

export default function RecentActivityCard({ completions }: { completions: CompletedWorkout[] }) {
  if (completions.length === 0) return null;

  return (
    <Card className="mb-6 border-l-4 border-l-blue bg-blue/5">
      <div className="mb-2 flex items-center gap-2">
        <PartyPopper size={18} className="flex-none text-blue" />
        <h2 className="font-heading font-semibold text-navy">Treinos concluídos hoje</h2>
      </div>
      <div className="space-y-1">
        {completions.map((c) => (
          <Link
            key={`${c.studentId}-${c.workoutName}-${c.label}`}
            href={`/alunos/${c.studentId}`}
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-blue/10"
          >
            <span className="truncate text-navy">
              <span className="font-medium">{c.studentName}</span> terminou{" "}
              <span className="text-blue">
                {c.workoutName} (Ficha {c.label})
              </span>
            </span>
            <span className="flex-none font-medium text-blue">{formatTimeInBrazil(c.completedAt)}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
