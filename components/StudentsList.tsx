"use client";

import { useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import Card from "@/components/Card";

type Student = {
  id: string;
  goal: string | null;
  status: string;
  service_type: string | null;
  profiles: { name: string } | null;
};

const STATUS_FILTERS = [
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const TYPE_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "personal", label: "Personal" },
  { value: "assessoria", label: "Assessoria" },
];

const SERVICE_LABELS: Record<string, string> = {
  personal: "Personal",
  assessoria: "Assessoria",
};

export default function StudentsList({ students }: { students: Student[] }) {
  const [statusFilter, setStatusFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = students
    .filter((s) => s.status === statusFilter)
    .filter((s) => typeFilter === "all" || (s.service_type ?? "assessoria") === typeFilter);

  const activeCount = students.filter((s) => s.status === "active").length;
  const inactiveCount = students.filter((s) => s.status === "inactive").length;
  const countByStatus: Record<string, number> = { active: activeCount, inactive: inactiveCount };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f.value ? "bg-navy text-white" : "bg-lightblue/15 text-blue hover:bg-lightblue/25"
            }`}
          >
            {f.label} ({countByStatus[f.value] ?? 0})
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              typeFilter === f.value ? "bg-navy/80 text-white" : "bg-lightblue/10 text-blue hover:bg-lightblue/20"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="text-center text-blue">Nenhum aluno nesse grupo ainda.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((student) => {
            const serviceType = student.service_type ?? "assessoria";
            return (
              <Link key={student.id} href={`/alunos/${student.id}`}>
                <Card className="flex items-center gap-3 transition-shadow hover:shadow-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-peach/40 text-navy">
                    <User size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-heading font-semibold text-navy">
                        {student.profiles?.name}
                      </p>
                      {student.status === "inactive" && (
                        <span className="flex-none rounded-full bg-orange/20 px-2 py-0.5 text-[10px] font-medium text-orange">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-blue">
                      {student.goal ?? "Sem objetivo definido"}
                    </p>
                  </div>
                  <span
                    className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      serviceType === "personal"
                        ? "bg-orange/15 text-orange"
                        : "bg-lightblue/20 text-blue"
                    }`}
                  >
                    {SERVICE_LABELS[serviceType]}
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
