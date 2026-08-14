"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Circle, ChevronDown, ChevronUp, Clock, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import StudentCard from "@/components/student/StudentCard";
import FoodPicker, { type Food } from "@/components/FoodPicker";
import MacroPieChart, { MacroPieLegend } from "@/components/MacroPieChart";
import { saveWithSchemaCacheRetry } from "@/lib/supabaseRetry";
import { sumMacros, effectiveGrams, type QuantityMode } from "@/lib/nutrition";

export type ActualFoodItem = {
  food_id: string;
  food_name: string;
  quantity_g: number;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
};

type ItemRow = {
  key: string;
  food_id: string;
  food_name: string;
  quantity_g: string;
  quantity_mode: QuantityMode;
  unit_count: string;
  unit_weight_g: string;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
};

type Props = {
  mealId: string;
  studentId: string;
  date: string;
  name: string;
  suggestedTime: string | null;
  description: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  prescribedFoods?: { name: string; quantity_g: number }[];
  existingLogId: string | null;
  initialCompleted: boolean;
  initialActualFood: string | null;
  initialActualFoodItems: ActualFoodItem[];
  foods: Food[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
};

function MacroChip({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value == null) return null;
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-lightblue/10 px-3 py-1.5 text-sm text-navy">
      <span className="text-orange">{label}</span>
      {value}
      {unit}
    </div>
  );
}

