"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";
import Card from "@/components/Card";

type Student = { id: string; name: string };

type MealRow = {
  key: string;
  name: string;
  suggested_time: string;
  description: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
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
  };
}

function numberOrNull(value: string): number | null {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) ? n : null;
}

export default function NovaDietaForm({
  students,
  defaultStudentId,
  initialPlan,
  initialMeals,
}: {
  students: Student[];
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

    const mealsPayload = meals.map((m, index) => ({
      plan_id: planId,
      name: m.name,
      suggested_time: m.suggested_time || null,
      description: m.description || null,
      calories: numberOrNull(m.calories),
      protein: numberOrNull(m.protein),
      carbs: numberOrNull(m.carbs),
      fat: numberOrNull(m.fat),
      order_index: index,
    }));

    const { error: mealsError } = await supabase.from("diet_meals").insert(mealsPayload);
    if (mealsError) {
      setError("Plano salvo, mas houve erro ao salvar as refeições.");
      setSaving(false);
      return;
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
          <label className="mb-1 block text-sm font-medium text-navy">
            Metas diárias <span className="font-normal text-blue">(opcional)</span>
          </label>
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
                Alimentos e quantidades
              </label>
              <textarea
                value={meal.description}
                onChange={(e) => updateMeal(meal.key, { description: e.target.value })}
                rows={2}
                placeholder="Ex: 150g de peito de frango grelhado, 100g de arroz integral, salada verde à vontade"
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-blue">
                Macros dessa refeição (opcional)
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
