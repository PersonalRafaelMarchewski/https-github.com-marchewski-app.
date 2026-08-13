import { notFound } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import NovaDietaForm from "@/components/NovaDietaForm";

export default async function EditarDietaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: plan } = await supabase
    .from("diet_plans")
    .select(
      "id, student_id, name, status, start_date, end_date, daily_calories, daily_protein, daily_carbs, daily_fat"
    )
    .eq("id", id)
    .eq("trainer_id", user!.id)
    .single();

  if (!plan) notFound();

  // "sex"/"activity_level" tolera a migração ainda não ter rodado
  let students: any[] | null = null;
  {
    const { data } = await supabase
      .from("students")
      .select("id, birth_date, sex, activity_level, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .eq("status", "active");
    students = data;
  }
  if (!students) {
    const { data } = await supabase
      .from("students")
      .select("id, birth_date, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .eq("status", "active");
    students = data;
  }

  // "unit_weight_g" tolera a migração ainda não ter rodado — sem ele, o
  // modo "unidade" continua funcionando, só sem preencher o peso sozinho
  const [{ data: meals }, { data: foodsWithUnit }] = await Promise.all([
    supabase
      .from("diet_meals")
      .select("id, name, suggested_time, description, calories, protein, carbs, fat")
      .eq("plan_id", id)
      .order("order_index"),
    supabase
      .from("foods")
      .select(
        "id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, unit_weight_g"
      )
      .order("name"),
  ]);
  let foods: any[] | null = foodsWithUnit;
  if (!foods) {
    const { data } = await supabase
      .from("foods")
      .select("id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g")
      .order("name");
    foods = data;
  }

  const studentIds = (students ?? []).map((s) => s.id);
  const { data: evaluations } = studentIds.length
    ? await supabase
        .from("evaluations")
        .select("student_id, weight, height, date")
        .in("student_id", studentIds)
        .order("date", { ascending: false })
    : { data: [] as { student_id: string; weight: number | null; height: number | null; date: string }[] };

  const latestByStudent = new Map<string, { weight: number | null; height: number | null }>();
  for (const ev of evaluations ?? []) {
    if (!latestByStudent.has(ev.student_id)) {
      latestByStudent.set(ev.student_id, { weight: ev.weight, height: ev.height });
    }
  }

  const mealIds = (meals ?? []).map((m) => m.id);
  // alimentos já escolhidos em cada refeição (pra reabrir mostrando o que
  // já foi montado, não só o total calculado) — tolera a tabela ainda não
  // existir (migração pendente)
  let mealFoods: {
    meal_id: string;
    quantity_g: number;
    foods: { id: string; name: string; calories_per_100g: number | null; protein_per_100g: number | null; carbs_per_100g: number | null; fat_per_100g: number | null } | null;
  }[] = [];
  if (mealIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from("diet_meal_foods")
        .select(
          "meal_id, quantity_g, foods:food_id (id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)"
        )
        .in("meal_id", mealIds)
        .order("order_index");
      if (!error && data) mealFoods = data as any;
    } catch {
      // segue sem os alimentos detalhados
    }
  }

  const foodItemsByMeal = new Map<string, any[]>();
  for (const mf of mealFoods) {
    if (!mf.foods) continue;
    const list = foodItemsByMeal.get(mf.meal_id) ?? [];
    list.push({
      key: crypto.randomUUID(),
      food_id: mf.foods.id,
      food_name: mf.foods.name,
      quantity_g: String(mf.quantity_g),
      quantity_mode: "g",
      unit_count: "1",
      unit_weight_g: "",
      calories_per_100g: mf.foods.calories_per_100g,
      protein_per_100g: mf.foods.protein_per_100g,
      carbs_per_100g: mf.foods.carbs_per_100g,
      fat_per_100g: mf.foods.fat_per_100g,
    });
    foodItemsByMeal.set(mf.meal_id, list);
  }

  const studentOptions = (students ?? []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.name ?? "Aluno sem nome",
    birthDate: s.birth_date ?? null,
    sex: s.sex ?? null,
    activityLevel: s.activity_level ?? null,
    latestWeight: latestByStudent.get(s.id)?.weight ?? null,
    latestHeight: latestByStudent.get(s.id)?.height ?? null,
  }));

  const mealRows = (meals ?? []).map((m) => ({
    key: m.id,
    name: m.name,
    suggested_time: m.suggested_time ?? "",
    description: m.description ?? "",
    calories: m.calories?.toString() ?? "",
    protein: m.protein?.toString() ?? "",
    carbs: m.carbs?.toString() ?? "",
    fat: m.fat?.toString() ?? "",
    foodItems: foodItemsByMeal.get(m.id) ?? [],
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Editar plano alimentar</h1>
      <NovaDietaForm
        students={studentOptions}
        foods={foods ?? []}
        initialPlan={plan}
        initialMeals={mealRows}
      />
    </div>
  );
}
