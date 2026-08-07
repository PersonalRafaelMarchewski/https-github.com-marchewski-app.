// Estimativa de duração de um treino (bloco): soma o tempo de
// execução de cada série (fixo, ~45s) com o tempo de descanso entre
// elas, mais o tempo de troca de aparelho/exercício (~2min) sempre que
// passa de um exercício pro próximo. Usado tanto na criação quanto na
// edição do treino, pra o personal saber quanto tempo aquele bloco
// (ex: Treino A) leva na prática.
//
// Recebe os exercícios já agrupados por método (groupExercisesByMethod)
// porque exercícios "vinculados" (bi-set, tri-set, super-set, circuito)
// são feitos em sequência sem descanso entre si — o descanso (e a troca
// de aparelho) só acontece depois de fechar a rodada inteira do grupo,
// não entre os itens vinculados dentro dele.

import type { MethodGroup } from "@/lib/workoutMethods";
import { isCardioGroup } from "@/lib/cardio";

export const EXECUTION_SECONDS_PER_SET = 45;
// tempo de deslocar até o próximo aparelho, ajustar banco/carga etc. —
// somado uma vez a cada troca de exercício (não entre séries do mesmo
// exercício, e não dentro de um bi-set/tri-set/super-set/circuito)
export const TRANSITION_SECONDS_BETWEEN_EXERCISES = 120;

type TimedExercise = {
  sets: number | string | null;
  rest_seconds: number | string | null;
  reps?: string | null;
  muscleGroup?: string | null;
};

// cardio não usa o tempo fixo de 45s/série — o campo "reps" carrega a
// duração real (ex: "20 min", "20"). Extrai o número e assume minutos.
function cardioSetSeconds(reps: string | null | undefined): number {
  if (!reps) return EXECUTION_SECONDS_PER_SET;
  const match = reps.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return EXECUTION_SECONDS_PER_SET;
  const minutes = Number(match[1].replace(",", "."));
  return minutes > 0 ? minutes * 60 : EXECUTION_SECONDS_PER_SET;
}

export function estimateBlockSeconds(groups: MethodGroup<TimedExercise>[]): number {
  // ignora grupos sem nenhuma série configurada — não entram na conta
  // nem geram troca de aparelho fantasma
  const meaningfulGroups = groups.filter(
    (group) => Math.max(0, ...group.items.map((item) => Number(item.sets) || 0)) > 0
  );

  let total = 0;

  meaningfulGroups.forEach((group, index) => {
    const setsPerItem = group.items.map((item) => Number(item.sets) || 0);
    const roundSets = Math.max(0, ...setsPerItem);

    // uma rodada = um set de cada exercício do grupo (na prática, só
    // 1 exercício quando não há método de vínculo)
    const execPerRound = group.items.reduce(
      (sum, item) =>
        sum +
        (isCardioGroup(item.muscleGroup)
          ? cardioSetSeconds(item.reps)
          : EXECUTION_SECONDS_PER_SET),
      0
    );

    // descanso entre rodadas do mesmo grupo — usa o valor definido no
    // último exercício do grupo. Não conta o descanso depois da
    // última rodada aqui: isso é tratado abaixo, junto da troca de
    // exercício (ou omitido de vez, se for o último grupo do treino).
    const rest = Number(group.items[group.items.length - 1]?.rest_seconds) || 0;
    total += roundSets * execPerRound + Math.max(0, roundSets - 1) * rest;

    const isLastGroup = index === meaningfulGroups.length - 1;
    if (!isLastGroup) {
      total += rest + TRANSITION_SECONDS_BETWEEN_EXERCISES;
    }
  });

  return Math.max(0, total);
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0 min";
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
