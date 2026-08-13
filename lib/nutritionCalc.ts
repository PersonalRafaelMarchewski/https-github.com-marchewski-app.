// Cálculo de meta calórica a partir do gasto energético do aluno —
// fórmula de Mifflin-St Jeor (a mais usada hoje em dia pra estimar taxa
// metabólica basal), gasto total = basal x fator de atividade, e a meta
// final soma um déficit/superávit em kcal por cima disso.

export function calculateBmr({
  sex,
  weightKg,
  heightCm,
  age,
}: {
  sex: "M" | "F";
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "M" ? base + 5 : base - 161);
}

export function calculateAgeFromBirthDate(birthDate: string): number {
  const birth = new Date(`${birthDate}T12:00:00`);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}

// Divisão de macros a partir da meta calórica final — "Padrão" usa
// proteína por peso (2g/kg, referência comum em treino de força) e o
// resto dos presets usa % fixo dos 3 macros, mais fácil de comparar.
// "Personalizado" é montado na hora pelo componente com os % escolhidos
// pelo próprio personal.
export type MacroSplitPreset = {
  id: string;
  label: string;
  description: string;
  proteinPerKg?: number;
  proteinPct?: number;
  carbsPct?: number;
  fatPct?: number;
};

export const MACRO_SPLIT_PRESETS: MacroSplitPreset[] = [
  {
    id: "padrao",
    label: "Padrão",
    description: "2g/kg proteína · 25% gordura · resto carbo",
    proteinPerKg: 2,
    fatPct: 25,
  },
  { id: "equilibrado", label: "Equilibrado", description: "30% P · 40% C · 30% G", proteinPct: 30, carbsPct: 40, fatPct: 30 },
  { id: "lowcarb", label: "Low carb", description: "35% P · 25% C · 40% G", proteinPct: 35, carbsPct: 25, fatPct: 40 },
  { id: "altocarbo", label: "Alto carboidrato", description: "25% P · 55% C · 20% G", proteinPct: 25, carbsPct: 55, fatPct: 20 },
];

export type MacroResult = {
  protein: number;
  carbs: number;
  fat: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
};

export function computeMacroSplit(calories: number, weightKg: number, preset: MacroSplitPreset): MacroResult {
  let protein: number;
  let carbs: number;
  let fat: number;

  if (preset.proteinPerKg != null) {
    // proteína fixa por peso corporal; gordura em % do total; carbo é o
    // que sobrar das calorias depois de tirar proteína e gordura
    protein = Math.round(weightKg * preset.proteinPerKg);
    const proteinCalories = protein * 4;
    const fatCalories = calories * ((preset.fatPct ?? 25) / 100);
    fat = Math.round(fatCalories / 9);
    carbs = Math.max(0, Math.round((calories - proteinCalories - fatCalories) / 4));
  } else {
    protein = Math.max(0, Math.round((calories * (preset.proteinPct ?? 0)) / 100 / 4));
    carbs = Math.max(0, Math.round((calories * (preset.carbsPct ?? 0)) / 100 / 4));
    fat = Math.max(0, Math.round((calories * (preset.fatPct ?? 0)) / 100 / 9));
  }

  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  const totalCals = proteinCals + carbsCals + fatCals || 1;

  return {
    protein,
    carbs,
    fat,
    proteinPct: Math.round((proteinCals / totalCals) * 100),
    carbsPct: Math.round((carbsCals / totalCals) * 100),
    fatPct: Math.round((fatCals / totalCals) * 100),
  };
}
