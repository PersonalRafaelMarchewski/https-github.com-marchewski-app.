import { createClient, getAuthUser } from "@/lib/supabase/server";
import StudentCard from "@/components/student/StudentCard";
import NutricaoList from "@/components/student/NutricaoList";
import { todayInBrazil } from "@/lib/date";

export default async function NutricaoPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  if (!student) {
    return <StudentCard className="text-blue">Nenhum plano vinculado à sua conta ainda.</StudentCard>;
  }

  const { data: plan } = await supabase
    .from("diet_plans")
    .select("id, name, daily_calories, daily_protein, daily_carbs, daily_fat")
    .eq("student_id", student.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) {
    return (
      <StudentCard className="text-blue">
        Seu personal ainda não montou um plano alimentar pra você.
      </StudentCard>
    );
  }

  const { data: meals } = await supabase
    .from("diet_meals")
    .select("id, name, suggested_time, description, calories, protein, carbs, fat")
    .eq("plan_id", plan.id)
    .order("order_index");

  if (!meals || meals.length === 0) {
    return (
      <StudentCard className="text-blue">
        Seu plano alimentar ainda não tem refeições cadastradas.
      </StudentCard>
    );
  }

  const today = todayInBrazil();
  const mealIds = meals.map((m) => m.id);

  const { data: todayLogs } = await supabase
    .from("diet_logs")
    .select("id, meal_id, completed, actual_food")
    .eq("student_id", student.id)
    .eq("date", today)
    .in("meal_id", mealIds);

  const logByMeal: Record<string, { id: string; completed: boolean; actual_food: string | null }> = {};
  for (const log of todayLogs ?? []) {
    logByMeal[log.meal_id] = log;
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-navy">Nutrição</h1>
      <p className="mb-5 text-blue">{plan.name}</p>

      <NutricaoList
        meals={meals}
        logByMeal={logByMeal}
        studentId={student.id}
        today={today}
        dailyTargets={{
          calories: plan.daily_calories,
          protein: plan.daily_protein,
          carbs: plan.daily_carbs,
          fat: plan.daily_fat,
        }}
      />
    </div>
  );
}
