// Nível de atividade física do aluno — usado pra calcular o gasto
// calórico total (basal x fator de atividade) na hora de montar a meta
// da dieta. Fatores padrão da fórmula de Mifflin-St Jeor / Harris-Benedict.

export const ACTIVITY_LEVEL_OPTIONS = [
  { value: "sedentario", label: "Sedentário", description: "Pouco ou nenhum exercício", factor: 1.2 },
  { value: "leve", label: "Leve", description: "Exercício leve 1-3x/semana", factor: 1.375 },
  { value: "moderado", label: "Moderado", description: "Exercício moderado 3-5x/semana", factor: 1.55 },
  { value: "intenso", label: "Intenso", description: "Exercício intenso 6-7x/semana", factor: 1.725 },
  { value: "muito_intenso", label: "Muito intenso", description: "Exercício muito intenso + trabalho físico", factor: 1.9 },
] as const;

export function activityLevelLabel(value: string | null | undefined): string {
  return ACTIVITY_LEVEL_OPTIONS.find((l) => l.value === value)?.label ?? "—";
}

export function activityLevelFactor(value: string | null | undefined): number | null {
  return ACTIVITY_LEVEL_OPTIONS.find((l) => l.value === value)?.factor ?? null;
}
