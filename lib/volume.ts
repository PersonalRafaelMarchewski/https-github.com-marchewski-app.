// Cálculo de volume (séries) e frequência por grupo muscular.
// Puro TS, sem dependências de client/server — usado tanto no formulário
// de treino (client) quanto nas páginas de treino/aluno (server).

export type MuscleVolumeRow = {
  muscleGroup: string;
  totalSets: number;
  frequency: number;
};

/**
 * Volume "do plano": soma as séries por grupo muscular considerando todos
 * os blocos de treino (Treino A, B, C...) de uma vez. A frequência aqui é
 * quantos blocos diferentes tocam aquele grupo — assumindo que o aluno
 * roda todos os blocos uma vez por semana.
 */
export function summarizeVolumeByPlan(
  items: { muscleGroup: string | null; label: string; sets: number | null }[]
): MuscleVolumeRow[] {
  const map = new Map<string, { totalSets: number; labels: Set<string> }>();

  for (const item of items) {
    const group = (item.muscleGroup ?? "").trim();
    if (!group) continue;
    const entry = map.get(group) ?? { totalSets: 0, labels: new Set<string>() };
    entry.totalSets += item.sets ?? 0;
    entry.labels.add(item.label);
    map.set(group, entry);
  }

  return [...map.entries()]
    .map(([muscleGroup, v]) => ({
      muscleGroup,
      totalSets: v.totalSets,
      frequency: v.labels.size,
    }))
    .sort((a, b) => b.totalSets - a.totalSets);
}

/**
 * Volume "real": soma as séries por grupo muscular a partir do histórico
 * de treinos efetivamente concluídos (workout_logs). A frequência aqui é
 * quantos dias distintos aquele grupo foi treinado de verdade no período.
 */
export function summarizeVolumeByHistory(
  items: { muscleGroup: string | null; date: string; sets: number | null }[]
): MuscleVolumeRow[] {
  const map = new Map<string, { totalSets: number; dates: Set<string> }>();

  for (const item of items) {
    const group = (item.muscleGroup ?? "").trim();
    if (!group) continue;
    const entry = map.get(group) ?? { totalSets: 0, dates: new Set<string>() };
    entry.totalSets += item.sets ?? 0;
    entry.dates.add(item.date);
    map.set(group, entry);
  }

  return [...map.entries()]
    .map(([muscleGroup, v]) => ({
      muscleGroup,
      totalSets: v.totalSets,
      frequency: v.dates.size,
    }))
    .sort((a, b) => b.totalSets - a.totalSets);
}
