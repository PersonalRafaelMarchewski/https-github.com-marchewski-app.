"use client";

import { useState } from "react";
import StudentCard from "@/components/student/StudentCard";
import DiaryEntryForm, { type SavedDiaryEntry } from "@/components/student/DiaryEntryForm";
import DiaryList from "@/components/student/DiaryList";
import NutritionSummaryBar from "@/components/student/NutritionSummaryBar";
import WaterTracker from "@/components/student/WaterTracker";
import MacroHourChart from "@/components/student/MacroHourChart";
import type { Food } from "@/components/FoodPicker";
import { sumMacros, addMacros, EMPTY_MACROS, type Macros } from "@/lib/nutrition";

type Targets = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

export default function NutricaoDiario({
  studentId,
  foods,
  initialEntries,
  initialWaterMl,
  targets,
  prescribedConsumed = EMPTY_MACROS,
}: {
  studentId: string;
  foods: Food[];
  initialEntries: SavedDiaryEntry[];
  initialWaterMl: number;
  targets: Targets;
  // o que já foi registrado de verdade nas refeições prescritas (Café da
  // manhã, Almoço...) já marcadas como feitas — não é state local porque
  // quem "dono" desse dado é o MealCard, lá em cima; a cada
  // router.refresh() essa prop chega atualizada
  prescribedConsumed?: Macros;
}) {
  const [entries, setEntries] = useState<SavedDiaryEntry[]>(initialEntries);

  const diaryConsumed = entries.reduce((sum, entry) => addMacros(sum, sumMacros(entry.items)), EMPTY_MACROS);
  const consumed = addMacros(diaryConsumed, prescribedConsumed);

  function handleSaved(entry: SavedDiaryEntry) {
    setEntries((prev) => [entry, ...prev]);
  }

  function handleDeleted(entryId: string) {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }

  return (
    <div>
      <h2 className="mb-2 font-heading font-semibold text-navy">Diário do dia</h2>
      <p className="mb-3 text-sm text-blue">
        Registra tudo que você comeu hoje, além das refeições prescritas acima.
      </p>

      <NutritionSummaryBar consumed={consumed} targets={targets} />

      <div className="mb-4">
        <WaterTracker studentId={studentId} initialTotalMl={initialWaterMl} />
      </div>

      <div className="mb-4">
        <DiaryEntryForm studentId={studentId} foods={foods} onSaved={handleSaved} />
      </div>

      <div className="mb-4">
        <DiaryList entries={entries} onDeleted={handleDeleted} />
      </div>

      {entries.length > 0 && (
        <StudentCard>
          <p className="mb-2 text-sm font-semibold text-navy">Por horário</p>
          <MacroHourChart entries={entries} />
        </StudentCard>
      )}
    </div>
  );
}
