"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";
import Card from "@/components/Card";
import FoodPicker, { type Food } from "@/components/FoodPicker";
import CalorieCalculator from "@/components/CalorieCalculator";

type Student = {
  id: string;
  name: string;
  birthDate?: string | null;
  sex?: string | null;
  activityLevel?: string | null;
  latestWeight?: number | null;
  latestHeight?: number | null;
};

type FoodItemRow = {
  key: string;
  food_id: string;
  food_name: string;
  quantity_g: string;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
};

type MealRow = {
  key: string;
  name: string;
  suggested_time: string;
  description: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  foodItems: FoodItemRow[];
};

function emptyMeal(name: string = ""): MealRow {
  return {
    key: crypto.randomUUID(),
    name,
    suggested_time: "",
    description: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    foodItems: [],
  };
}

function numberOrNull(value: string): number | null {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) ? n : null;
}

// Soma a carga nutricional dos alimentos escolhidos (valor por 100g x
// quantidade/100) — é isso que faz a carga entrar sozinha quando o
// personal escolhe o alimento e a quantidade, em vez de digitar na mão.
function computeMacrosFromFoodItems(items: FoodItemRow[]) {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let any = false;

  for (const item of items) {
    const qty = Number(item.quantity_g);
    if (!qty || qty <= 0) continue;
    any = true;
    const factor = qty / 100;
    calories += (item.calories_per_100g ?? 0) * factor;
    protein += (item.protein_per_100g ?? 0) * factor;
    carbs += (item.carbs_per_100g ?? 0) * factor;
    fat += (item.fat_per_100g ?? 0) * factor;
  }

  if (!any) return null;
  return {
    calories: Math.round(calories).toString(),
    protein: (Math.round(protein * 10) / 10).toString(),
    carbs: (Math.round(carbs * 10) / 10).toString(),
    fat: (Math.round(fat * 10) / 10).toString(),
  };
}

