import Link from "next/link";
import { Plus, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import Button from "@/components/Button";
import StudentsList from "@/components/StudentsList";
import AtRiskStudentsCard from "@/components/AtRiskStudentsCard";
import { computeAtRiskStudents } from "@/lib/atRisk";
import { getSignedAvatarUrl } from "@/lib/avatar";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, goal, status, service_type, profiles:profile_id (name, email, avatar_url)")
    .eq("trainer_id", user!.id)
    .order("created_at", { ascending: false });

  const studentsWithAvatars = await Promise.all(
    (students ?? []).map(async (s: any) => ({
      ...s,
      avatarSignedUrl: await getSignedAvatarUrl(s.profiles?.avatar_url),
    }))
  );

  // Alerta de aluno "em risco": ativo, mas sem treinar há alguns dias (ou
  // que nunca chegou a começar).
  const activeStudents = studentsWithAvatars.filter((s: any) => s.status === "active");
  const activeIds = activeStudents.map((s: any) => s.id);

  const { data: completedLogs } = activeIds.length
    ? await supabase
        .from("workout_logs")
        .select("student_id, date")
        .in("student_id", activeIds)
        .eq("completed", true)
    : { data: [] as { student_id: string; date: string }[] };

  const { data: activeWorkouts } = activeIds.length
    ? await supabase.from("workouts").select("student_id, start_date").in("student_id", activeIds)
    : { data: [] as { student_id: string; start_date: string | null }[] };

  const atRiskStudents = computeAtRiskStudents(
    activeStudents.map((s: any) => ({ id: s.id, name: s.profiles?.name ?? "Aluno" })),
    completedLogs ?? [],
    activeWorkouts ?? []
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy">Meus alunos</h1>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/alunos/novo">
            <Button variant="secondary" className="flex w-full items-center justify-center gap-2 sm:w-auto">
              <UserPlus size={18} />
              Cadastrar aluno
            </Button>
          </Link>
          <Link href="/treinos/novo">
            <Button className="flex w-full items-center justify-center gap-2 sm:w-auto">
              <Plus size={18} />
              Novo treino
            </Button>
          </Link>
        </div>
      </div>

      {studentsError && (
        <Card className="mb-4 text-orange">
          Erro ao carregar alunos: {studentsError.message}
        </Card>
      )}

      <AtRiskStudentsCard students={atRiskStudents} />

      {!students || students.length === 0 ? (
        <Card className="text-center text-blue">Nenhum aluno cadastrado ainda.</Card>
      ) : (
        <StudentsList students={studentsWithAvatars} />
      )}
    </div>
  );
}
