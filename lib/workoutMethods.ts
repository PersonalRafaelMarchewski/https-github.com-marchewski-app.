// Métodos de treino (bi-set, drop-set, etc.) e a lógica de agrupar
// exercícios consecutivos que usam o mesmo método de vínculo — pra
// exibir como um bloco único em vez de exercícios soltos.

// Métodos que "vinculam" 2+ exercícios feitos em sequência, sem
// descanso entre eles.
export const LINKING_METHODS = ["Bi-set", "Tri-set", "Super-set", "Circuito"] as const;

// Métodos que se aplicam a um único exercício (não agrupam com o vizinho).
export const SOLO_METHODS = ["Drop-set", "Rest-pause", "Pirâmide", "Isometria"] as const;

export const METHOD_OPTIONS = [...LINKING_METHODS, ...SOLO_METHODS];

export function isLinkingMethod(method: string | null | undefined): boolean {
  return Boolean(method) && (LINKING_METHODS as readonly string[]).includes(method as string);
}

export type MethodGroup<T> = {
  method: string | null;
  items: T[];
};

/**
 * Agrupa uma lista ORDENADA de exercícios: exercícios consecutivos que
 * compartilham o mesmo método de vínculo (bi-set, tri-set, super-set,
 * circuito) viram um grupo só. Exercícios sem método, ou com método
 * solo (drop-set etc.), sempre formam um grupo de 1 item.
 */
export function groupExercisesByMethod<T extends { method: string | null }>(
  exercises: T[]
): MethodGroup<T>[] {
  const groups: MethodGroup<T>[] = [];

  for (const ex of exercises) {
    const linking = isLinkingMethod(ex.method);
    const last = groups[groups.length - 1];

    if (linking && last && last.method === ex.method) {
      last.items.push(ex);
    } else {
      groups.push({ method: ex.method, items: [ex] });
    }
  }

  return groups;
}
