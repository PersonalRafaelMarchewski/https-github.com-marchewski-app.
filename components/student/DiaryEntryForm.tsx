"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import StudentCard from "@/components/student/StudentCard";
import FoodPicker, { type Food } from "@/components/FoodPicker";
import Button from "@/components/Button";
import { sumMacros } from "@/lib/nutrition";
import { addDiaryEntry } from "@/app/(student)/nutricao/diario-actions";

type ItemRow = {
  key: string;
  food_id: string;
  food_name: string;
  quantity_g: string;
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
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        food_id: food.id,
        food_name: food.name,
        quantity_g: "100",
        calories_per_100g: food.calories_per_100g,
        protein_per_100g: food.protein_per_100g,
        carbs_per_100g: food.carbs_per_100g,
        fat_per_100g: food.fat_per_100g,
      },
    ]);
  }

  function updateQty(key: string, quantity_g: string) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, quantity_g } : it)));
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
    setError(null);
    setSaving(true);
    const trimmedLabel = label.trim() || null;
    const { data, error: saveError } = await addDiaryEntry({
      studentId,
      label: trimmedLabel,
      items: items.map((it) => ({ food_id: it.food_id, quantity_g: Number(it.quantity_g) || 0 })),
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
        quantity_g: Number(it.quantity_g) || 0,
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
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-2 rounded-lg bg-lightblue/10 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-navy">{item.food_name}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={item.quantity_g}
                onChange={(e) => updateQty(item.key, e.target.value)}
                className="w-16 flex-none rounded-lg border border-lightblue/50 bg-white px-2 py-1 text-center text-sm outline-none focus:border-orange"
              />
              <span className="flex-none text-xs text-blue">g</span>
              <button
                type="button"
                onClick={() => removeItem(item.key)}
                className="flex-none text-orange hover:text-orange2"
                aria-label="Remover alimento"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
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
