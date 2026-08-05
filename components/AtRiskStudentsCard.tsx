import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import Card from "@/components/Card";
import type { RiskStudent } from "@/lib/atRisk";

export default function AtRiskStudentsCard({ students }: { students: RiskStudent[] }) {
  if (students.length === 0) return null;

  return (
    <Card className="mb-6 border-l-4 border-l-orange bg-orange/5">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle size={18} className="flex-none text-orange" />
        <h2 className="font-heading font-semibold text-navy">
          {students.length === 1 ? "1 aluno" : `${students.length} alunos`} sem treinar há alguns
          dias
        </h2>
      </div>
      <div className="space-y-1">
        {students.map((s) => (
          <Link
            key={s.id}
            href={`/alunos/${s.id}`}
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-orange/10"
          >
            <span className="truncate font-medium text-navy">{s.name}</span>
            <span className="flex-none font-medium text-orange">
              {s.neverTrained ? "Nunca treinou" : `${s.daysSinceLastTrained} dias sem treinar`}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
