import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getSignedAvatarUrl } from "@/lib/avatar";
import Card from "@/components/Card";
import Button from "@/components/Button";
import DietasList from "@/components/DietasList";

export default async function DietasPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: students } = await supabase
    .from("students")
    .select("id, profiles:profile_id (name, avatar_url)")
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
        <DietasList
          rows={await Promise.all(
            students.map(async (s: any) => ({
              id: s.id,
              studentName: s.profiles?.name ?? "Aluno",
              avatarSignedUrl: await getSignedAvatarUrl(s.profiles?.avatar_url),
              plan: planByStudent.get(s.id) ?? null,
            }))
          )}
        />
      )}
    </div>
  );
}
