import Link from "next/link";
import { CalendarClock } from "lucide-react";
import Card from "@/components/Card";
import type { ReassessmentDue } from "@/lib/reassessment";

export default function ReassessmentDueCard({ students }: { students: ReassessmentDue[] }) {
  if (students.length === 0) return null;

  return (
    <Card className="mb-6 border-l-4 border-l-blue bg-blue/5">
      <div className="mb-2 flex items-center gap-2">
        <CalendarClock size={18} className="flex-none text-blue" />
        <h2 className="font-heading font-semibold text-navy">
          {students.length === 1 ? "1 reavaliação" : `${students.length} reavaliações`} chegando
        </h2>
      </div>
      <div className="space-y-1">
        {students.map((s) => (
          <Link
            key={s.id}
            href={`/alunos/${s.id}/avaliacoes/novo`}
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-blue/10"
          >
            <span className="truncate font-medium text-navy">{s.name}</span>
            <span className={`flex-none font-medium ${s.overdue ? "text-orange" : "text-blue"}`}>
              {s.overdue
                ? `Venceu em ${new Date(`${s.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}`
                : `Hoje, ${new Date(`${s.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}`}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
