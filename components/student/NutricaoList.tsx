"use client";

import { useMemo, useState } from "react";
import StudentCard from "@/components/student/StudentCard";
import MealCard from "@/components/MealCard";

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
};

export default function NutricaoList({
  meals,
  logByMeal,
  studentId,
  today,
  dailyTargets,
}: {
  meals: Meal[];
  logByMeal: Record<string, LogInfo>;
  studentId: string;
  today: string;
  dailyTargets: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
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
          <div className="mt-4 flex flex-wrap gap-2 border-t border-lightblue/20 pt-3">
            {dailyTargets!.calories != null && (
              <span className="rounded-full bg-lightblue/10 px-3 py-1 text-xs text-navy">
                Meta: {dailyTargets!.calories} kcal
              </span>
            )}
            {dailyTargets!.protein != null && (
              <span className="rounded-full bg-lightblue/10 px-3 py-1 text-xs text-navy">
                P {dailyTargets!.protein}g
              </span>
            )}
            {dailyTargets!.carbs != null && (
              <span className="rounded-full bg-lightblue/10 px-3 py-1 text-xs text-navy">
                C {dailyTargets!.carbs}g
              </span>
            )}
            {dailyTargets!.fat != null && (
              <span className="rounded-full bg-lightblue/10 px-3 py-1 text-xs text-navy">
                G {dailyTargets!.fat}g
              </span>
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
              existingLogId={log?.id ?? null}
              initialCompleted={log?.completed ?? false}
              initialActualFood={log?.actual_food ?? null}
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
