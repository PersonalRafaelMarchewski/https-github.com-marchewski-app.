import Link from "next/link";
import { Plus, Apple } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import Card from "@/components/Card";
import Button from "@/components/Button";

export default async function DietasPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: students } = await supabase
    .from("students")
    .select("id, profiles:profile_id (name)")
    .eq("trainer_id", user!.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const studentIds = (students ?? []).map((s) => s.id);

  const { data: plans } = studentIds.length
    ? await supabase
        .from("diet_plans")
        .select("id, student_id, name, status")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false })
    : { data: [] as { id: string; student_id: string; name: string; status: string }[] };

  // pega só o plano mais recente de cada aluno (a query já vem ordenada
  // por mais novo primeiro, então a primeira ocorrência é a que fica)
  const planByStudent = new Map<string, { id: string; name: string; status: string }>();
  for (const p of plans ?? []) {
    if (!planByStudent.has(p.student_id)) {
      planByStudent.set(p.student_id, { id: p.id, name: p.name, status: p.status });
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Dietas</h1>
        <Link href="/dietas/novo">
          <Button className="flex items-center gap-2">
            <Plus size={18} />
            Nova dieta
          </Button>
        </Link>
      </div>

      {!students || students.length === 0 ? (
        <Card className="text-center text-blue">Nenhum aluno ativo ainda.</Card>
      ) : (
        <div className="space-y-3">
          {students.map((s: any) => {
            const plan = planByStudent.get(s.id);
            return (
              <Card key={s.id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-peach/30 text-navy">
                    <Apple size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-navy">
                      {s.profiles?.name ?? "Aluno"}
                    </p>
                    <p className="text-sm text-blue">
                      {plan
                        ? `${plan.name}${plan.status === "inactive" ? " (inativo)" : ""}`
                        : "Nenhum plano ainda"}
                    </p>
                  </div>
                </div>
                {plan ? (
                  <Link href={`/dietas/${plan.id}/editar`} className="flex-none">
                    <Button variant="secondary">Editar</Button>
                  </Link>
                ) : (
                  <Link href={`/dietas/novo?student=${s.id}`} className="flex-none">
                    <Button variant="secondary">Criar</Button>
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
