"use client";

import { useMemo, useState } from "react";
import StudentCard from "@/components/student/StudentCard";
import MealCard, { type ActualFoodItem } from "@/components/MealCard";
import MacroPieChart, { MacroPieLegend } from "@/components/MacroPieChart";
import type { Food } from "@/components/FoodPicker";

type Meal = {
  id: string;
  name: string;
  suggested_time: string | null;
  description: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

type LogInfo = {
  id: string;
  completed: boolean;
  actual_food: string | null;
  items: ActualFoodItem[];
};

// " · 2.0g/kg" ao lado de cada macro — só quando dá pra calcular (peso
// cadastrado em alguma avaliação), senão o chip fica só com o total em
// gramas, como já era antes.
function perKgSuffix(grams: number | null | undefined, weightKg: number | null | undefined): string {
  if (!grams || !weightKg || weightKg <= 0) return "";
  return ` · ${(grams / weightKg).toFixed(1)}g/kg`;
}

export default function NutricaoList({
  meals,
  logByMeal,
  prescribedFoodsByMeal,
  studentId,
  today,
  dailyTargets,
  weightKg,
  foods,
}: {
  meals: Meal[];
  logByMeal: Record<string, LogInfo>;
  prescribedFoodsByMeal?: Record<string, { name: string; quantity_g: number }[]>;
  studentId: string;
  today: string;
  dailyTargets: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
  weightKg?: number | null;
  foods: Food[];
}) {
  const initialCompletedIds = useMemo(
    () => new Set(meals.filter((m) => logByMeal[m.id]?.completed).map((m) => m.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [completedIds, setCompletedIds] = useState(initialCompletedIds);
  const [openId, setOpenId] = useState<string | null>(() => {
    const firstPending = meals.find((m) => !initialCompletedIds.has(m.id));
    return firstPending?.id ?? null;
  });

  const completedCount = completedIds.size;
  const totalCount = meals.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  function handleMealCompleted(id: string) {
    const updated = new Set(completedIds);
    updated.add(id);
    setCompletedIds(updated);

    const idx = meals.findIndex((m) => m.id === id);
    const nextPending = meals.slice(idx + 1).find((m) => !updated.has(m.id));
    setOpenId(nextPending?.id ?? null);
  }

  const hasTargets =
    dailyTargets &&
    (dailyTargets.calories != null ||
      dailyTargets.protein != null ||
      dailyTargets.carbs != null ||
      dailyTargets.fat != null);

  return (
    <div>
      <StudentCard className="mb-6">
        <div className="mb-3">
          <p className="font-heading font-semibold text-navy">Refeições de hoje</p>
          <p className="text-sm text-blue">
            {completedCount} de {totalCount} feitas
          </p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-lightblue/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange to-orange2 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {hasTargets && (
          <div className="mt-4 border-t border-lightblue/20 pt-3">
            <div className="flex flex-wrap gap-2">
              {dailyTargets!.calories != null && (
                <span className="rounded-full bg-lightblue/10 px-3 py-1 text-xs text-navy">
                  Meta: {dailyTargets!.calories} kcal
                </span>
              )}
              {dailyTargets!.protein != null && (
                <span className="rounded-full bg-lightblue/10 px-3 py-1 text-xs text-navy">
                  P {dailyTargets!.protein}g{perKgSuffix(dailyTargets!.protein, weightKg)}
                </span>
              )}
              {dailyTargets!.carbs != null && (
                <span className="rounded-full bg-lightblue/10 px-3 py-1 text-xs text-navy">
                  C {dailyTargets!.carbs}g{perKgSuffix(dailyTargets!.carbs, weightKg)}
                </span>
              )}
              {dailyTargets!.fat != null && (
                <span className="rounded-full bg-lightblue/10 px-3 py-1 text-xs text-navy">
                  G {dailyTargets!.fat}g{perKgSuffix(dailyTargets!.fat, weightKg)}
                </span>
              )}
            </div>

            {/* pizza da PROPORÇÃO da meta (não do que já foi comido — esse
                resumo fica lá embaixo, no "Diário do dia") — ajuda a
                visualizar de cara se a dieta é mais hiperproteica,
                hiperglicídica etc., sem fazer conta de cabeça */}
            {(dailyTargets!.protein || dailyTargets!.carbs || dailyTargets!.fat) && (
              <div className="mt-3 flex items-center gap-3 border-t border-lightblue/10 pt-3">
                <MacroPieChart
                  size={56}
                  proteinG={dailyTargets!.protein ?? 0}
                  carbsG={dailyTargets!.carbs ?? 0}
                  fatG={dailyTargets!.fat ?? 0}
                />
                <div>
                  <p className="mb-1 text-xs text-blue">Proporção da meta</p>
                  <MacroPieLegend
                    proteinG={dailyTargets!.protein ?? 0}
                    carbsG={dailyTargets!.carbs ?? 0}
                    fatG={dailyTargets!.fat ?? 0}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </StudentCard>

      <div className="space-y-3">
        {meals.map((meal) => {
          const log = logByMeal[meal.id];
          return (
            <MealCard
              key={meal.id}
              mealId={meal.id}
              studentId={studentId}
              date={today}
              name={meal.name}
              suggestedTime={meal.suggested_time}
              description={meal.description}
              calories={meal.calories}
              protein={meal.protein}
              carbs={meal.carbs}
              fat={meal.fat}
              prescribedFoods={prescribedFoodsByMeal?.[meal.id] ?? []}
              existingLogId={log?.id ?? null}
              initialCompleted={log?.completed ?? false}
              initialActualFood={log?.actual_food ?? null}
              initialActualFoodItems={log?.items ?? []}
              foods={foods}
              open={openId === meal.id}
              onOpenChange={(isOpen) => setOpenId(isOpen ? meal.id : null)}
              onCompleted={() => handleMealCompleted(meal.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
