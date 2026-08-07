// Sistema de conquistas do aluno, inspirado no Duolingo: marcos que vão
// sendo desbloqueados com o tempo (sequência, treinos concluídos, kg
// movidos) + selos de sessão (bateu o tempo esperado, bateu recorde de
// carga). Tudo calculado em cima de dado que já existe — sem tabela nova.

export type Tier = { threshold: number; emoji: string; label: string };

export const STREAK_TIERS: Tier[] = [
  { threshold: 3, emoji: "🔥", label: "3 dias seguidos" },
  { threshold: 7, emoji: "🔥", label: "7 dias seguidos" },
  { threshold: 14, emoji: "🔥", label: "14 dias seguidos" },
  { threshold: 30, emoji: "💎", label: "30 dias seguidos" },
  { threshold: 60, emoji: "👑", label: "60 dias seguidos" },
  { threshold: 100, emoji: "🏆", label: "100 dias seguidos" },
];

export const WORKOUT_COUNT_TIERS: Tier[] = [
  { threshold: 1, emoji: "🥉", label: "1º treino concluído" },
  { threshold: 10, emoji: "🥈", label: "10 treinos concluídos" },
  { threshold: 25, emoji: "🥇", label: "25 treinos concluídos" },
  { threshold: 50, emoji: "🏅", label: "50 treinos concluídos" },
  { threshold: 100, emoji: "🎖️", label: "100 treinos concluídos" },
];

export const VOLUME_TIERS: Tier[] = [
  { threshold: 1000, emoji: "🏋️", label: "1.000 kg movidos" },
  { threshold: 5000, emoji: "🏋️", label: "5.000 kg movidos" },
  { threshold: 10000, emoji: "🏋️", label: "10.000 kg movidos" },
  { threshold: 25000, emoji: "🏋️", label: "25.000 kg movidos" },
  { threshold: 50000, emoji: "🏋️", label: "50.000 kg movidos" },
];

export function currentTier(tiers: Tier[], value: number): Tier | null {
  let current: Tier | null = null;
  for (const t of tiers) {
    if (value >= t.threshold) current = t;
  }
  return current;
}

export function nextTier(tiers: Tier[], value: number): Tier | null {
  return tiers.find((t) => value < t.threshold) ?? null;
}

export function allTiersWithState(
  tiers: Tier[],
  value: number
): (Tier & { achieved: boolean })[] {
  return tiers.map((t) => ({ ...t, achieved: value >= t.threshold }));
}

// Selo de sessão: terminou dentro do tempo esperado do treino (com uma
// margem de 25% — ninguém troca de exercício instantaneamente na vida real).
export function finishedOnTime(actualMinutes: number, estimatedMinutes: number): boolean {
  if (estimatedMinutes <= 0) return false;
  return actualMinutes <= estimatedMinutes * 1.25;
}

// Selo de sessão: recorde de carga — recebe, por exercício, a carga de hoje
// e a maior carga já registrada ANTES de hoje; retorna os que bateram recorde.
export function detectPRs(
  todayLoads: { exerciseName: string; load: number }[],
  previousBestByExercise: Map<string, number>
): string[] {
  const prs: string[] = [];
  for (const { exerciseName, load } of todayLoads) {
    const previousBest = previousBestByExercise.get(exerciseName) ?? 0;
    if (load > previousBest) prs.push(exerciseName);
  }
  return prs;
}
