import Link from "next/link";
import { Plus, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import Button from "@/components/Button";
import StudentsList from "@/components/StudentsList";
import AtRiskStudentsCard from "@/components/AtRiskStudentsCard";
import ReassessmentDueCard from "@/components/ReassessmentDueCard";
import RecentActivityCard from "@/components/RecentActivityCard";
import { computeAtRiskStudents } from "@/lib/atRisk";
import { computeReassessmentsDue } from "@/lib/reassessment";
import { computeTodayCompletions } from "@/lib/recentActivity";
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
    ? await supabase
        .from("workouts")
        .select("id, student_id, name, start_date")
        .in("student_id", activeIds)
    : { data: [] as { id: string; student_id: string; name: string; start_date: string | null }[] };

  const atRiskStudents = computeAtRiskStudents(
    activeStudents.map((s: any) => ({ id: s.id, name: s.profiles?.name ?? "Aluno" })),
    completedLogs ?? [],
    activeWorkouts ?? []
  );

  // Lembrete de reavaliação física: tolera a coluna next_assessment_date
  // ainda não existir (migração pendente) — nesse caso a consulta falha
  // silenciosamente e o card simplesmente não aparece.
  const { data: evaluationsWithNextDate } = activeIds.length
    ? await supabase
        .from("evaluations")
        .select("student_id, date, next_assessment_date")
        .in("student_id", activeIds)
        .not("next_assessment_date", "is", null)
        .order("date", { ascending: false })
    : { data: [] as { student_id: string; date: string; next_assessment_date: string | null }[] };

  const reassessmentsDue = computeReassessmentsDue(
    activeStudents.map((s: any) => ({ id: s.id, name: s.profiles?.name ?? "Aluno" })),
    evaluationsWithNextDate ?? []
  );

  // feed de "quem terminou o treino hoje" — usa os mesmos treinos ativos
  // já buscados acima, só falta os exercícios de cada um e os logs de hoje
  const workoutIds = (activeWorkouts ?? []).map((w) => w.id);
  const today = new Date().toISOString().slice(0, 10);

  const { data: workoutExercises } = workoutIds.length
    ? await supabase.from("workout_exercises").select("id, workout_id, label").in("workout_id", workoutIds)
    : { data: [] as { id: string; workout_id: string; label: string }[] };

  const { data: todayLogs } = activeIds.length
    ? await supabase
        .from("workout_logs")
        .select("student_id, workout_exercise_id, completed, created_at")
        .in("student_id", activeIds)
        .eq("date", today)
    : { data: [] as { student_id: string; workout_exercise_id: string; completed: boolean; created_at: string }[] };

  const recentCompletions = computeTodayCompletions(
    activeStudents.map((s: any) => ({ id: s.id, name: s.profiles?.name ?? "Aluno" })),
    activeWorkouts ?? [],
    workoutExercises ?? [],
    todayLogs ?? []
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

      <RecentActivityCard completions={recentCompletions} />
      <AtRiskStudentsCard students={atRiskStudents} />
      <ReassessmentDueCard students={reassessmentsDue} />

      {!students || students.length === 0 ? (
        <Card className="text-center text-blue">Nenhum aluno cadastrado ainda.</Card>
      ) : (
        <StudentsList students={studentsWithAvatars} />
      )}
    </div>
  );
}