export default function MealCard({
  mealId,
  studentId,
  date,
  name,
  suggestedTime,
  description,
  calories,
  protein,
  carbs,
  fat,
  prescribedFoods = [],
  existingLogId,
  initialCompleted,
  initialActualFood,
  initialActualFoodItems,
  foods,
  open,
  onOpenChange,
  onCompleted,
}: Props) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [logId, setLogId] = useState(existingLogId);
  const [actualFood, setActualFood] = useState(initialActualFood ?? "");
  const [items, setItems] = useState<ItemRow[]>(() =>
    initialActualFoodItems.map((it) => ({
      key: crypto.randomUUID(),
      food_id: it.food_id,
      food_name: it.food_name,
      quantity_g: String(it.quantity_g),
      quantity_mode: "g",
      unit_count: "1",
      unit_weight_g: "",
      calories_per_100g: it.calories_per_100g,
      protein_per_100g: it.protein_per_100g,
      carbs_per_100g: it.carbs_per_100g,
      fat_per_100g: it.fat_per_100g,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function addFood(food: Food) {
    const hasUnit = food.unit_weight_g != null && food.unit_weight_g > 0;
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        food_id: food.id,
        food_name: food.name,
        quantity_g: "100",
        quantity_mode: hasUnit ? "unidade" : "g",
        unit_count: "1",
        unit_weight_g: hasUnit ? String(food.unit_weight_g) : "",
        calories_per_100g: food.calories_per_100g,
        protein_per_100g: food.protein_per_100g,
        carbs_per_100g: food.carbs_per_100g,
        fat_per_100g: food.fat_per_100g,
      },
    ]);
  }

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  const actualMacros = sumMacros(items);

  async function handleToggleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (saving) return;
    const nextCompleted = !completed;

    if (nextCompleted) {
      const zeroed = items.find((it) => effectiveGrams(it) <= 0);
      if (zeroed) {
        setSaveError(
          `Falta preencher a quantidade de "${zeroed.food_name}" (${
            zeroed.quantity_mode === "unidade" ? "peso por unidade" : "gramas"
          }) — sem isso ele entra com 0 kcal.`
        );
        return;
      }
    }

    setSaving(true);
    setSaveError(null);
    const supabase = createClient();

    const payload: Record<string, any> = nextCompleted
      ? { completed: true, actual_food: actualFood || null }
      : { completed: false };

    let saveFailed = false;
    let resolvedLogId = logId;
    if (logId) {
      const { error } = await saveWithSchemaCacheRetry(
        (p) => supabase.from("diet_logs").update(p).eq("id", logId),
        payload
      );
      saveFailed = !!error;
    } else {
      const insertPayload = { meal_id: mealId, student_id: studentId, date, ...payload };
      const { data, error } = await saveWithSchemaCacheRetry(
        (p) => supabase.from("diet_logs").insert(p).select("id").single(),
        insertPayload
      );
      if (error || !data) {
        saveFailed = true;
      } else {
        resolvedLogId = (data as { id: string }).id;
        setLogId(resolvedLogId);
      }
    }

    // alimentos escolhidos só entram quando marca como feita — apaga tudo
    // e regrava a lista atual (mais simples e seguro que tentar sincronizar
    // item a item, mesmo padrão já usado no seletor de alternativas)
    if (!saveFailed && nextCompleted && resolvedLogId) {
      const { error: delError } = await supabase.from("diet_log_foods").delete().eq("log_id", resolvedLogId);
      if (delError) {
        saveFailed = true;
      } else if (items.length > 0) {
        const foodPayload = items.map((it, idx) => ({
          log_id: resolvedLogId,
          food_id: it.food_id,
          quantity_g: effectiveGrams(it),
          order_index: idx,
        }));
        const { error: foodErr } = await supabase.from("diet_log_foods").insert(foodPayload);
        saveFailed = !!foodErr;
      }
    }

    setSaving(false);

    if (saveFailed) {
      setSaveError("Não foi possível salvar agora. Confere sua internet e tenta de novo.");
      return;
    }

    setCompleted(nextCompleted);
    if (nextCompleted) {
      onOpenChange(false);
      onCompleted?.();
    }
    router.refresh();
  }

  return (
    <StudentCard
      className={`transition-all ${completed ? "bg-gradient-to-br from-orange/5 to-peach/10" : ""}`}
      glow={completed}
    >
      <div className="flex w-full items-center gap-3">
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={saving}
          aria-label={completed ? "Marcar como não feita" : "Marcar como feita"}
          className="shrink-0 disabled:opacity-50"
        >
          {saving ? (
            <span className="block h-[26px] w-[26px] animate-spin rounded-full border-2 border-lightblue/40 border-t-orange" />
          ) : completed ? (
            <Circle size={26} className="fill-navy text-navy" />
          ) : (
            <Circle size={26} className="text-lightblue" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading font-semibold text-navy">{name}</p>
            {suggestedTime && (
              <p className="flex items-center gap-1 text-sm text-blue">
                <Clock size={12} />
                {suggestedTime}
              </p>
            )}
          </div>
          {open ? (
            <ChevronUp size={18} className="shrink-0 text-blue" />
          ) : (
            <ChevronDown size={18} className="shrink-0 text-blue" />
          )}
        </button>
      </div>

      {saveError && (
        <p className="mt-2 rounded-lg bg-orange/10 px-3 py-2 text-sm text-orange">{saveError}</p>
      )}

      {open && (
        <div className="mt-4 space-y-4 border-t border-lightblue/20 pt-4">
          {description && <p className="text-sm text-navy">{description}</p>}

          {(calories != null || protein != null || carbs != null || fat != null || prescribedFoods.length > 0) && (
            <div>
              <p className="mb-1.5 text-xs text-blue">Prescrito</p>

              {/* o que comer de verdade — antes só aparecia o total de
                  kcal/macro calculado, sem dizer quais alimentos compõem
                  esse total; o aluno tinha que adivinhar ou lembrar */}
              {prescribedFoods.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {prescribedFoods.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-lg bg-lightblue/10 px-3 py-1.5 text-sm"
                    >
                      <span className="min-w-0 truncate text-navy">{f.name}</span>
                      <span className="flex-none font-medium text-blue">{f.quantity_g}g</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2">
                <MacroChip label="" value={calories} unit=" kcal" />
                <MacroChip label="P " value={protein} unit="g" />
                <MacroChip label="C " value={carbs} unit="g" />
                <MacroChip label="G " value={fat} unit="g" />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">O que você comeu de verdade?</label>

            {items.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {items.map((item) => {
                  const grams = effectiveGrams(item);
                  const factor = grams / 100;
                  const itemProteinG = (item.protein_per_100g ?? 0) * factor;
                  const itemCarbsG = (item.carbs_per_100g ?? 0) * factor;
                  const itemFatG = (item.fat_per_100g ?? 0) * factor;
                  return (
                    <div key={item.key} className="rounded-lg bg-lightblue/10 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <MacroPieChart size={38} proteinG={itemProteinG} carbsG={itemCarbsG} fatG={itemFatG} />
                        <span className="min-w-0 flex-1 truncate text-sm text-navy">{item.food_name}</span>
                        <div className="flex flex-none rounded-full bg-white p-0.5 text-xs">
                          <button
                            type="button"
                            onClick={() => updateItem(item.key, { quantity_mode: "g" })}
                            className={`rounded-full px-2 py-0.5 font-medium ${
                              item.quantity_mode === "g" ? "bg-navy text-white" : "text-blue"
                            }`}
                          >
                            g
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItem(item.key, { quantity_mode: "unidade" })}
                            className={`rounded-full px-2 py-0.5 font-medium ${
                              item.quantity_mode === "unidade" ? "bg-navy text-white" : "text-blue"
                            }`}
                          >
                            un
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="flex-none text-orange hover:text-orange2"
                          aria-label="Remover alimento"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2">
                        {item.quantity_mode === "unidade" ? (
                          <>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.unit_count}
                              onChange={(e) => updateItem(item.key, { unit_count: e.target.value })}
                              className="w-14 flex-none rounded-lg border border-lightblue/50 bg-white px-2 py-1 text-center text-sm outline-none focus:border-orange"
                            />
                            <span className="flex-none text-xs text-blue">un ×</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="peso/un"
                              value={item.unit_weight_g}
                              onChange={(e) => updateItem(item.key, { unit_weight_g: e.target.value })}
                              className="w-20 flex-none rounded-lg border border-lightblue/50 bg-white px-2 py-1 text-center text-sm outline-none focus:border-orange"
                            />
                            <span className="flex-none text-xs text-blue">g/un</span>
                          </>
                        ) : (
                          <>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.quantity_g}
                              onChange={(e) => updateItem(item.key, { quantity_g: e.target.value })}
                              className="w-16 flex-none rounded-lg border border-lightblue/50 bg-white px-2 py-1 text-center text-sm outline-none focus:border-orange"
                            />
                            <span className="flex-none text-xs text-blue">g</span>
                          </>
                        )}
                        {item.calories_per_100g != null && grams > 0 && (
                          <span className="flex-none text-xs text-blue">
                            · {grams}g · {Math.round((item.calories_per_100g * grams) / 100)} kcal
                          </span>
                        )}
                      </div>

                      {grams > 0 && (itemProteinG > 0 || itemCarbsG > 0 || itemFatG > 0) && (
                        <div className="mt-1.5 pl-[2.875rem]">
                          <MacroPieLegend proteinG={itemProteinG} carbsG={itemCarbsG} fatG={itemFatG} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <FoodPicker foods={foods} onSelect={addFood} placeholder="Buscar o que comeu..." />

            {items.length > 0 && (
              <p className="mt-2 text-xs text-blue">
                Total de verdade: {actualMacros.calories} kcal · P {actualMacros.protein}g · C {actualMacros.carbs}g
                · G {actualMacros.fat}g
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              Observação <span className="font-normal text-blue">(opcional)</span>
            </label>
            <textarea
              value={actualFood}
              onChange={(e) => setActualFood(e.target.value)}
              rows={2}
              placeholder="Ex: comi sem o azeite, troquei o pão por tapioca..."
              className="w-full rounded-2xl border border-lightblue/40 px-4 py-2.5 outline-none focus:border-orange"
            />
          </div>

          <p className="pt-1 text-center text-xs text-blue">
            {completed
              ? "Toque na bolinha lá em cima pra desmarcar."
              : "Toque na bolinha lá em cima pra marcar como feita."}
          </p>
        </div>
      )}
    </StudentCard>
  );
}
