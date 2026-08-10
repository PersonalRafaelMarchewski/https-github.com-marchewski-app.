import StudentCard from "@/components/student/StudentCard";
import AchievementBadge from "@/components/student/AchievementBadge";
import MonthlyProgressShareCard from "@/components/MonthlyProgressShareCard";
import { createClient } from "@/lib/supabase/server";
import { calculateStreak } from "@/lib/streak";
import {
  STREAK_TIERS,
  WORKOUT_COUNT_TIERS,
  VOLUME_TIERS,
  allTiersWithState,
  nextTier,
} from "@/lib/achievements";

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
    return <StudentCard className="text-blue">Nenhum resumo disponível ainda.</StudentCard>;
  }

  const now = new Date();
  const monthIndex = now.getMonth();
  const year = now.getFullYear();
  const monthStart = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;

  // actual_loads (carga por série) é coluna nova; se a migração ainda não
  // rodou, pedir ela derruba a consulta inteira, então tenta sem ela.
  let logs: any[] | null = null;
  {
    const { data, error } = await supabase
      .from("workout_logs")
      .select("date, actual_load, actual_loads, workout_exercises:workout_exercise_id (sets)")
      .eq("student_id", student.id)
      .eq("completed", true);
    if (error) {
      const fallback = await supabase
        .from("workout_logs")
        .select("date, actual_load, workout_exercises:workout_exercise_id (sets)")
        .eq("student_id", student.id)
        .eq("completed", true);
      logs = fallback.data;
    } else {
      logs = data;
    }
  }

  const logsTyped = (logs ?? []) as any[];
  const allTrainedDates = [...new Set(logsTyped.map((l) => l.date))];
  const streak = calculateStreak(allTrainedDates);
  const workoutsCount = allTrainedDates.filter((d) => d >= monthStart).length;
  const workoutsCountAllTime = allTrainedDates.length;

  // volume real: soma a carga de cada série quando já registrada assim;
  // senão cai pro cálculo antigo (séries × carga única, aproximado)
  const totalVolumeAllTime = logsTyped.reduce((sum, l) => {
    const perSetLoads: unknown[] = Array.isArray(l.actual_loads) ? l.actual_loads : [];
    const perSetSum = perSetLoads.reduce(
      (s: number, v) => (typeof v === "number" ? s + v : s),
      0
    );
    if (perSetSum > 0) return sum + perSetSum;
    const sets = l.workout_exercises?.sets;
    if (sets && l.actual_load) return sum + sets * Number(l.actual_load);
    return sum;
  }, 0);

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

  const shelves: { title: string; tiers: ReturnType<typeof allTiersWithState>; value: number; unit: string }[] = [
    { title: "Sequência", tiers: allTiersWithState(STREAK_TIERS, streak), value: streak, unit: "dias" },
    {
      title: "Treinos concluídos",
      tiers: allTiersWithState(WORKOUT_COUNT_TIERS, workoutsCountAllTime),
      value: workoutsCountAllTime,
      unit: "treinos",
    },
    {
      title: "Kg movidos",
      tiers: allTiersWithState(VOLUME_TIERS, totalVolumeAllTime),
      value: totalVolumeAllTime,
      unit: "kg",
    },
  ];

  const trophyShelf = (
    <StudentCard>
      <p className="mb-4 font-heading font-semibold text-navy">Minhas conquistas 🏆</p>
      <div className="space-y-5">
        {shelves.map((shelf) => {
          const next = nextTier(
            shelf.title === "Sequência"
              ? STREAK_TIERS
              : shelf.title === "Treinos concluídos"
                ? WORKOUT_COUNT_TIERS
                : VOLUME_TIERS,
            shelf.value
          );
          return (
            <div key={shelf.title}>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-sm font-medium text-navy">{shelf.title}</p>
                {next && (
                  <p className="text-xs text-blue">
                    faltam {Math.max(0, next.threshold - shelf.value)} {shelf.unit} pra próxima
                  </p>
                )}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {shelf.tiers.map((t) => (
                  <AchievementBadge key={t.label} emoji={t.emoji} label={t.label} achieved={t.achieved} size="sm" />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </StudentCard>
  );

  if (workoutsCount === 0 && streak === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-navy">Meu progresso</h1>
        <StudentCard className="text-blue">
          Ainda não tem treino concluído esse mês — assim que treinar, seu resumo aparece aqui.
        </StudentCard>
        {trophyShelf}
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

      {trophyShelf}
    </div>
  );
}
