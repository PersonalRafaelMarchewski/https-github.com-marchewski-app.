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

// Sugestão de macros a partir da meta calórica final: proteína 2g/kg
// (referência comum em treino de força), gordura 25% das calorias, e o
// resto em carboidrato — só um ponto de partida, o personal ajusta depois.
export function suggestMacrosFromCalories(calories: number, weightKg: number) {
  const protein = Math.round(weightKg * 2);
  const fatCalories = calories * 0.25;
  const fat = Math.round(fatCalories / 9);
  const proteinCalories = protein * 4;
  const carbs = Math.max(0, Math.round((calories - proteinCalories - fatCalories) / 4));
  return { protein, carbs, fat };
}
