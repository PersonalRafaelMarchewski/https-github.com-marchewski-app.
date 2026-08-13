// Helpers de cálculo nutricional compartilhados entre a prescrição do
// personal (NovaDietaForm) e o diário livre do aluno.

export type QuantityMode = "g" | "unidade";

export type FoodItemForMacros = {
  quantity_g: string | number;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  // quando quantity_mode é "unidade", o grama efetivo vem de
  // unit_count x unit_weight_g (ex: 2 ovos x 50g cada) em vez do campo
  // quantity_g direto — dá pra registrar "2 unidades" sem converter na
  // mão pra grama
  quantity_mode?: QuantityMode;
  unit_count?: string | number;
  unit_weight_g?: string | number;
};

export type Macros = { calories: number; protein: number; carbs: number; fat: number };

// Grama efetivo de um item, seja ele preenchido direto em gramas ou por
// unidade (quantidade x peso da unidade).
export function effectiveGrams(item: FoodItemForMacros): number {
  if (item.quantity_mode === "unidade") {
    const count = Number(item.unit_count) || 0;
    const weight = Number(item.unit_weight_g) || 0;
    return count * weight;
  }
  return Number(item.quantity_g) || 0;
}

// Soma a carga nutricional dos alimentos escolhidos (valor por 100g x
// quantidade/100) — é isso que faz o macro entrar sozinho quando a pessoa
// escolhe o alimento e a quantidade, em vez de digitar na mão.
export function sumMacros(items: FoodItemForMacros[]): Macros {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const item of items) {
    const qty = effectiveGrams(item);
    if (!qty || qty <= 0) continue;
    const factor = qty / 100;
    calories += (item.calories_per_100g ?? 0) * factor;
    protein += (item.protein_per_100g ?? 0) * factor;
    carbs += (item.carbs_per_100g ?? 0) * factor;
    fat += (item.fat_per_100g ?? 0) * factor;
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories + b.calories,
    protein: Math.round((a.protein + b.protein) * 10) / 10,
    carbs: Math.round((a.carbs + b.carbs) * 10) / 10,
    fat: Math.round((a.fat + b.fat) * 10) / 10,
  };
}

export const EMPTY_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
