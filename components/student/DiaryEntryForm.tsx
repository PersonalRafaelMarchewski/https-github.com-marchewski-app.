"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import StudentCard from "@/components/student/StudentCard";
import FoodPicker, { type Food } from "@/components/FoodPicker";
import MacroPieChart, { MacroPieLegend } from "@/components/MacroPieChart";
import Button from "@/components/Button";
import { sumMacros, effectiveGrams, type QuantityMode } from "@/lib/nutrition";
import { addDiaryEntry } from "@/app/(student)/nutricao/diario-actions";

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

export type DiaryEntryItem = {
  food_id: string;
  food_name: string;
  quantity_g: number;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
};

export type SavedDiaryEntry = {
  id: string;
  label: string | null;
  logged_at: string;
  items: DiaryEntryItem[];
};

export default function DiaryEntryForm({
  studentId,
  foods,
  onSaved,
}: {
  studentId: string;
  foods: Food[];
  onSaved: (entry: SavedDiaryEntry) => void;
}) {
  const [label, setLabel] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function addFood(food: Food) {
    // alimento com peso de unidade cadastrado (ex: 1 ovo ≈ 50g) já entra
    // no modo "unidade" com o peso preenchido sozinho — o aluno só
    // ajusta a quantidade (2 ovos, 3 fatias...) em vez de ter que saber
    // ou digitar quantos gramas tem
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

  const macros = sumMacros(items);
  const hasItems = items.length > 0;

  async function handleSave() {
    if (!hasItems) {
      setError("Adiciona pelo menos um alimento.");
      return;
    }
    // no modo "un" é fácil esquecer de preencher o peso da unidade — sem
    // essa checagem o registro salvava do mesmo jeito, só que com 0g (e
    // 0 kcal) pra esse alimento, sem avisar nada, e a caloria "sumia" do
    // total do dia sem o aluno perceber
    const zeroed = items.find((it) => effectiveGrams(it) <= 0);
    if (zeroed) {
      setError(
        `Falta preencher a quantidade de "${zeroed.food_name}" (${
          zeroed.quantity_mode === "unidade" ? "peso por unidade" : "gramas"
        }) — sem isso ele entra com 0 kcal.`
      );
      return;
    }
    setError(null);
    setSaving(true);
    const trimmedLabel = label.trim() || null;
    const { data, error: saveError } = await addDiaryEntry({
      studentId,
      label: trimmedLabel,
      items: items.map((it) => ({ food_id: it.food_id, quantity_g: effectiveGrams(it) })),
    });
    setSaving(false);
    if (saveError || !data) {
      setError("Não foi possível salvar. Confere sua internet e tenta de novo.");
      return;
    }
    const savedItems = items;
    setLabel("");
    setItems([]);
    setOpen(false);
    onSaved({
      id: data.id,
      label: trimmedLabel,
      logged_at: new Date().toISOString(),
      items: savedItems.map((it) => ({
        food_id: it.food_id,
        food_name: it.food_name,
        quantity_g: effectiveGrams(it),
        calories_per_100g: it.calories_per_100g,
        protein_per_100g: it.protein_per_100g,
        carbs_per_100g: it.carbs_per_100g,
        fat_per_100g: it.fat_per_100g,
      })),
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-lightblue/40 py-3 text-sm font-medium text-blue hover:border-orange hover:text-orange"
      >
        <Plus size={16} />
        Registrar o que comi
      </button>
    );
  }

  return (
    <StudentCard>
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-navy">
          Nome (opcional)
        </label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex: Lanche da tarde"
          className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
        />
      </div>

      {items.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {items.map((item) => {
            const grams = effectiveGrams(item);
            const factor = grams / 100;
            const itemProteinG = (item.protein_per_100g ?? 0) * factor;
            const itemCarbsG = (item.carbs_per_100g ?? 0) * factor;
            const itemFatG = (item.fat_per_100g ?? 0) * factor;
            return (
              <div key={item.key} className="rounded-lg bg-lightblue/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <MacroPieChart size={26} proteinG={itemProteinG} carbsG={itemCarbsG} fatG={itemFatG} />
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
                  <div className="mt-1.5 pl-[2.125rem]">
                    <MacroPieLegend proteinG={itemProteinG} carbsG={itemCarbsG} fatG={itemFatG} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <FoodPicker foods={foods} onSelect={addFood} />

      {hasItems && (
        <p className="mt-3 text-xs text-blue">
          {macros.calories} kcal · P {macros.protein}g · C {macros.carbs}g · G {macros.fat}g
        </p>
      )}

      {error && <p className="mt-2 text-xs text-orange">{error}</p>}

      <div className="mt-4 flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? "Salvando..." : "Salvar registro"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setItems([]);
            setLabel("");
            setError(null);
          }}
          className="rounded-lg border border-lightblue/50 px-4 text-sm font-medium text-navy hover:bg-lightblue/10"
        >
          Cancelar
        </button>
      </div>
    </StudentCard>
  );
}
