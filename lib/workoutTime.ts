// Estimativa de duração de um treino (bloco): soma o tempo de
// execução de cada série (fixo, ~45s) com o tempo de descanso entre
// elas. Usado tanto na criação quanto na edição do treino, pra o
// personal saber quanto tempo aquele bloco (ex: Treino A) leva na
// prática.
//
// Recebe os exercícios já agrupados por método (groupExercisesByMethod)
// porque exercícios "vinculados" (bi-set, tri-set, super-set, circuito)
// são feitos em sequência sem descanso entre si — o descanso só
// acontece depois de fechar a rodada inteira do grupo.

import type { MethodGroup } from "@/lib/workoutMethods";

export const EXECUTION_SECONDS_PER_SET = 45;

type TimedExercise = {
  sets: number | string | null;
  rest_seconds: number | string | null;
};

export function estimateBlockSeconds(groups: MethodGroup<TimedExercise>[]): number {
  let total = 0;
  let lastRest = 0;

  for (const group of groups) {
    const setsPerItem = group.items.map((item) => Number(item.sets) || 0);
    const roundSets = Math.max(0, ...setsPerItem);
    if (roundSets === 0) continue;

    // uma rodada = um set de cada exercício do grupo (na prática, só
    // 1 exercício quando não há método de vínculo)
    const execPerRound = group.items.length * EXECUTION_SECONDS_PER_SET;

    // descanso acontece uma vez por rodada, ao final dela — usa o
    // valor definido no último exercício do grupo
    const rest = Number(group.items[group.items.length - 1]?.rest_seconds) || 0;

    total += roundSets * execPerRound + roundSets * rest;
    lastRest = rest;
  }

  // não conta o descanso depois da última série do treino inteiro
  return Math.max(0, total - lastRest);
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0 min";
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
