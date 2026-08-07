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

/**
 * Volume "prescrito", somando vários treinos (fichas) de uma vez — ex: todos
 * os treinos ativos de um aluno, mesmo que estejam em registros separados.
 * Diferente de summarizeVolumeByPlan (um treino só), aqui a frequência conta
 * blocos únicos por TREINO (workout_id + label), não só pelo label — assim
 * um "Treino A" de uma ficha não se confunde com o "Treino A" de outra.
 */
export function summarizeVolumeAcrossWorkouts(
  items: { muscleGroup: string | null; workoutId: string; label: string; sets: number | null }[]
): MuscleVolumeRow[] {
  const map = new Map<string, { totalSets: number; sessions: Set<string> }>();

  for (const item of items) {
    const group = (item.muscleGroup ?? "").trim();
    if (!group) continue;
    const entry = map.get(group) ?? { totalSets: 0, sessions: new Set<string>() };
    entry.totalSets += item.sets ?? 0;
    entry.sessions.add(`${item.workoutId}:${item.label}`);
    map.set(group, entry);
  }

  return [...map.entries()]
    .map(([muscleGroup, v]) => ({
      muscleGroup,
      totalSets: v.totalSets,
      frequency: v.sessions.size,
    }))
    .sort((a, b) => b.totalSets - a.totalSets);
}

export type MuscleTrendSeries = {
  muscleGroup: string;
  points: number[]; // séries totais por semana, do mais antigo pro mais recente
};

export type VolumeTrend = {
  weekLabels: string[]; // rótulo (início de cada semana), do mais antigo pro mais recente
  series: MuscleTrendSeries[];
};

/**
 * Evolução do volume real por grupo muscular ao longo de N semanas (janelas
 * de 7 dias corridos, terminando hoje). Usado pro gráfico de tendência —
 * mostra se o volume de cada grupo está subindo, caindo ou estagnado.
 */
export function summarizeVolumeTrend(
  items: { muscleGroup: string | null; date: string; sets: number | null }[],
  weeks: number = 6
): VolumeTrend {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function bucketFor(dateStr: string): number | null {
    const d = new Date(`${dateStr}T12:00:00`); // meio-dia evita virar o dia por fuso
    const diffDays = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
    if (diffDays < 0) return null;
    const bucket = Math.floor(diffDays / 7); // 0 = últimos 7 dias, 1 = semana anterior...
    return bucket < weeks ? bucket : null;
  }

  const perGroup = new Map<string, number[]>();

  for (const item of items) {
    const group = (item.muscleGroup ?? "").trim();
    if (!group) continue;
    const bucket = bucketFor(item.date);
    if (bucket === null) continue;
    const arr = perGroup.get(group) ?? new Array(weeks).fill(0);
    arr[bucket] += item.sets ?? 0;
    perGroup.set(group, arr);
  }

  const weekLabels: string[] = [];
  for (let b = weeks - 1; b >= 0; b--) {
    const start = new Date(today);
    start.setDate(start.getDate() - (b * 7 + 6));
    weekLabels.push(
      `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}`
    );
  }

  const series: MuscleTrendSeries[] = [...perGroup.entries()]
    .map(([muscleGroup, bucketsNewestFirst]) => ({
      muscleGroup,
      points: [...bucketsNewestFirst].reverse(), // mais antigo primeiro, casa com weekLabels
    }))
    .sort(
      (a, b) => b.points.reduce((s, v) => s + v, 0) - a.points.reduce((s, v) => s + v, 0)
    );

  return { weekLabels, series };
}