export default function NovaDietaForm({
  students,
  foods,
  defaultStudentId,
  initialPlan,
  initialMeals,
}: {
  students: Student[];
  foods: Food[];
  defaultStudentId?: string;
  // quando informado, o formulário funciona em modo edição (usado pela
  // página de editar dieta, que reaproveita esse mesmo componente)
  initialPlan?: {
    id: string;
    student_id: string;
    name: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    daily_calories: number | null;
    daily_protein: number | null;
    daily_carbs: number | null;
    daily_fat: number | null;
  };
  initialMeals?: MealRow[];
}) {
  const router = useRouter();
  const isEditing = Boolean(initialPlan);
  const [studentId, setStudentId] = useState(
    initialPlan?.student_id ??
      (defaultStudentId && students.some((s) => s.id === defaultStudentId)
        ? defaultStudentId
        : (students[0]?.id ?? ""))
  );
  const [name, setName] = useState(initialPlan?.name ?? "Plano alimentar");
  const [status, setStatus] = useState(initialPlan?.status ?? "active");
  const [startDate, setStartDate] = useState(initialPlan?.start_date ?? "");
  const [endDate, setEndDate] = useState(initialPlan?.end_date ?? "");
  const [dailyCalories, setDailyCalories] = useState(initialPlan?.daily_calories?.toString() ?? "");
  const [dailyProtein, setDailyProtein] = useState(initialPlan?.daily_protein?.toString() ?? "");
  const [dailyCarbs, setDailyCarbs] = useState(initialPlan?.daily_carbs?.toString() ?? "");
  const [dailyFat, setDailyFat] = useState(initialPlan?.daily_fat?.toString() ?? "");
  const selectedStudent = students.find((s) => s.id === studentId);
  const [meals, setMeals] = useState<MealRow[]>(
    initialMeals ?? [
      emptyMeal("Café da manhã"),
      emptyMeal("Almoço"),
      emptyMeal("Lanche"),
      emptyMeal("Jantar"),
    ]
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateMeal(key: string, patch: Partial<MealRow>) {
    setMeals((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  }

  // Depois de qualquer mudança nos alimentos de uma refeição (adicionar,
  // remover, trocar quantidade), recalcula os macros dela a partir dos
  // alimentos escolhidos — sem precisar digitar nada na mão.
  function updateMealFoodItems(mealKey: string, items: FoodItemRow[]) {
    const computed = computeMacrosFromFoodItems(items);
    updateMeal(mealKey, {
      foodItems: items,
      ...(computed ?? {}),
    });
  }

  function addFoodItem(mealKey: string, food: Food) {
    const meal = meals.find((m) => m.key === mealKey);
    if (!meal) return;
    const newItem: FoodItemRow = {
      key: crypto.randomUUID(),
      food_id: food.id,
      food_name: food.name,
      quantity_g: "100",
      calories_per_100g: food.calories_per_100g,
      protein_per_100g: food.protein_per_100g,
      carbs_per_100g: food.carbs_per_100g,
      fat_per_100g: food.fat_per_100g,
    };
    updateMealFoodItems(mealKey, [...meal.foodItems, newItem]);
  }

  function updateFoodItemQuantity(mealKey: string, itemKey: string, quantity_g: string) {
    const meal = meals.find((m) => m.key === mealKey);
    if (!meal) return;
    const items = meal.foodItems.map((it) => (it.key === itemKey ? { ...it, quantity_g } : it));
    updateMealFoodItems(mealKey, items);
  }

  function removeFoodItem(mealKey: string, itemKey: string) {
    const meal = meals.find((m) => m.key === mealKey);
    if (!meal) return;
    updateMealFoodItems(
      mealKey,
      meal.foodItems.filter((it) => it.key !== itemKey)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!studentId) {
      setError("Selecione um aluno.");
      return;
    }
    if (meals.length === 0) {
      setError("Adicione pelo menos uma refeição.");
      return;
    }
    if (meals.some((m) => !m.name.trim())) {
      setError("Dá um nome pra cada refeição (ex: Café da manhã).");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const planPayload = {
      trainer_id: user!.id,
      student_id: studentId,
      name,
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      daily_calories: numberOrNull(dailyCalories),
      daily_protein: numberOrNull(dailyProtein),
      daily_carbs: numberOrNull(dailyCarbs),
      daily_fat: numberOrNull(dailyFat),
    };

    let planId = initialPlan?.id;

    if (isEditing && planId) {
      const { error: updateError } = await supabase
        .from("diet_plans")
        .update(planPayload)
        .eq("id", planId);
      if (updateError) {
        setError("Não foi possível salvar o plano.");
        setSaving(false);
        return;
      }
      // reconstrói as refeições do zero — mais simples do que casar
      // edição/remoção/adição uma a uma
      await supabase.from("diet_meals").delete().eq("plan_id", planId);
    } else {
      const { data: plan, error: planError } = await supabase
        .from("diet_plans")
        .insert(planPayload)
        .select("id")
        .single();
      if (planError || !plan) {
        setError("Não foi possível criar o plano.");
        setSaving(false);
        return;
      }
      planId = plan.id;
    }

    // insere uma refeição de cada vez (em vez de tudo de uma vez) porque
    // precisamos do id de volta pra já gravar os alimentos escolhidos nela
    for (let index = 0; index < meals.length; index++) {
      const m = meals[index];
      const { data: mealRow, error: mealError } = await supabase
        .from("diet_meals")
        .insert({
          plan_id: planId,
          name: m.name,
          suggested_time: m.suggested_time || null,
          description: m.description || null,
          calories: numberOrNull(m.calories),
          protein: numberOrNull(m.protein),
          carbs: numberOrNull(m.carbs),
          fat: numberOrNull(m.fat),
          order_index: index,
        })
        .select("id")
        .single();

      if (mealError || !mealRow) {
        setError("Plano salvo, mas houve erro ao salvar uma das refeições.");
        setSaving(false);
        return;
      }

      if (m.foodItems.length > 0) {
        const foodItemsPayload = m.foodItems.map((item, i) => ({
          meal_id: mealRow.id,
          food_id: item.food_id,
          quantity_g: Number(item.quantity_g) || 0,
          order_index: i,
        }));
        // best-effort: se a tabela ainda não existir (migração pendente),
        // não trava o resto do salvamento — só perde o detalhamento dos
        // alimentos, os macros totais já foram salvos na refeição
        await supabase.from("diet_meal_foods").insert(foodItemsPayload);
      }
    }

    router.push("/dietas");
    router.refresh();
  }

  if (students.length === 0 && !isEditing) {
    return (
      <Card className="text-center text-blue">
        Você ainda não tem alunos ativos. Cadastre um aluno antes de criar um plano alimentar.
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Aluno</label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={isEditing}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange disabled:bg-lightblue/10"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Nome do plano</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        {isEditing && (
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <div className="w-full sm:w-48">
            <label className="mb-1 block text-sm font-medium text-navy">Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="mb-1 block text-sm font-medium text-navy">Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <label className="block text-sm font-medium text-navy">
              Metas diárias <span className="font-normal text-blue">(opcional)</span>
            </label>
            {selectedStudent && (
              <CalorieCalculator
                student={{
                  sex: selectedStudent.sex ?? null,
                  birthDate: selectedStudent.birthDate ?? null,
                  activityLevel: selectedStudent.activityLevel ?? null,
                  latestWeight: selectedStudent.latestWeight ?? null,
                  latestHeight: selectedStudent.latestHeight ?? null,
                }}
                onApply={(calories, macros) => {
                  setDailyCalories(calories.toString());
                  setDailyProtein(macros.protein.toString());
                  setDailyCarbs(macros.carbs.toString());
                  setDailyFat(macros.fat.toString());
                }}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-blue">Calorias</label>
              <input
                value={dailyCalories}
                onChange={(e) => setDailyCalories(e.target.value)}
                placeholder="kcal"
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-blue">Proteína (g)</label>
              <input
                value={dailyProtein}
                onChange={(e) => setDailyProtein(e.target.value)}
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-blue">Carbo (g)</label>
              <input
                value={dailyCarbs}
                onChange={(e) => setDailyCarbs(e.target.value)}
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-blue">Gordura (g)</label>
              <input
                value={dailyFat}
                onChange={(e) => setDailyFat(e.target.value)}
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="font-heading font-semibold text-navy">Refeições</h2>

        {meals.map((meal) => (
          <Card key={meal.key} className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[160px] flex-1">
                <label className="mb-1 block text-sm font-medium text-navy">Refeição</label>
                <input
                  value={meal.name}
                  onChange={(e) => updateMeal(meal.key, { name: e.target.value })}
                  placeholder="Ex: Café da manhã"
                  className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
                />
              </div>
              <div className="w-28">
                <label className="mb-1 block text-sm font-medium text-navy">Horário</label>
                <input
                  value={meal.suggested_time}
                  onChange={(e) => updateMeal(meal.key, { suggested_time: e.target.value })}
                  placeholder="08:00"
                  className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
                />
              </div>
              <button
                type="button"
                onClick={() => setMeals((prev) => prev.filter((m) => m.key !== meal.key))}
                className="flex-none self-end rounded-lg p-2.5 text-orange hover:bg-orange/10"
                aria-label="Remover refeição"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-navy">
                Alimentos (Tabela TACO){" "}
                <span className="font-normal text-blue">
                  — escolha o alimento e a quantidade, o valor nutricional entra sozinho
                </span>
              </label>

              {meal.foodItems.length > 0 && (
                <div className="mb-2 space-y-1.5">
                  {meal.foodItems.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center gap-2 rounded-lg bg-lightblue/10 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-navy">
                        {item.food_name}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity_g}
                        onChange={(e) =>
                          updateFoodItemQuantity(meal.key, item.key, e.target.value)
                        }
                        className="w-16 flex-none rounded-lg border border-lightblue/50 bg-white px-2 py-1 text-center text-sm outline-none focus:border-orange"
                      />
                      <span className="flex-none text-xs text-blue">g</span>
                      {item.calories_per_100g != null && (
                        <span className="flex-none text-xs text-blue">
                          ·{" "}
                          {Math.round(
                            (item.calories_per_100g * (Number(item.quantity_g) || 0)) / 100
                          )}{" "}
                          kcal
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFoodItem(meal.key, item.key)}
                        className="flex-none text-orange hover:text-orange2"
                        aria-label="Remover alimento"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <FoodPicker foods={foods} onSelect={(food) => addFoodItem(meal.key, food)} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-navy">
                Observações <span className="font-normal text-blue">(opcional)</span>
              </label>
              <textarea
                value={meal.description}
                onChange={(e) => updateMeal(meal.key, { description: e.target.value })}
                rows={2}
                placeholder="Ex: preferir grelhado, temperar só com sal e limão, pode trocar por..."
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-blue">
                Macros dessa refeição{" "}
                {meal.foodItems.length > 0
                  ? "(calculado a partir dos alimentos — pode ajustar)"
                  : "(opcional)"}
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input
                  value={meal.calories}
                  onChange={(e) => updateMeal(meal.key, { calories: e.target.value })}
                  placeholder="kcal"
                  className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
                />
                <input
                  value={meal.protein}
                  onChange={(e) => updateMeal(meal.key, { protein: e.target.value })}
                  placeholder="proteína (g)"
                  className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
                />
                <input
                  value={meal.carbs}
                  onChange={(e) => updateMeal(meal.key, { carbs: e.target.value })}
                  placeholder="carbo (g)"
                  className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
                />
                <input
                  value={meal.fat}
                  onChange={(e) => updateMeal(meal.key, { fat: e.target.value })}
                  placeholder="gordura (g)"
                  className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
                />
              </div>
            </div>
          </Card>
        ))}

        <button
          type="button"
          onClick={() => setMeals((prev) => [...prev, emptyMeal()])}
          className="flex items-center gap-2 text-sm font-medium text-blue hover:text-navy"
        >
          <Plus size={14} />
          Adicionar refeição
        </button>
      </div>

      {error && <p className="text-sm text-orange">{error}</p>}

      <Button type="submit" disabled={saving}>
        {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Salvar plano"}
      </Button>
    </form>
  );
}
