import { createClient, getAuthUser } from "@/lib/supabase/server";
import StudentCard from "@/components/student/StudentCard";
import NutricaoList from "@/components/student/NutricaoList";
import NutricaoDiario from "@/components/student/NutricaoDiario";
import { todayInBrazil } from "@/lib/date";
import type { SavedDiaryEntry } from "@/components/student/DiaryEntryForm";
import { sumMacros, addMacros, EMPTY_MACROS } from "@/lib/nutrition";

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

  const today = todayInBrazil();

  // peso mais recente do aluno — pra mostrar a meta também em g/kg (ex:
  // "2g/kg"), que é como personal/nutricionista normalmente pensa a
  // prescrição, não só o total em gramas soltas.
  let latestWeightKg: number | null = null;
  {
    const { data: latestEval } = await supabase
      .from("evaluations")
      .select("weight, date")
      .eq("student_id", student.id)
      .not("weight", "is", null)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestWeightKg = latestEval?.weight ?? null;
  }

  const { data: plan } = await supabase
    .from("diet_plans")
    .select("id, name, daily_calories, daily_protein, daily_carbs, daily_fat")
    .eq("student_id", student.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let meals: { id: string; name: string; suggested_time: string | null; description: string | null; calories: number | null; protein: number | null; carbs: number | null; fat: number | null }[] = [];
  const logByMeal: Record<
    string,
    { id: string; completed: boolean; actual_food: string | null; items: any[] }
  > = {};
  const prescribedFoodsByMeal: Record<string, { name: string; quantity_g: number }[]> = {};

  if (plan) {
    const { data: mealsData } = await supabase
      .from("diet_meals")
      .select("id, name, suggested_time, description, calories, protein, carbs, fat")
      .eq("plan_id", plan.id)
      .order("order_index");
    meals = mealsData ?? [];

    if (meals.length > 0) {
      const mealIds = meals.map((m) => m.id);

      // alimentos que o personal prescreveu pra cada refeição (não só o
      // total de kcal/macro) — sem isso o aluno via a meta calórica mas
      // não sabia o que efetivamente comer pra bater ela.
      try {
        const { data: mealFoods } = await supabase
          .from("diet_meal_foods")
          .select("meal_id, quantity_g, order_index, foods:food_id (name)")
          .in("meal_id", mealIds)
          .order("order_index");
        for (const mf of (mealFoods ?? []) as any[]) {
          if (!mf.foods) continue;
          (prescribedFoodsByMeal[mf.meal_id] ??= []).push({
            name: mf.foods.name,
            quantity_g: mf.quantity_g,
          });
        }
      } catch {
        // tabela pode não existir ainda (migração pendente) — segue só
        // com os totais de macro, sem a lista de alimentos
      }

      const { data: todayLogs } = await supabase
        .from("diet_logs")
        .select("id, meal_id, completed, actual_food")
        .eq("student_id", student.id)
        .eq("date", today)
        .in("meal_id", mealIds);

      for (const log of todayLogs ?? []) {
        logByMeal[log.meal_id] = { ...log, items: [] };
      }

      // alimentos de verdade escolhidos em cada refeição — tolera a
      // tabela ainda não existir (migração pendente)
      const logIds = (todayLogs ?? []).map((l) => l.id);
      if (logIds.length > 0) {
        try {
          const { data: logFoods, error } = await supabase
            .from("diet_log_foods")
            .select(
              "log_id, quantity_g, foods:food_id (id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)"
            )
            .in("log_id", logIds)
            .order("order_index");
          if (!error && logFoods) {
            for (const lf of logFoods as any[]) {
              if (!lf.foods) continue;
              const mealId = Object.keys(logByMeal).find((mId) => logByMeal[mId].id === lf.log_id);
              if (!mealId) continue;
              logByMeal[mealId].items.push({
                food_id: lf.foods.id,
                food_name: lf.foods.name,
                quantity_g: lf.quantity_g,
                calories_per_100g: lf.foods.calories_per_100g,
                protein_per_100g: lf.foods.protein_per_100g,
                carbs_per_100g: lf.foods.carbs_per_100g,
                fat_per_100g: lf.foods.fat_per_100g,
              });
            }
          }
        } catch {
          // segue sem os alimentos detalhados — o texto livre continua normal
        }
      }
    }
  }

  // soma o que foi de verdade registrado nas refeições prescritas já
  // marcadas como feitas — sem isso, marcar "Café da manhã" como feita
  // com alimentos de verdade não mexia em nada no resumo "kcal
  // restantes" lá embaixo, que só olhava pro diário livre
  const prescribedConsumed = Object.values(logByMeal)
    .filter((log) => log.completed)
    .reduce((sum, log) => addMacros(sum, sumMacros(log.items)), EMPTY_MACROS);

  // alimentos da TACO pro diário livre — tolera a tabela ainda não
  // existir (migração pendente)
  // "unit_weight_g" tolera a migração ainda não ter rodado — sem ele, o
  // modo "unidade" continua funcionando, só sem preencher o peso sozinho
  let foods: any[] | null = null;
  {
    const { data } = await supabase
      .from("foods")
      .select(
        "id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, unit_weight_g"
      )
      .order("name");
    foods = data;
  }
  if (!foods) {
    const { data } = await supabase
      .from("foods")
      .select("id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g")
      .order("name");
    foods = data;
  }

  // entradas do diário livre de hoje — tolera as tabelas novas ainda não
  // existirem (migração pendente)
  let diaryEntries: SavedDiaryEntry[] = [];
  try {
    const { data: entries } = await supabase
      .from("diet_diary_entries")
      .select("id, label, logged_at, diet_diary_entry_foods (food_id, quantity_g, foods:food_id (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g))")
      .eq("student_id", student.id)
      .eq("date", today)
      .order("logged_at", { ascending: false });

    diaryEntries = (entries ?? []).map((e: any) => ({
      id: e.id,
      label: e.label,
      logged_at: e.logged_at,
      items: (e.diet_diary_entry_foods ?? [])
        .filter((f: any) => f.foods)
        .map((f: any) => ({
          food_id: f.food_id,
          food_name: f.foods.name,
          quantity_g: f.quantity_g,
          calories_per_100g: f.foods.calories_per_100g,
          protein_per_100g: f.foods.protein_per_100g,
          carbs_per_100g: f.foods.carbs_per_100g,
          fat_per_100g: f.foods.fat_per_100g,
        })),
    }));
  } catch {
    // segue sem o diário — a lista prescrita continua funcionando normal
  }

  let waterTotalMl = 0;
  try {
    const { data: waterLogs } = await supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("student_id", student.id)
      .eq("date", today);
    waterTotalMl = (waterLogs ?? []).reduce((sum, w) => sum + w.amount_ml, 0);
  } catch {
    // segue com 0 — tabela pode ainda não existir (migração pendente)
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-navy">Nutrição</h1>
      <p className="mb-5 text-blue">{plan?.name ?? "Sem plano prescrito ainda"}</p>

      {plan && meals.length > 0 && (
        <div className="mb-8">
          <NutricaoList
            meals={meals}
            logByMeal={logByMeal}
            prescribedFoodsByMeal={prescribedFoodsByMeal}
            studentId={student.id}
            today={today}
            dailyTargets={{
              calories: plan.daily_calories,
              protein: plan.daily_protein,
              carbs: plan.daily_carbs,
              fat: plan.daily_fat,
            }}
            weightKg={latestWeightKg}
            foods={foods ?? []}
          />
        </div>
      )}

      <NutricaoDiario
        studentId={student.id}
        foods={foods ?? []}
        initialEntries={diaryEntries}
        initialWaterMl={waterTotalMl}
        prescribedConsumed={prescribedConsumed}
        targets={{
          calories: plan?.daily_calories ?? null,
          protein: plan?.daily_protein ?? null,
          carbs: plan?.daily_carbs ?? null,
          fat: plan?.daily_fat ?? null,
        }}
      />
    </div>
  );
}
