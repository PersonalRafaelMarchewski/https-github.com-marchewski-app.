import Card from "@/components/Card";
import MonthlyProgressShareCard from "@/components/MonthlyProgressShareCard";
import { createClient } from "@/lib/supabase/server";
import { calculateStreak } from "@/lib/streak";

export default async function ProgressoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("id, profiles:profile_id (name)")
    .eq("profile_id", user!.id)
    .single();

  if (!student) {
    return <Card className="text-blue">Nenhum resumo disponível ainda.</Card>;
  }

  const now = new Date();
  const monthIndex = now.getMonth();
  const year = now.getFullYear();
  const monthStart = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;

  const { data: logs } = await supabase
    .from("workout_logs")
    .select("date")
    .eq("student_id", student.id)
    .eq("completed", true);

  const allTrainedDates = [...new Set((logs ?? []).map((l) => l.date))];
  const streak = calculateStreak(allTrainedDates);
  const workoutsCount = allTrainedDates.filter((d) => d >= monthStart).length;

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("date, weight")
    .eq("student_id", student.id)
    .not("weight", "is", null)
    .order("date", { ascending: true });

  const withWeight = (evaluations ?? []) as { date: string; weight: number }[];

  // peso "antes": última avaliação registrada antes do início do mês —
  // se não tiver nenhuma, usa a primeira avaliação já dentro do mês
  const beforeEval = [...withWeight].reverse().find((e) => e.date < monthStart);
  const firstInMonth = withWeight.find((e) => e.date >= monthStart);
  const beforeWeight = beforeEval?.weight ?? firstInMonth?.weight ?? null;
  const afterWeight = withWeight.length ? withWeight[withWeight.length - 1].weight : null;

  const studentName = (student as any).profiles?.name ?? "Aluno";

  if (workoutsCount === 0 && streak === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-navy">Meu progresso</h1>
        <Card className="text-blue">
          Ainda não tem treino concluído esse mês — assim que treinar, seu resumo aparece aqui.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Meu progresso</h1>
        <p className="text-blue">
          Gere um resumo do mês pra compartilhar — conta pros seus seguidores como foi!
        </p>
      </div>

      <MonthlyProgressShareCard
        studentName={studentName}
        monthIndex={monthIndex}
        year={year}
        workoutsCount={workoutsCount}
        streak={streak}
        beforeWeight={beforeWeight}
        afterWeight={afterWeight}
      />
    </div>
  );
}
